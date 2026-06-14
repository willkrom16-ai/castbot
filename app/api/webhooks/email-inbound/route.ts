import { createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { ingestOpportunityAsService } from "@/lib/actions/ingest"
import { saveSkippedOpportunity } from "@/lib/actions/save-skipped"

export const maxDuration = 60
import { splitRoles } from "@/lib/email/role-splitter"
import { runBatchScanAgent } from "@/lib/ai/agents/scan"
import type { Database } from "@/types/database"

type ActorProfileRow = Database["public"]["Tables"]["actor_profiles"]["Row"]

const DAILY_CAP = 50

function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY ?? ""
  if (!key) return false
  const hash = createHmac("sha256", key).update(timestamp + token).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
  } catch {
    return false
  }
}

function extractToken(toAddress: string): string | null {
  const match = toAddress.match(/inbox\+([a-f0-9-]{36})@/i)
  return match ? match[1] : null
}

function cleanRoleText(text: string): string {
  return text
    .replace(/https?:\/\/\S{80,}/g, "")
    .replace(/https?:\/\/go\.\S+/g, "")
    .replace(/\[image:[^\]]*\]/g, "")
    .replace(/---------- Forwarded message ---------[\s\S]*?\n\n/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function rawToText(plain: string, html: string): string {
  if (plain?.trim()) return plain.trim()
  if (html?.trim()) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, "\n")
      .trim()
  }
  return ""
}

function buildActorContext(profile: ActorProfileRow): string {
  const lines: string[] = []
  if (profile.gender_identity) lines.push(`Gender: ${profile.gender_identity}`)
  if (profile.age_range_low != null || profile.age_range_high != null) {
    lines.push(`Age range: ${profile.age_range_low ?? "?"}-${profile.age_range_high ?? "?"}`)
  }
  const unions = profile.union_status as string[] | null
  if (unions?.length) lines.push(`Union: ${unions.join(", ")}`)
  if (profile.location_primary) lines.push(`Location: ${profile.location_primary}`)
  if (profile.willing_to_relocate) lines.push(`Willing to relocate: yes`)
  return lines.join("\n")
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  // Verify Mailgun webhook signature (only when fields are present)
  const timestamp = formData.get("timestamp") as string ?? ""
  const token = formData.get("token") as string ?? ""
  const signature = formData.get("signature") as string ?? ""
  if (timestamp && token && signature) {
    if (!verifyMailgunSignature(timestamp, token, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  const recipient = formData.get("recipient") as string ?? ""
  const sender = formData.get("sender") as string ?? ""
  const subject = formData.get("subject") as string ?? ""
  const textBody = formData.get("body-plain") as string ?? ""
  const htmlBody = formData.get("body-html") as string ?? ""

  const inboundToken = extractToken(recipient)
  if (!inboundToken) {
    return NextResponse.json({ error: "No routing token in recipient address" }, { status: 400 })
  }

  const rawText = rawToText(textBody, htmlBody)
  if (!rawText) {
    return NextResponse.json({ error: "Empty email body" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: profileData } = await supabase
    .from("actor_profiles")
    .select("actor_id, gender_identity, age_range_low, age_range_high, union_status, location_primary, willing_to_relocate")
    .eq("inbound_token", inboundToken)
    .single()

  const profile = profileData as Pick<
    ActorProfileRow,
    "actor_id" | "gender_identity" | "age_range_low" | "age_range_high" | "union_status" | "location_primary" | "willing_to_relocate"
  > | null

  if (!profile) {
    return NextResponse.json({ error: "Unknown inbound token" }, { status: 404 })
  }

  // Respond to Mailgun immediately, process async
  ;(async () => {
    // Check daily cap before doing any work
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("actor_id", profile.actor_id)
      .gte("ingested_at", todayStart.toISOString())
    if ((count ?? 0) >= DAILY_CAP) return

    // 1. Split into individual role blocks (no filtering — all roles preserved)
    const roleBlocks = await splitRoles(rawText)

    // 2. Batch scan — 1 cheap Haiku call decides eligibility for all roles
    const actorContext = buildActorContext(profile as ActorProfileRow)
    const roleTexts = roleBlocks.map((b) => b.text)
    const scanResults = await runBatchScanAgent(actorContext, roleTexts)

    // 3. Route each role based on scan result, respecting remaining daily cap
    let remaining = DAILY_CAP - (count ?? 0)
    for (const scan of scanResults) {
      if (remaining <= 0) break
      const block = roleBlocks[scan.index - 1]
      if (!block) continue

      const cleanedText = cleanRoleText(block.text)
      if (!cleanedText) continue

      remaining--

      const common = {
        actorId: profile.actor_id,
        rawText: cleanedText,
        source: "email" as const,
        sourceEmail: sender,
        sourceSubject: subject,
        submissionUrl: block.submission_url ?? undefined,
      }

      if (scan.eligible) {
        // Full pipeline → surfaces in queue if it's a match
        ingestOpportunityAsService(common).catch(console.error)
      } else {
        // Lightweight save — visible in Review table, no pipeline cost
        saveSkippedOpportunity({
          actorId: profile.actor_id,
          rawText: cleanedText,
          source: "email",
          sourceEmail: sender,
          sourceSubject: subject,
          scanTitle: scan.title,
          scanProject: scan.project,
          scanSkipReason: scan.reason ?? "Did not match profile",
        }).catch(console.error)
      }
    }
  })().catch(console.error)

  return NextResponse.json({ received: true })
}
