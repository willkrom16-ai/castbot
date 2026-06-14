// Layer 2-3: AI Processing + Decision pipeline
// Order: Compliance → Parser → Match → Strategy → Draft → Validator
// No agent writes to decisions or submissions tables — that is human-only territory.

import { runComplianceAgent } from "./agents/compliance"
import { runParserAgent } from "./agents/parser"
import { runMatchAgent } from "./agents/match"
import { runStrategyAgent } from "./agents/strategy"
import { runDraftAgent } from "./agents/draft"
import { runValidatorAgent } from "./agents/validator"
import type { AiCallLog } from "./claude"
import type { ParserOutput } from "./schemas/parser"
import type { MatchOutput } from "./schemas/match"
import type { StrategyOutput } from "./schemas/strategy"
import type { DraftOutput } from "./schemas/draft"
import type { ValidatorOutput } from "./schemas/validator"
import type { ComplianceOutput } from "./schemas/compliance"

export type ActorProfileForPipeline = {
  stage_name: string | null
  legal_name: string | null
  pronouns: string | null
  union_status: string[] | null
  age_range_low: number | null
  age_range_high: number | null
  gender_identity: string | null
  height_cm: number | null
  weight_lbs: number | null
  hair_color: string | null
  eye_color: string | null
  body_type: string | null
  ethnicity_self_id: string[] | null
  location_primary: string | null
  location_secondary: string[] | null
  travel_radius_miles: number | null
  willing_to_relocate: boolean | null
  work_authorization: string | null
  character_types: string[] | null
  project_type_preferences: string[] | null
  skills: string[] | null
  languages: string[] | null
  accent_capabilities: string[] | null
  voice_type: string | null
  training: string[] | null
  nudity_comfort: string | null
  conflict_brands: string[] | null
  rate_floor: number | null
  rep_status: string | null
  rep_agency: string | null
  imdb_url: string | null
  actors_access_url: string | null
  backstage_url: string | null
  casting_networks_url: string | null
}

export type PipelineInput = {
  raw_text: string
  source: string
  actor_profile: ActorProfileForPipeline
  headshot_labels?: string[]
}

export type PipelineResult = {
  compliance: ComplianceOutput
  parsed: ParserOutput
  match: MatchOutput
  strategy: StrategyOutput
  draft: DraftOutput
  validation: ValidatorOutput
  logs: AiCallLog[]
  failed_at: string | null
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const logs: AiCallLog[] = []

  // Stage 1: Compliance screen — block scams and hard conflicts before any further processing
  const { result: compliance, log: complianceLog } = await runComplianceAgent({
    raw_text: input.raw_text,
    parsed_opportunity: {},
    actor_conflict_brands: input.actor_profile.conflict_brands ?? [],
    actor_union_status: input.actor_profile.union_status?.join(", ") ?? null,
    source: input.source,
  })
  logs.push(complianceLog)

  if (!compliance.safe_to_process) {
    return {
      compliance,
      parsed: null as never,
      match: null as never,
      strategy: {
        recommended_action: "FLAG",
        confidence_score: 1,
        reasoning_summary: `Blocked by compliance: ${compliance.flag_details.map((f) => f.reason).join("; ")}`,
        reasoning_detail: { primary_reason: "Compliance block", supporting_factors: [], risk_factors: compliance.flags },
        priority_rank_signal: 10,
      },
      draft: null as never,
      validation: null as never,
      logs,
      failed_at: "compliance",
    }
  }

  // Stage 2: Parse
  const { result: parsed, log: parseLog } = await runParserAgent({
    raw_text: input.raw_text,
    source: input.source,
  })
  logs.push(parseLog)

  // Stage 3: Match
  const { result: match, log: matchLog } = await runMatchAgent({
    parsed_opportunity: parsed,
    actor_profile: input.actor_profile,
  })
  logs.push(matchLog)

  // Stage 4: Strategy
  const { result: strategy, log: strategyLog } = await runStrategyAgent({
    fit_score: match.fit_score,
    confidence_score: match.confidence_score,
    match_factors: match.match_factors,
    disqualifiers: match.disqualifiers,
    flags: compliance.flags,
    audition_deadline: parsed.audition_deadline,
  })
  logs.push(strategyLog)

  // Stage 5: Draft (only if not SKIPping)
  let draft: DraftOutput
  if (strategy.recommended_action === "SKIP") {
    draft = {
      cover_note: "",
      cover_note_tone: "formal",
      self_tape_notes: null,
      suggested_tags: [],
      submission_checklist: [],
    }
  } else {
    const { result: draftResult, log: draftLog } = await runDraftAgent({
      role_name: parsed.role_name,
      role_description: parsed.role_description,
      project_title: parsed.project_title,
      project_type: parsed.project_type,
      casting_director: parsed.casting_director,
      actor_profile: {
        stage_name: input.actor_profile.stage_name,
        legal_name: input.actor_profile.legal_name,
        skills: input.actor_profile.skills,
        union_status: input.actor_profile.union_status,
        rep_status: input.actor_profile.rep_status,
        rep_agency: input.actor_profile.rep_agency,
      },
      skills_overlap: match.match_factors.skills_overlap,
      recommended_action: strategy.recommended_action,
    })
    logs.push(draftLog)
    draft = draftResult
  }

  // Stage 6: Validate — separate Claude call, different prompt, cannot self-validate
  let validation: import("./schemas/validator").ValidatorOutput
  try {
    const { result: validationResult, log: validationLog } = await runValidatorAgent({
      parsed_opportunity: parsed as unknown as Record<string, unknown>,
      strategy_output: strategy as unknown as Record<string, unknown>,
      draft_output: draft as unknown as Record<string, unknown>,
      actor_profile_summary: [
        `Name: ${input.actor_profile.stage_name ?? input.actor_profile.legal_name}`,
        `Union: ${input.actor_profile.union_status?.join(", ") ?? "not specified"}`,
        `Location: ${input.actor_profile.location_primary ?? "not specified"}`,
        input.actor_profile.rep_status === "represented" && input.actor_profile.rep_agency
          ? `Represented by: ${input.actor_profile.rep_agency}`
          : `Rep status: ${input.actor_profile.rep_status ?? "self-submit"}`,
        input.actor_profile.skills?.length
          ? `Skills: ${input.actor_profile.skills.join(", ")}`
          : null,
        input.actor_profile.languages?.length
          ? `Languages: ${input.actor_profile.languages.join(", ")}`
          : null,
        input.actor_profile.accent_capabilities?.length
          ? `Accents: ${input.actor_profile.accent_capabilities.join(", ")}`
          : null,
        input.actor_profile.training?.length
          ? `Training: ${input.actor_profile.training.join(", ")}`
          : null,
        input.actor_profile.character_types?.length
          ? `Character types: ${input.actor_profile.character_types.join(", ")}`
          : null,
        input.actor_profile.nudity_comfort
          ? `Nudity comfort: ${input.actor_profile.nudity_comfort}`
          : null,
        input.actor_profile.hair_color ? `Hair: ${input.actor_profile.hair_color}` : null,
        input.actor_profile.eye_color ? `Eyes: ${input.actor_profile.eye_color}` : null,
        input.actor_profile.ethnicity_self_id?.length
          ? `Ethnicity: ${input.actor_profile.ethnicity_self_id.join(", ")}`
          : null,
      ].filter(Boolean).join(" | "),
    })
    logs.push(validationLog)
    validation = validationResult
  } catch {
    // Validator failure → fail-safe: mark as not passed, surface for human review
    validation = {
      passed: false,
      issues: [{ severity: "blocking", field: "validator", message: "Validator agent failed — manual review required" }],
      hallucination_flags: [],
      corrected_cover_note: null,
      validator_notes: "Validator could not complete. Recommendation requires manual review before use.",
    }
  }

  // Final HITL guardrail: if validator did not pass, downgrade SUBMIT → REVIEW
  if (!validation.passed && strategy.recommended_action === "SUBMIT") {
    strategy.recommended_action = "REVIEW"
    strategy.reasoning_summary = "[Validator did not pass — review before submitting] " + strategy.reasoning_summary
  }

  return { compliance, parsed, match, strategy, draft, validation, logs, failed_at: null }
}

