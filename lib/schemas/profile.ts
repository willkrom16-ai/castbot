import { z } from "zod"

export const UNION_OPTIONS = ["sag-aftra", "aea", "aftra", "non-union", "fi-core", "eligible"] as const
export const PROJECT_TYPE_OPTIONS = ["film", "tv", "commercial", "theater", "voiceover", "student", "web-series", "motion-capture"] as const
export const NUDITY_OPTIONS = ["none", "implied-only", "partial", "full"] as const

export const profileSchema = z.object({
  // Step 1 — Identity
  legal_name: z.string().min(1, "Legal name is required"),
  stage_name: z.string().optional(),
  pronouns: z.string().optional(),
  bio: z.string().max(500).optional(),
  union_status: z.array(z.enum(UNION_OPTIONS)).min(1, "Select at least one union status"),
  gender_identity: z.string().min(1, "Required"),
  age_range_low: z.number().int().min(1).max(99),
  age_range_high: z.number().int().min(1).max(99),

  // Step 2 — Physical
  height_cm: z.number().int().positive().optional(),
  weight_lbs: z.number().int().positive().optional(),
  hair_color: z.string().optional(),
  eye_color: z.string().optional(),
  hair_length: z.string().optional(),
  body_type: z.string().optional(),
  ethnicity_self_id: z.array(z.string()).optional(),
  distinctive_features: z.string().optional(),

  // Step 3 — Location & Availability
  location_primary: z.string().min(1, "Primary market is required"),
  location_secondary: z.array(z.string()).optional(),
  travel_radius_miles: z.number().int().min(0).optional(),
  willing_to_relocate: z.boolean().optional(),
  work_authorization: z.string().optional(),

  // Step 4 — Skills & Training
  character_types: z.array(z.string()).optional(),
  project_type_preferences: z.array(z.enum(PROJECT_TYPE_OPTIONS)).optional(),
  skills: z.array(z.string()).min(1, "Add at least one skill"),
  languages: z.array(z.string()).min(1, "Add at least one language"),
  accent_capabilities: z.array(z.string()),
  voice_type: z.string().optional(),
  training: z.array(z.string()).optional(),
  nudity_comfort: z.enum(NUDITY_OPTIONS).optional(),

  // Step 5 — Rep & Materials
  rep_status: z.enum(["represented", "self-submit", "hybrid"]),
  rep_agency: z.string().optional(),
  rate_floor: z.number().min(0).optional(),
  conflict_brands: z.array(z.string()),
  reel_url: z.string().optional(),
  resume_url: z.string().optional(),
  imdb_url: z.string().optional(),
  actors_access_url: z.string().optional(),
  backstage_url: z.string().optional(),
  casting_networks_url: z.string().optional(),
  shirt_size: z.string().optional(),
  pants_size: z.string().optional(),
  shoe_size: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const STEP_FIELDS: (keyof ProfileFormValues)[][] = [
  ["legal_name", "stage_name", "pronouns", "bio", "union_status", "gender_identity", "age_range_low", "age_range_high"],
  ["height_cm", "weight_lbs", "hair_color", "eye_color", "hair_length", "body_type", "ethnicity_self_id", "distinctive_features"],
  ["location_primary", "location_secondary", "travel_radius_miles", "willing_to_relocate", "work_authorization"],
  ["character_types", "project_type_preferences", "skills", "languages", "accent_capabilities", "voice_type", "training", "nudity_comfort"],
  ["rep_status", "rep_agency", "rate_floor", "conflict_brands", "reel_url", "resume_url", "imdb_url", "actors_access_url", "backstage_url", "casting_networks_url", "shirt_size", "pants_size", "shoe_size"],
]
