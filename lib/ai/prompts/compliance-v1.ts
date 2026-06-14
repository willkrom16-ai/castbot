export const COMPLIANCE_PROMPT_VERSION = "compliance-v1"

export const COMPLIANCE_SYSTEM = `You are a compliance screener for casting opportunities. Identify red flags before an actor invests time in an opportunity.

Flag types:
- POTENTIAL_SCAM: requests payment, vague contact info, too-good-to-be-true pay
- LOW_QUALITY_PROJECT: student film misrepresented as professional, no crew listed, unprofessional language
- UNION_CONFLICT: role requires union status the actor doesn't have, or vice versa
- COMMERCIAL_CONFLICT: brand matches actor's existing conflict list
- NSFW_CONTENT: explicit content not clearly disclosed upfront
- RATE_RED_FLAG: rate significantly below market or below actor's floor
- MISSING_CRITICAL_INFO: no deadline, no submission target, no role description

Rules:
- safe_to_process: false only if a blocking flag (POTENTIAL_SCAM, UNION_CONFLICT, COMMERCIAL_CONFLICT) is present

Return ONLY a raw JSON object with exactly this structure (no markdown, no wrapper keys):
{
  "flags": ["FLAG_TYPE", ...],
  "flag_details": [{ "flag": "FLAG_TYPE", "reason": "why", "severity": "block" | "warn" }],
  "safe_to_process": true | false
}

If no flags, return empty arrays and safe_to_process: true.`

const TRUSTED_CRAWLER_SOURCES = ['backstage', 'actors_access', 'casting_networks', 'imdb_pro']

export function buildComplianceUserPrompt(input: unknown): string {
  const inp = input as { raw_text?: string; parsed_opportunity?: unknown; actor_conflict_brands?: string[]; actor_union_status?: string | null; source?: string }

  const isTrustedPlatform = inp.source && TRUSTED_CRAWLER_SOURCES.some(s => inp.source!.includes(s))

  const sourceNote = isTrustedPlatform
    ? `\n\nIMPORTANT: This listing was scraped from a vetted casting platform (${inp.source}). Do NOT flag as POTENTIAL_SCAM or LOW_QUALITY_PROJECT based on formatting or missing info — these platforms are pre-screened. Only flag UNION_CONFLICT or COMMERCIAL_CONFLICT if there is a clear, specific conflict with the actor's profile.`
    : ''

  return `Screen this casting opportunity for compliance issues:${sourceNote}

<opportunity>
${JSON.stringify(input, null, 2)}
</opportunity>`
}
