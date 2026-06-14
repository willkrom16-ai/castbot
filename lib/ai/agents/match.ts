// Layer 2 — Processing: score role fit against actor profile
import { callClaude, parseJsonOutput, AgentError } from "../claude"
import { MATCH_SYSTEM, MATCH_PROMPT_VERSION, buildMatchUserPrompt } from "../prompts/match-v1"
import { matchInputSchema, matchOutputSchema, type MatchInput, type MatchOutput } from "../schemas/match"

export async function runMatchAgent(input: MatchInput, headshotLabels?: string[]) {
  const validated = matchInputSchema.parse(input)

  return callClaude<MatchOutput>({
    agent: "match",
    promptVersion: MATCH_PROMPT_VERSION,
    system: MATCH_SYSTEM,
    userMessage: buildMatchUserPrompt(validated.parsed_opportunity, validated.actor_profile, headshotLabels),
    parseOutput: (text) => {
      let raw: unknown
      try {
        raw = parseJsonOutput(text)
      } catch {
        throw new AgentError("match", "Response was not valid JSON", text)
      }
      return matchOutputSchema.parse(raw)
    },
  })
}
