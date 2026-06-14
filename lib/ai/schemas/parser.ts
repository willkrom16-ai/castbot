import { z } from "zod"

export const parserInputSchema = z.object({
  raw_text: z.string().min(1),
  source: z.string(),
})

export const parserOutputSchema = z.object({
  project_title: z.string().nullable(),
  project_type: z.enum(["feature", "tv", "commercial", "short", "theater", "voiceover", "student", "unknown"]),
  role_name: z.string().nullable(),
  role_description: z.string().nullable(),
  union_requirement: z.string().nullable(),
  shoot_location: z.string().nullable(),
  audition_deadline: z.string().nullable(),
  rate_disclosed: z.number().nullable(),
  casting_director: z.string().nullable(),
  production_company: z.string().nullable(),
  submission_method: z.string().nullable(),
  submission_target: z.string().nullable(),
  submission_url: z.string().nullable(),
})

export type ParserInput = z.infer<typeof parserInputSchema>
export type ParserOutput = z.infer<typeof parserOutputSchema>
