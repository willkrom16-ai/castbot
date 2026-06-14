import Anthropic from "@anthropic-ai/sdk"
import { createHash } from "crypto"
import { z } from "zod"

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODELS = {
  default: "claude-sonnet-4-6",
  reasoning: "claude-opus-4-7",
  fast: "claude-haiku-4-5-20251001",
} as const

export type AiCallLog = {
  agent: string
  prompt_version: string
  model: string
  input_hash: string
  output_hash: string
  latency_ms: number
  input_tokens: number
  output_tokens: number
  retry: boolean
}

export class AgentError extends Error {
  constructor(
    public agent: string,
    public cause_message: string,
    public raw_output?: string
  ) {
    super(`[${agent}] ${cause_message}`)
    this.name = "AgentError"
  }
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16)
}

export function parseJsonOutput<T>(text: string): T {
  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
  const objectMatch = text.match(/(\{[\s\S]*\})/)
  const raw = fenceMatch ? fenceMatch[1] : objectMatch ? objectMatch[1] : text
  return JSON.parse(raw.trim()) as T
}

async function singleClaudeCall(opts: {
  model: string
  system: string
  userMessage: string
  retryHint?: string
}): Promise<{ text: string; input_tokens: number; output_tokens: number; latency_ms: number }> {
  const start = Date.now()

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: opts.userMessage },
  ]

  // On retry, append the error hint so Claude can self-correct
  if (opts.retryHint) {
    messages.push({ role: "assistant", content: opts.retryHint })
    messages.push({
      role: "user",
      content: "Your previous response could not be parsed. Return valid JSON only, no commentary.",
    })
  }

  const response = await claude.messages.create({
    model: opts.model,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: opts.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return {
    text,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    latency_ms: Date.now() - start,
  }
}

export async function callClaude<T>(opts: {
  agent: string
  promptVersion: string
  system: string
  userMessage: string
  model?: string
  parseOutput: (text: string) => T
}): Promise<{ result: T; log: AiCallLog }> {
  const model = opts.model ?? MODELS.default
  let retry = false
  let lastRawOutput = ""

  // Attempt 1
  const attempt1 = await singleClaudeCall({
    model,
    system: opts.system,
    userMessage: opts.userMessage,
  })
  lastRawOutput = attempt1.text

  let result: T
  try {
    result = opts.parseOutput(attempt1.text)
  } catch (firstError) {
    // Attempt 2 — pass the bad output back so Claude can correct it
    retry = true
    const attempt2 = await singleClaudeCall({
      model,
      system: opts.system,
      userMessage: opts.userMessage,
      retryHint: attempt1.text,
    })
    lastRawOutput = attempt2.text

    try {
      result = opts.parseOutput(attempt2.text)
    } catch {
      throw new AgentError(
        opts.agent,
        `Output failed Zod validation after retry. First error: ${firstError instanceof z.ZodError ? firstError.message : String(firstError)}`,
        lastRawOutput
      )
    }
  }

  const log: AiCallLog = {
    agent: opts.agent,
    prompt_version: opts.promptVersion,
    model,
    input_hash: hashContent(opts.userMessage),
    output_hash: hashContent(lastRawOutput),
    latency_ms: attempt1.latency_ms,
    input_tokens: attempt1.input_tokens,
    output_tokens: attempt1.output_tokens,
    retry,
  }

  return { result, log }
}
