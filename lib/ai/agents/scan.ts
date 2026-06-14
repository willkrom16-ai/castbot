import { claude, MODELS, parseJsonOutput, AgentError } from "../claude"
import { SCAN_SYSTEM, SCAN_PROMPT_VERSION, buildScanUserPrompt } from "../prompts/scan-v1"
import { scanOutputSchema, type ScanOutput } from "../schemas/scan"

export async function runBatchScanAgent(
  actorContext: string,
  roleTexts: string[]
): Promise<ScanOutput> {
  const userMessage = buildScanUserPrompt(actorContext, roleTexts)

  const response = await claude.messages.create({
    model: MODELS.fast,
    max_tokens: 2048,
    system: [{ type: "text", text: SCAN_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "[]"

  let raw: unknown
  try {
    raw = parseJsonOutput(text)
  } catch {
    throw new AgentError("scan", "Response was not valid JSON", text)
  }

  try {
    return scanOutputSchema.parse(raw)
  } catch {
    // Be lenient — filter to valid items rather than hard-failing
    if (Array.isArray(raw)) {
      return raw
        .filter((item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null &&
          typeof item.index === "number" &&
          typeof item.eligible === "boolean"
        )
        .map((item) => ({
          index: item.index as number,
          title: String(item.title ?? "Unknown role"),
          project: String(item.project ?? "Unknown project"),
          eligible: item.eligible as boolean,
          reason: item.reason ? String(item.reason) : null,
        }))
    }
    throw new AgentError("scan", "Could not parse scan results", text)
  }
}
