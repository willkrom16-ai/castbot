// Layer 2 — Processing: flag scams, conflicts, and red flags before pipeline runs
// Runs first — a blocking flag short-circuits the entire pipeline
import { callClaude, parseJsonOutput, AgentError } from "../claude"
import { COMPLIANCE_SYSTEM, COMPLIANCE_PROMPT_VERSION, buildComplianceUserPrompt } from "../prompts/compliance-v1"
import { complianceInputSchema, complianceOutputSchema, type ComplianceInput, type ComplianceOutput } from "../schemas/compliance"

export async function runComplianceAgent(input: ComplianceInput) {
  const validated = complianceInputSchema.parse(input)

  return callClaude<ComplianceOutput>({
    agent: "compliance",
    promptVersion: COMPLIANCE_PROMPT_VERSION,
    system: COMPLIANCE_SYSTEM,
    userMessage: buildComplianceUserPrompt(validated),
    parseOutput: (text) => {
      let raw: unknown
      try {
        raw = parseJsonOutput(text)
      } catch {
        throw new AgentError("compliance", "Response was not valid JSON", text)
      }
      const result = complianceOutputSchema.parse(raw)

      // Fail-safe: if compliance agent errors out, block processing rather than skip screening
      return result
    },
  })
}
