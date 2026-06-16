/**
 * Railway-side AI evaluator.
 * Runs a single Claude call (no timeout constraints) to evaluate a casting listing
 * against the actor's profile. Produces all data needed to save to the DB.
 */
import { config } from './config.js'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export interface ActorProfile {
  stage_name: string | null
  legal_name: string | null
  union_status: string[] | null
  age_range_low: number | null
  age_range_high: number | null
  gender_identity: string | null
  ethnicity_self_id: string | null
  location_primary: string | null
  location_secondary: string | null
  travel_radius_miles: number | null
  character_types: string[] | null
  project_type_preferences: string[] | null
  skills: string[] | null
  languages: string[] | null
  accent_capabilities: string[] | null
  voice_type: string | null
  nudity_comfort: string | null
  rate_floor: number | null
  rep_status: string | null
}

export interface EvaluationResult {
  // Parsed listing
  project_title: string | null
  project_type: string | null
  role_name: string | null
  role_description: string | null
  union_requirement: string | null
  shoot_location: string | null
  audition_deadline: string | null
  rate_disclosed: boolean
  casting_director: string | null
  production_company: string | null
  submission_url: string | null

  // Match & recommendation
  recommended_action: 'SUBMIT' | 'CONSIDER' | 'SKIP' | 'FLAG'
  fit_score: number
  confidence_score: number
  reasoning_summary: string
  draft_cover_note: string | null
  flags: string[]
  is_legitimate: boolean
}

export async function evaluateListing(
  rawText: string,
  actorProfile: ActorProfile,
  source: string
): Promise<EvaluationResult> {
  const isTrustedSource = ['actors_access', 'backstage', 'casting_networks', 'imdb_pro']
    .some(s => source.includes(s))

  const prompt = `You are a casting analyst AI. Given a casting listing and an actor's profile, do the following in one pass:

1. Parse the listing: extract project title, type (film/tv/commercial/theatre/other), role name, role description, union requirement, shoot location, audition deadline, whether pay rate is disclosed, casting director, production company, and submission URL if present.

2. Check compliance: is this a legitimate casting opportunity? Flag POTENTIAL_SCAM if it asks for payment, personal financial info, or seems fraudulent.${isTrustedSource ? ` NOTE: This listing is from a trusted casting platform (${source}) — do NOT flag as scam unless there are extremely obvious red flags.` : ''}

3. Evaluate fit against the actor profile. Give a fit_score 0-100 where:
   - 80-100: Strong match, actor clearly qualified
   - 60-79: Good match, worth submitting
   - 40-59: Marginal, missing some requirements
   - 0-39: Poor fit or disqualifying factors

4. Determine recommended_action:
   - SUBMIT: fit_score >= 70 and legitimate and no hard disqualifiers
   - CONSIDER: fit_score 50-69, legitimate, worth reviewing
   - SKIP: fit_score < 50, or actor clearly doesn't meet requirements
   - FLAG: compliance issues, scam signals, or very unusual listing

5. If recommended_action is SUBMIT or CONSIDER, write a brief, personalized cover note (2-3 sentences) that the actor can use as a starting point. Reference the specific role and show genuine interest. Do NOT write it if action is SKIP or FLAG.

UNION RULE: Non-union actors can submit to non-union film, TV, and commercial roles. Non-union actors CANNOT submit to union theatre (Equity/AEA) productions. SAG-AFTRA actors cannot submit to non-union principal roles.

ACTOR PROFILE:
${JSON.stringify(actorProfile, null, 2)}

LISTING TEXT:
${rawText.slice(0, 4000)}

Respond with ONLY a valid JSON object matching this schema (no markdown, no explanation):
{
  "project_title": string | null,
  "project_type": string | null,
  "role_name": string | null,
  "role_description": string | null,
  "union_requirement": string | null,
  "shoot_location": string | null,
  "audition_deadline": string | null,
  "rate_disclosed": boolean,
  "casting_director": string | null,
  "production_company": string | null,
  "submission_url": string | null,
  "recommended_action": "SUBMIT" | "CONSIDER" | "SKIP" | "FLAG",
  "fit_score": number,
  "confidence_score": number,
  "reasoning_summary": string,
  "draft_cover_note": string | null,
  "flags": string[],
  "is_legitimate": boolean
}`

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': config.anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>
  }

  const text = data.content.find(b => b.type === 'text')?.text ?? ''

  // Strip markdown code fences if Claude wraps response despite instructions
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    return JSON.parse(clean) as EvaluationResult
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${clean.slice(0, 200)}`)
  }
}
