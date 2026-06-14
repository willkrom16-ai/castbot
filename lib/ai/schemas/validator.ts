import { z } from "zod"

export const validatorInputSchema = z.object({
  parsed_opportunity: z.record(z.string(), z.unknown()),
  strategy_output: z.record(z.string(), z.unknown()),
  draft_output: z.record(z.string(), z.unknown()),
  actor_profile_summary: z.string(),
})

export const validatorOutputSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({
    severity: z.enum(["blocking", "warning"]),
    field: z.string(),
    message: z.string(),
  })),
  hallucination_flags: z.array(z.string()),
  corrected_cover_note: z.string().nullable(),
  validator_notes: z.string(),
})

export type ValidatorInput = z.infer<typeof validatorInputSchema>
export type ValidatorOutput = z.infer<typeof validatorOutputSchema>
