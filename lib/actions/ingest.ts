import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { runPipeline } from "@/lib/ai/pipeline"
import { AgentError } from "@/lib/ai/claude"
import { notifyNewOpportunity } from "@/lib/email/notify"
import { buildActorProfile } from "@/lib/actions/build-actor-profile"
import type { Database } from "@/types/database"
import type { SupabaseClient } from "@supabase/supabase-js"

type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"]
type OpportunityDetailsInsert = Database["public"]["Tables"]["opportunity_details"]["Insert"]
type RecommendationInsert = Database["public"]["Tables"]["recommendations"]["Insert"]
type ActorProfileRow = Database["public"]["Tables"]["actor_profiles"]["Row"]

export type IngestOptions = {
  actorId: string
  rawText: string
  source: string
  sourceEmail?: string
  sourceSubject?: string
  submissionUrl?: string
}

export type IngestResult =
  | { success: true; opportunityId: string }
  | { error: string; opportunityId?: string }

async function runIngest(
  supabase: SupabaseClient<Database>,
  opts: IngestOptions
): Promise<IngestResult> {
  const { data: profileData } = await supabase
    .from("actor_profiles")
    .select("*")
    .eq("actor_id", opts.actorId)
    .single()

  const profile = profileData as ActorProfileRow | null
  if (!profile) return { error: "No profile found for this actor." }

  const { data: headshotData } = await supabase
    .from("actor_headshots")
    .select("label")
    .eq("actor_id", opts.actorId)
  const headshotLabels = (headshotData ?? []).map((h) => h.label)

  const oppInsert: OpportunityInsert = {
    actor_id: opts.actorId,
    source: opts.source,
    raw_text: opts.rawText,
    processing_status: "processing",
    source_email: opts.sourceEmail ?? null,
    source_subject: opts.sourceSubject ?? null,
  }

  const { data: opp, error: oppError } = await (
    supabase.from("opportunities") as ReturnType<typeof supabase.from>
  ).insert(oppInsert).select().single()

  if (oppError || !opp) return { error: oppError?.message ?? "Failed to save opportunity" }

  const opportunityId = (opp as { id: string }).id

  try {
    const pipelineResult = await runPipeline({
      raw_text: opts.rawText,
      source: opts.source,
      actor_profile: buildActorProfile(profile),
      headshot_labels: headshotLabels.length > 0 ? headshotLabels : undefined,
    })

    if (pipelineResult.parsed) {
      // Prefer URL extracted from email (survives before text cleaning), fall back to parser
      const submissionUrl = opts.submissionUrl ?? pipelineResult.parsed.submission_url ?? null

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
      actor_id: opts.actorId,
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
      model_version: `pipeline-v1|logs:${pipelineResult.logs.length}`,
    }
    await (supabase.from("recommendations") as ReturnType<typeof supabase.from>).insert(recInsert)

    await (supabase.from("opportunities") as ReturnType<typeof supabase.from>)
      .update({ processing_status: "analyzed" })
      .eq("id", opportunityId)

    if (opts.source === "email") {
      const { data: actorData } = await supabase
        .from("actors")
        .select("email")
        .eq("id", opts.actorId)
        .single()

      if (actorData) {
        notifyNewOpportunity({
          toEmail: (actorData as { email: string }).email,
          roleName: pipelineResult.parsed?.role_name ?? null,
          projectTitle: pipelineResult.parsed?.project_title ?? null,
          fitScore: pipelineResult.match?.fit_score ?? null,
          recommendedAction: pipelineResult.strategy.recommended_action,
          opportunityId,
        }).catch(console.error)
      }
    }

    return { success: true, opportunityId }
  } catch (err) {
    await (supabase.from("opportunities") as ReturnType<typeof supabase.from>)
      .update({ processing_status: "failed" })
      .eq("id", opportunityId)

    let message = "Pipeline failed — please try again."
    if (err instanceof AgentError) {
      message = `AI agent failed (${err.agent}): ${err.cause_message}`
    } else if (err instanceof Error && err.message.includes("credit balance")) {
      message = "Anthropic API credits are exhausted. Add credits at console.anthropic.com to continue."
    } else if (err instanceof Error && err.message) {
      message = `Pipeline error: ${err.message}`
    }

    return { error: message, opportunityId }
  }
}

// For server actions — uses the session-aware SSR client
export async function ingestOpportunity(opts: IngestOptions): Promise<IngestResult> {
  const supabase = await createClient()
  return runIngest(supabase, opts)
}

// For webhooks — uses the service client (bypasses RLS, no session needed)
export function ingestOpportunityAsService(opts: IngestOptions): Promise<IngestResult> {
  const supabase = createServiceClient()
  return runIngest(supabase, opts)
}
