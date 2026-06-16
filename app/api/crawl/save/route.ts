import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

const CRAWLER_SECRET = process.env.CRAWLER_SECRET

// Pure DB save — AI evaluation already done in Railway (no timeout needed)
export async function POST(req: NextRequest) {
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
    source?: string
    evaluation?: {
      project_title: string | null
      project_type: string | null
      role_name: string | null
      role_description: string | null
      union_requirement: string | null
      shoot_location: string | null
      audition_deadline: string | null
      audition_dates: string | null
      callback_dates: string | null
      project_dates: string | null
      rate_disclosed: boolean
      casting_director: string | null
      production_company: string | null
      submission_url: string | null
      recommended_action: string
      fit_score: number
      confidence_score: number
      reasoning_summary: string
      draft_cover_note: string | null
      flags: string[]
      is_legitimate: boolean
    }
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.actor_id || !body.raw_text || !body.site || !body.evaluation) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const ev = body.evaluation

  // Insert opportunity row
  const { data: opp, error: oppError } = await supabase
    .from("opportunities")
    .insert({
      actor_id: body.actor_id,
      source: body.source ?? `crawler:${body.site}`,
      raw_text: body.raw_text,
      processing_status: "analyzed",
      source_subject: body.listing_title ?? null,
    })
    .select()
    .single()

  if (oppError || !opp) {
    return NextResponse.json({ error: oppError?.message ?? "Failed to save opportunity" }, { status: 500 })
  }

  const opportunityId = (opp as { id: string }).id

  // Insert parsed details
  await supabase.from("opportunity_details").insert({
    opportunity_id: opportunityId,
    project_title: ev.project_title,
    project_type: ev.project_type,
    role_name: ev.role_name,
    role_description: ev.role_description,
    union_requirement: ev.union_requirement,
    shoot_location: ev.shoot_location,
    audition_deadline: ev.audition_deadline ?? null,
    audition_dates: ev.audition_dates ?? null,
    callback_dates: ev.callback_dates ?? null,
    project_dates: ev.project_dates ?? null,
    rate_disclosed: ev.rate_disclosed ? 1 : 0,
    casting_director: ev.casting_director,
    production_company: ev.production_company,
    submission_url: body.listing_url ?? ev.submission_url ?? null,
  })

  // Insert recommendation
  await supabase.from("recommendations").insert({
    opportunity_id: opportunityId,
    actor_id: body.actor_id,
    recommended_action: ev.recommended_action,
    fit_score: ev.fit_score,
    confidence_score: ev.confidence_score,
    reasoning_summary: ev.reasoning_summary,
    reasoning_detail: { summary: ev.reasoning_summary, flags: ev.flags },
    draft_cover_note: ev.draft_cover_note,
    flags: ev.flags,
    validator_passed: ev.is_legitimate,
    model_version: "railway-evaluator-v1",
  })

  return NextResponse.json({ opportunityId })
}
