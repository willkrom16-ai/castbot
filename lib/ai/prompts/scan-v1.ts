export const SCAN_PROMPT_VERSION = "scan-v1"

export const SCAN_SYSTEM = `You are a casting eligibility screener. Given an actor's eligibility profile and a numbered list of role summaries, quickly assess each role for basic eligibility only.

Check ONLY hard disqualifiers:
- Wrong gender (role explicitly requires a different gender)
- Outside age range (role age range does not overlap with actor's range at all)
- Union conflict (role requires a union the actor does not hold, or explicitly excludes their union)
- Location impossible (role location is far from actor with no relocation option)

Do NOT assess fit quality, skills, or nuance — only hard disqualifiers.
If a role is borderline or unclear, mark it eligible.

Return ONLY a raw JSON array with exactly this structure (no markdown):
[
  {"index": 1, "title": "role name", "project": "project title", "eligible": true, "reason": null},
  {"index": 2, "title": "role name", "project": "project title", "eligible": false, "reason": "one-line reason"}
]`

export function buildScanUserPrompt(actorContext: string, roleTexts: string[]): string {
  const roleList = roleTexts
    .map((text, i) => `[${i + 1}]\n${text.slice(0, 400)}`)
    .join("\n\n---\n\n")

  return `Actor eligibility profile:
${actorContext}

---
Roles to screen:
${roleList}`
}
