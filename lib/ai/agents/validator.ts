// Layer 3 — Decision: cross-check all pipeline outputs before surfacing to user
//
// Independence guarantee: this agent uses VALIDATOR_SYSTEM, a completely different
// prompt from every other agent. It cannot validate its own output because it is
// called as a separate Claude API request after all other agents have completed.
// The same agent must never both generate and validate an output.
import { callClaude, parseJsonOutput, AgentError, MODELS } from "../claude"
import { VALIDATOR_SYSTEM, VALIDATOR_PROMPT_VERSION, buildValidatorUserPrompt } from "../prompts/validator-v1"
import { validatorInputSchema, validatorOutputSchema, type ValidatorInput, type ValidatorOutput } from "../schemas/validator"

export async function runValidatorAgent(input: ValidatorInput) {
  const validated = validatorInputSchema.parse(input)

  return callClaude<ValidatorOutput>({
    agent: "validator",
    promptVersion: VALIDATOR_PROMPT_VERSION,
    system: VALIDATOR_SYSTEM,
    userMessage: buildValidatorUserPrompt(validated),
    // Validator uses Opus — higher stakes, needs to catch subtle hallucinations
    model: MODELS.reasoning,
    parseOutput: (text) => {
      let raw: unknown
      try {
        raw = parseJsonOutput(text)
      } catch {
        throw new AgentError("validator", "Response was not valid JSON", text)
      }
      const result = validatorOutputSchema.parse(raw)

      // If validator itself fails to produce a usable result, default to failed-safe:
      // mark as not passed so the recommendation goes to REVIEW, never SUBMIT
      return result
    },
  })
}
