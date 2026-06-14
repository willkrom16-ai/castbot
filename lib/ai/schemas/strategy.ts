import { z } from "zod"

export const strategyInputSchema = z.object({
  fit_score: z.number(),
  confidence_score: z.number(),
  match_factors: z.object({
    union_match: z.boolean().nullable(),
    location_match: z.boolean().nullable(),
    rate_viable: z.boolean().nullable(),
    conflict_clear: z.boolean().nullable(),
    skills_overlap: z.array(z.string()),
  }),
  disqualifiers: z.array(z.string()),
  flags: z.array(z.string()),
  audition_deadline: z.string().nullable(),
})

export const strategyOutputSchema = z.object({
  recommended_action: z.enum(["SUBMIT", "SKIP", "REVIEW", "FLAG"]),
  confidence_score: z.number().min(0).max(1),
  reasoning_summary: z.string().max(500),
  reasoning_detail: z.object({
    primary_reason: z.string(),
    supporting_factors: z.array(z.string()),
    risk_factors: z.array(z.string()),
  }),
  priority_rank_signal: z.number().min(1).max(10),
})

export type StrategyInput = z.infer<typeof strategyInputSchema>
export type StrategyOutput = z.infer<typeof strategyOutputSchema>
