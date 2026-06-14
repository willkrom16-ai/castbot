import { z } from "zod"
import { parserOutputSchema } from "./parser"

export const matchInputSchema = z.object({
  parsed_opportunity: parserOutputSchema,
  actor_profile: z.object({
    union_status: z.array(z.string()).nullable(),
    age_range_low: z.number().nullable(),
    age_range_high: z.number().nullable(),
    gender_identity: z.string().nullable(),
    height_cm: z.number().nullable().optional(),
    weight_lbs: z.number().nullable().optional(),
    hair_color: z.string().nullable().optional(),
    eye_color: z.string().nullable().optional(),
    body_type: z.string().nullable().optional(),
    ethnicity_self_id: z.array(z.string()).nullable().optional(),
    location_primary: z.string().nullable(),
    location_secondary: z.array(z.string()).nullable().optional(),
    travel_radius_miles: z.number().nullable(),
    willing_to_relocate: z.boolean().nullable().optional(),
    work_authorization: z.string().nullable().optional(),
    character_types: z.array(z.string()).nullable().optional(),
    project_type_preferences: z.array(z.string()).nullable().optional(),
    skills: z.array(z.string()).nullable(),
    languages: z.array(z.string()).nullable(),
    accent_capabilities: z.array(z.string()).nullable(),
    voice_type: z.string().nullable().optional(),
    training: z.array(z.string()).nullable().optional(),
    nudity_comfort: z.string().nullable().optional(),
    conflict_brands: z.array(z.string()).nullable(),
    rate_floor: z.number().nullable(),
    rep_status: z.string().nullable(),
  }),
})

export const matchOutputSchema = z.object({
  fit_score: z.number().min(0).max(100),
  confidence_score: z.number().min(0).max(1),
  match_factors: z.object({
    union_match: z.boolean().nullable(),
    location_match: z.boolean().nullable(),
    rate_viable: z.boolean().nullable(),
    conflict_clear: z.boolean().nullable(),
    skills_overlap: z.array(z.string()),
  }),
  disqualifiers: z.array(z.string()),
  reasoning: z.string(),
  headshot_recommendation: z.string().nullable().optional(),
})

export type MatchInput = z.infer<typeof matchInputSchema>
export type MatchOutput = z.infer<typeof matchOutputSchema>
