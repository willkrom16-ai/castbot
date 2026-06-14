// Layer 3 — Decision: recommend SUBMIT / SKIP / REVIEW / FLAG
// Uses Opus for higher reasoning quality on the decision layer
import { callClaude, parseJsonOutput, AgentError, MODELS } from "../claude"
import { STRATEGY_SYSTEM, STRATEGY_PROMPT_VERSION, buildStrategyUserPrompt } from "../prompts/strategy-v1"
import { strategyInputSchema, strategyOutputSchema, type StrategyInput, type StrategyOutput } from "../schemas/strategy"

export async function runStrategyAgent(input: StrategyInput) {
  const validated = strategyInputSchema.parse(input)

  return callClaude<StrategyOutput>({
    agent: "strategy",
    promptVersion: STRATEGY_PROMPT_VERSION,
    system: STRATEGY_SYSTEM,
    userMessage: buildStrategyUserPrompt(validated),
    model: MODELS.reasoning,
    parseOutput: (text) => {
      let raw: unknown
      try {
        raw = parseJsonOutput(text)
      } catch {
        throw new AgentError("strategy", "Response was not valid JSON", text)
      }
      const result = strategyOutputSchema.parse(raw)

      // HITL guardrail: low-confidence recommendations must never surface as SUBMIT
      if (result.confidence_score < 0.6 && result.recommended_action === "SUBMIT") {
        result.recommended_action = "REVIEW"
        result.reasoning_summary =
          `[Confidence too low to recommend submission — review manually] ` + result.reasoning_summary
      }

      return result
    },
  })
}
