"use server"

import { createClient } from "@/lib/supabase/server"
import { runPipeline } from "@/lib/ai/pipeline"
import { AgentError } from "@/lib/ai/claude"
import { buildActorProfile } from "@/lib/actions/build-actor-profile"
import type { Database } from "@/types/database"
import { redirect } from "next/navigation"

type ActorProfileRow = Database["public"]["Tables"]["actor_profiles"]["Row"]
type OpportunityDetailsInsert = Database["public"]["Tables"]["opportunity_details"]["Insert"]
type RecommendationInsert = Database["public"]["Tables"]["recommendations"]["Insert"]

export async function analyzeSkippedOpportunity(
  opportunityId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: oppData } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", opportunityId)
    .eq("actor_id", user.id)
    .single()

  if (!oppData) return { error: "Opportunity not found" }

  const opp = oppData as Record<string, unknown>
  if (opp.processing_status !== "scanned_skip") {
    return { error: "Already analyzed" }
  }

  await supabase.from("opportunities")
    .update({ processing_status: "processing" })
    .eq("id", opportunityId)

  return runFullPipelineOnOpportunity(supabase, opportunityId, opp, user.id)
}

async function runFullPipelineOnOpportunity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opportunityId: string,
  opp: Record<string, unknown>,
  actorId: string
): Promise<{ success: true } | { error: string }> {
  const { data: profileData } = await supabase
    .from("actor_profiles")
    .select("*")
    .eq("actor_id", actorId)
    .single()

  const profile = profileData as ActorProfileRow | null
  if (!profile) return { error: "No profile found" }

  try {
    const pipelineResult = await runPipeline({
      raw_text: opp.raw_text as string,
      source: opp.source as string,
      actor_profile: buildActorProfile(profile),
    })

    if (pipelineResult.parsed) {
      const submissionUrl = (opp.submission_url as string | null) ?? pipelineResult.parsed.submission_url ?? null
      const detailsInsert: OpportunityDetailsInsert = {
        opportunity_id: opportunityId,
        project_title: pipelineResult.parsed.project_title,
        project_type: pipelineResult.parsed.project_type,
        role_name: pipelineResult.parsed.role_name,
        role_description: pipelineResult.parsed.role_description,
        union_requirement: pipelineResult.parsed.union_requirement,
        shoot_location: pipelineResult.parsed.shoot_location,
        audition_deadline: pipelineResult.parsed.audition_deadline,
        rate_disclosed: pipelineResult.parsed.rate_disclosed,
        casting_director: pipelineResult.parsed.casting_director,
        production_company: pipelineResult.parsed.production_company,
        submission_method: pipelineResult.parsed.submission_method,
        submission_target: pipelineResult.parsed.submission_target,
      }
      await supabase.from("opportunity_details")
        .insert({ ...detailsInsert, submission_url: submissionUrl })
    }

    const recInsert: RecommendationInsert = {
      opportunity_id: opportunityId,
      actor_id: actorId,
      recommended_action: pipelineResult.strategy.recommended_action,
      fit_score: pipelineResult.match?.fit_score ?? null,
      confidence_score: pipelineResult.strategy.confidence_score,
      reasoning_summary: pipelineResult.strategy.reasoning_summary,
      reasoning_detail: pipelineResult.strategy.reasoning_detail as unknown as import("@/types/database").Json,
      draft_cover_note: pipelineResult.validation?.corrected_cover_note ?? pipelineResult.draft?.cover_note ?? null,
      draft_tags: pipelineResult.draft?.suggested_tags ?? null,
      draft_self_tape_notes: pipelineResult.draft?.self_tape_notes ?? null,
      flags: [...(pipelineResult.compliance?.flags ?? []), ...(pipelineResult.validation?.hallucination_flags ?? [])],
      validator_passed: pipelineResult.validation?.passed ?? false,
      validator_notes: pipelineResult.validation?.validator_notes ?? null,
      model_version: `pipeline-v1|on-demand`,
    }
    await supabase.from("recommendations").insert(recInsert)

    await supabase.from("opportunities")
      .update({ processing_status: "analyzed" })
      .eq("id", opportunityId)

    return { success: true }
  } catch (err) {
    await supabase.from("opportunities")
      .update({ processing_status: "scanned_skip" })
      .eq("id", opportunityId)

    let message = "Analysis failed"
    if (err instanceof AgentError) message = `AI agent failed (${err.agent}): ${err.cause_message}`
    else if (err instanceof Error) message = err.message
    return { error: message }
  }
}
