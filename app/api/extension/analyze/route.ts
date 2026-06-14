import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { runQuickPipeline } from "@/lib/ai/pipeline"
import { buildActorProfile } from "@/lib/actions/build-actor-profile"

export const maxDuration = 60
import type { Database } from "@/types/database"
import type { Json } from "@/types/database"

type ActorProfileRow = Database["public"]["Tables"]["actor_profiles"]["Row"]

const CORS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401, headers: CORS })
  }

  let body: { raw_text?: string; source_url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS })
  }

  const rawText = body.raw_text?.trim()
  if (!rawText) {
    return NextResponse.json({ error: "raw_text is required" }, { status: 400, headers: CORS })
  }

  const supabase = createServiceClient()

  const { data: profileData } = await supabase
    .from("actor_profiles")
    .select("*")
    .eq("inbound_token", token)
    .single()

  const profile = profileData as ActorProfileRow | null
  if (!profile) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: CORS })
  }

  const { data: headshotData } = await supabase
    .from("actor_headshots")
    .select("label")
    .eq("actor_id", profile.actor_id)
  const headshotLabels = (headshotData ?? []).map((h) => h.label)

  try {
    const result = await runQuickPipeline({
      raw_text: rawText,
      source: "extension",
      headshot_labels: headshotLabels,
      actor_profile: buildActorProfile(profile),
    })

    // Save to DB asynchronously — don't block the response
    const sourceSubject = body.source_url
      ? `Extension: ${new URL(body.source_url).hostname}`
      : "Extension"

    supabase.from("opportunities").insert({
      actor_id: profile.actor_id,
      source: "extension",
      raw_text: rawText,
      processing_status: "analyzed",
      source_subject: sourceSubject,
      scan_title: result.role_name,
      scan_project: result.project_title,
    }).select("id").single().then(({ data: opp }) => {
      const opportunityId = (opp as { id: string } | null)?.id
      if (!opportunityId) return
      supabase.from("recommendations").insert({
        opportunity_id: opportunityId,
        actor_id: profile.actor_id,
        recommended_action: result.should_submit ? "SUBMIT" : "SKIP",
        fit_score: result.fit_score,
        reasoning_summary: result.reason,
        draft_cover_note: result.cover_note,
        draft_self_tape_notes: result.self_tape_notes,
        flags: [],
        validator_passed: true,
        model_version: "quick-pipeline-v1|extension",
      }).then()
    })

    return NextResponse.json({
      role_name: result.role_name,
      project_title: result.project_title,
      fit_score: result.fit_score,
      should_submit: result.should_submit,
      reason: result.reason,
      cover_note: result.cover_note,
      self_tape_notes: result.self_tape_notes,
      headshot_recommendation: result.headshot_recommendation,
    }, { headers: CORS })

  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed"
    return NextResponse.json({ error: message }, { status: 500, headers: CORS })
  }
}