export type QuickPipelineResult = {
  role_name: string | null
  project_title: string | null
  fit_score: number | null
  should_submit: boolean
  reason: string
  cover_note: string | null
  self_tape_notes: string | null
  headshot_recommendation: string | null
}

// Trimmed pipeline for the browser extension — Parser → Match → Draft only.
// No compliance, no strategy agent, no validator. Faster (~10s) and never blocked.
export async function runQuickPipeline(input: PipelineInput): Promise<QuickPipelineResult> {
  const { result: parsed } = await runParserAgent({
    raw_text: input.raw_text,
    source: input.source,
  })

  const { result: match } = await runMatchAgent({
    parsed_opportunity: parsed,
    actor_profile: input.actor_profile,
  }, input.headshot_labels)

  const should_submit = (match.fit_score ?? 0) >= 60

  let draftCoverNote: string | null = null
  let draftSelfTapeNotes: string | null = null

  if (should_submit) {
    const { result: draft } = await runDraftAgent({
      role_name: parsed.role_name,
      role_description: parsed.role_description,
      project_title: parsed.project_title,
      project_type: parsed.project_type,
      casting_director: parsed.casting_director,
      actor_profile: {
        stage_name: input.actor_profile.stage_name,
        legal_name: input.actor_profile.legal_name,
        skills: input.actor_profile.skills,
        union_status: input.actor_profile.union_status,
        rep_status: input.actor_profile.rep_status,
        rep_agency: input.actor_profile.rep_agency,
      },
      skills_overlap: match.match_factors.skills_overlap,
      recommended_action: "SUBMIT",
    })
    draftCoverNote = draft.cover_note || null
    draftSelfTapeNotes = draft.self_tape_notes || null
  }

  const reason = match.reasoning || (should_submit ? `Good fit — score ${match.fit_score}/100` : `Low fit — score ${match.fit_score}/100`)

  return {
    role_name: parsed.role_name,
    project_title: parsed.project_title,
    fit_score: match.fit_score,
    should_submit,
    reason,
    cover_note: draftCoverNote,
    self_tape_notes: draftSelfTapeNotes,
    headshot_recommendation: match.headshot_recommendation ?? null,
  }
}
