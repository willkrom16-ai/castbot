"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { profileSchema } from "@/lib/schemas/profile"
import type { Database } from "@/types/database"

type ActorProfileInsert = Database["public"]["Tables"]["actor_profiles"]["Insert"]

export async function saveProfile(formData: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = profileSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: "Invalid profile data", issues: parsed.error.flatten() }
  }

  const d = parsed.data

  const payload: ActorProfileInsert = {
    actor_id: user.id,
    // Identity
    legal_name: d.legal_name,
    stage_name: d.stage_name ?? null,
    pronouns: d.pronouns ?? null,
    bio: d.bio ?? null,
    union_status: d.union_status,
    gender_identity: d.gender_identity,
    age_range_low: d.age_range_low,
    age_range_high: d.age_range_high,
    // Physical
    height_cm: d.height_cm ?? null,
    weight_lbs: d.weight_lbs ?? null,
    hair_color: d.hair_color ?? null,
    eye_color: d.eye_color ?? null,
    hair_length: d.hair_length ?? null,
    body_type: d.body_type ?? null,
    ethnicity_self_id: d.ethnicity_self_id ?? null,
    distinctive_features: d.distinctive_features ?? null,
    // Location
    location_primary: d.location_primary,
    location_secondary: d.location_secondary ?? null,
    travel_radius_miles: d.travel_radius_miles ?? null,
    willing_to_relocate: d.willing_to_relocate ?? null,
    work_authorization: d.work_authorization ?? null,
    // Skills & Training
    character_types: d.character_types ?? null,
    project_type_preferences: d.project_type_preferences ?? null,
    skills: d.skills,
    languages: d.languages,
    accent_capabilities: d.accent_capabilities,
    voice_type: d.voice_type ?? null,
    training: d.training ?? null,
    nudity_comfort: d.nudity_comfort ?? null,
    // Rep & Materials
    rep_status: d.rep_status,
    rep_agency: d.rep_agency ?? null,
    rate_floor: d.rate_floor ?? null,
    conflict_brands: d.conflict_brands,
    reel_url: d.reel_url ?? null,
    resume_url: d.resume_url ?? null,
    imdb_url: d.imdb_url ?? null,
    actors_access_url: d.actors_access_url ?? null,
    backstage_url: d.backstage_url ?? null,
    casting_networks_url: d.casting_networks_url ?? null,
    shirt_size: d.shirt_size ?? null,
    pants_size: d.pants_size ?? null,
    shoe_size: d.shoe_size ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("actor_profiles").upsert(payload)
  if (error) return { error: error.message }

  redirect("/dashboard")
}
