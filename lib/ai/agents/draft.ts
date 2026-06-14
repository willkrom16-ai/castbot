// Layer 3 — Decision: generate cover note and submission materials
// Only runs when recommended_action != SKIP
import { callClaude, parseJsonOutput, AgentError } from "../claude"
import { DRAFT_SYSTEM, DRAFT_PROMPT_VERSION, buildDraftUserPrompt } from "../prompts/draft-v1"
import { draftInputSchema, draftOutputSchema, type DraftInput, type DraftOutput } from "../schemas/draft"

export async function runDraftAgent(input: DraftInput) {
  const validated = draftInputSchema.parse(input)

  // Guardrail: never draft materials for a SKIP recommendation
  if (validated.recommended_action === "SKIP") {
    throw new AgentError("draft", "Draft agent called with SKIP recommendation — this is a pipeline bug")
  }

  return callClaude<DraftOutput>({
    agent: "draft",
    promptVersion: DRAFT_PROMPT_VERSION,
    system: DRAFT_SYSTEM,
    userMessage: buildDraftUserPrompt(validated),
    parseOutput: (text) => {
      let raw: unknown
      try {
        raw = parseJsonOutput(text)
      } catch {
        throw new AgentError("draft", "Response was not valid JSON", text)
      }
      const result = draftOutputSchema.parse(raw)

      // Guardrail: cover note must not be empty for a non-SKIP recommendation
      if (!result.cover_note || result.cover_note.trim().length < 50) {
        throw new AgentError("draft", "Cover note too short or missing — likely a truncated response", text)
      }

      return result
    },
  })
}
