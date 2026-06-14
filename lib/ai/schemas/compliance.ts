import { z } from "zod"

export const complianceInputSchema = z.object({
  raw_text: z.string(),
  parsed_opportunity: z.record(z.string(), z.unknown()),
  actor_conflict_brands: z.array(z.string()),
  actor_union_status: z.string().nullable(),
})

export const complianceOutputSchema = z.object({
  flags: z.array(z.enum([
    "POTENTIAL_SCAM",
    "LOW_QUALITY_PROJECT",
    "UNION_CONFLICT",
    "COMMERCIAL_CONFLICT",
    "NSFW_CONTENT",
    "RATE_RED_FLAG",
    "MISSING_CRITICAL_INFO",
  ])),
  flag_details: z.array(z.object({
    flag: z.string(),
    reason: z.string(),
    severity: z.enum(["block", "warn"]),
  })),
  safe_to_process: z.boolean(),
})

export type ComplianceInput = z.infer<typeof complianceInputSchema>
export type ComplianceOutput = z.infer<typeof complianceOutputSchema>
