import { NextRequest, NextResponse } from "next/server"
import { ingestOpportunityAsService } from "@/lib/actions/ingest"

// AI pipeline runs 6 sequential Claude agents — needs up to 60s
// Requires Vercel Pro plan (Hobby plan caps at 10s)
export const maxDuration = 60

const CRAWLER_SECRET = process.env.CRAWLER_SECRET

export async function POST(req: NextRequest) {
  // Authenticate crawler service
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null
  if (!CRAWLER_SECRET || token !== CRAWLER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    actor_id?: string
    raw_text?: string
    listing_url?: string
    site?: string
    listing_title?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.actor_id || !body.raw_text || !body.site) {
    return NextResponse.json({ error: "actor_id, raw_text, and site are required" }, { status: 400 })
  }

  try {
    const result = await ingestOpportunityAsService({
      actorId: body.actor_id,
      rawText: body.raw_text,
      source: `crawler:${body.site}`,
      sourceSubject: body.listing_title ?? `${body.site} listing`,
      submissionUrl: body.listing_url,
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
