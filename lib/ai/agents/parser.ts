// Layer 2 — Processing: extract structured data from raw breakdown text
import { callClaude, parseJsonOutput, AgentError } from "../claude"
import { PARSER_SYSTEM, PARSER_PROMPT_VERSION, buildParserUserPrompt } from "../prompts/parser-v1"
import { parserInputSchema, parserOutputSchema, type ParserInput, type ParserOutput } from "../schemas/parser"

export async function runParserAgent(input: ParserInput) {
  const validated = parserInputSchema.parse(input)

  return callClaude<ParserOutput>({
    agent: "parser",
    promptVersion: PARSER_PROMPT_VERSION,
    system: PARSER_SYSTEM,
    userMessage: buildParserUserPrompt(validated.raw_text),
    parseOutput: (text) => {
      let raw: unknown
      try {
        raw = parseJsonOutput(text)
      } catch {
        throw new AgentError("parser", "Response was not valid JSON", text)
      }
      return parserOutputSchema.parse(raw)
    },
  })
}
