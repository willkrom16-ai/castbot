import type { Database } from "@/types/database"
import type { ActorProfileForPipeline } from "@/lib/ai/pipeline"

type ActorProfileRow = Database["public"]["Tables"]["actor_profiles"]["Row"]

export function buildActorProfile(profile: ActorProfileRow): ActorProfileForPipeline {
  return {
    stage_name: profile.stage_name,
    legal_name: profile.legal_name,
    pronouns: profile.pronouns,
    union_status: profile.union_status,
    age_range_low: profile.age_range_low,
    age_range_high: profile.age_range_high,
    gender_identity: profile.gender_identity,
    height_cm: profile.height_cm,
    weight_lbs: profile.weight_lbs,
    hair_color: profile.hair_color,
    eye_color: profile.eye_color,
    body_type: profile.body_type,
    ethnicity_self_id: profile.ethnicity_self_id,
    location_primary: profile.location_primary,
    location_secondary: profile.location_secondary,
    travel_radius_miles: profile.travel_radius_miles,
    willing_to_relocate: profile.willing_to_relocate,
    work_authorization: profile.work_authorization,
    character_types: profile.character_types,
    project_type_preferences: profile.project_type_preferences,
    skills: profile.skills,
    languages: profile.languages,
    accent_capabilities: profile.accent_capabilities,
    voice_type: profile.voice_type,
    training: profile.training,
    nudity_comfort: profile.nudity_comfort,
    conflict_brands: profile.conflict_brands,
    rate_floor: profile.rate_floor,
    rep_status: profile.rep_status,
    rep_agency: profile.rep_agency,
    imdb_url: profile.imdb_url,
    actors_access_url: profile.actors_access_url,
    backstage_url: profile.backstage_url,
    casting_networks_url: profile.casting_networks_url,
  }
}
