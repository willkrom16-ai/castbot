import { z } from "zod"

export const scanItemSchema = z.object({
  index: z.number(),
  title: z.string(),
  project: z.string(),
  eligible: z.boolean(),
  reason: z.string().nullable(),
})

export const scanOutputSchema = z.array(scanItemSchema)

export type ScanItem = z.infer<typeof scanItemSchema>
export type ScanOutput = z.infer<typeof scanOutputSchema>
