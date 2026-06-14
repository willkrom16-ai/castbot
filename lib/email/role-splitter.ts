import { claude, MODELS } from "@/lib/ai/claude"

export type RoleBlock = {
  text: string
  submission_url: string | null
}

const SPLITTER_SYSTEM = `You are a casting email parser. Given a digest email from Backstage or Casting Networks containing multiple role listings, split it into individual casting notices — one per role/character.

For each role return:
- role_text: the complete role details (name, description, requirements, rate, location, deadline). Do NOT include the URL in the text.
- submission_url: the URL found near this role's "View", "Submit", or "Apply" link. Include the full URL exactly as written. null if none found.

Return ONLY a raw JSON array (no markdown):
[{"role_text": "...", "submission_url": "..." or null}, ...]

Maximum 25 roles.`

export async function splitRoles(rawEmailText: string): Promise<RoleBlock[]> {
  const deadlineCount = (rawEmailText.match(/deadline/gi) ?? []).length
  if (deadlineCount < 3) {
    return [{ text: rawEmailText, submission_url: extractPlatformUrl(rawEmailText) }]
  }

  const userMessage = `Email digest:\n${rawEmailText.slice(0, 24000)}`

  try {
    const response = await claude.messages.create({
      model: MODELS.default,
      max_tokens: 4096,
      system: SPLITTER_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "[]"
    const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
    const arrayMatch = text.match(/(\[[\s\S]*\])/)
    const raw = fenceMatch ? fenceMatch[1] : arrayMatch ? arrayMatch[1] : "[]"

    const roles = JSON.parse(raw.trim()) as unknown
    if (Array.isArray(roles) && roles.length > 0) {
      return (roles as Array<{ role_text: string; submission_url: string | null }>)
        .slice(0, 25)
        .map((r) => ({
          text: r.role_text ?? "",
          submission_url: r.submission_url ?? null,
        }))
    }
  } catch {
    // fall through
  }

  return [{ text: rawEmailText, submission_url: extractPlatformUrl(rawEmailText) }]
}

function extractPlatformUrl(text: string): string | null {
  const patterns = [
    /https?:\/\/(?:www\.)?backstage\.com\/\S+/i,
    /https?:\/\/go\.backstage\.com\/\S+/i,
    /https?:\/\/app\.castingnetworks\.com\/\S+/i,
    /https?:\/\/(?:www\.)?castingnetworks\.com\/\S+/i,
    /https?:\/\/(?:www\.)?actorsaccess\.com\/\S+/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[0].replace(/[)\]>,"']+$/, "")
  }
  return null
}
