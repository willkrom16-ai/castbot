import { createClient } from "@/lib/supabase/server"
import { ProfileFlow } from "@/components/profile/profile-flow"
import { ExtensionTokenCard } from "@/components/profile/extension-token-card"
import { HeadshotManager } from "@/components/profile/headshot-manager"
import type { ProfileFormValues } from "@/lib/schemas/profile"
import type { Database } from "@/types/database"

type ActorProfileRow = Database["public"]["Tables"]["actor_profiles"]["Row"]

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("actor_profiles")
    .select("*")
    .eq("actor_id", user!.id)
    .single()

  const profile = data as ActorProfileRow | null

  const existingValues: Partial<ProfileFormValues> | undefined = profile
    ? {
        legal_name: profile.legal_name ?? "",
        stage_name: profile.stage_name ?? "",
        pronouns: profile.pronouns ?? "",
        bio: profile.bio ?? "",
        union_status: (profile.union_status as ProfileFormValues["union_status"]) ?? [],
        gender_identity: profile.gender_identity ?? "",
        age_range_low: profile.age_range_low ?? 18,
        age_range_high: profile.age_range_high ?? 35,
        height_cm: profile.height_cm ?? undefined,
        weight_lbs: profile.weight_lbs ?? undefined,
        hair_color: profile.hair_color ?? "",
        eye_color: profile.eye_color ?? "",
        hair_length: profile.hair_length ?? "",
        body_type: profile.body_type ?? "",
        ethnicity_self_id: profile.ethnicity_self_id ?? [],
        distinctive_features: profile.distinctive_features ?? "",
        location_primary: profile.location_primary ?? "",
        location_secondary: profile.location_secondary ?? [],
        travel_radius_miles: profile.travel_radius_miles ?? undefined,
        willing_to_relocate: profile.willing_to_relocate ?? undefined,
        work_authorization: profile.work_authorization ?? "",
        character_types: profile.character_types ?? [],
        project_type_preferences: (profile.project_type_preferences as ProfileFormValues["project_type_preferences"]) ?? [],
        skills: profile.skills ?? [],
        languages: profile.languages ?? ["English"],
        accent_capabilities: profile.accent_capabilities ?? [],
        voice_type: profile.voice_type ?? "",
        training: profile.training ?? [],
        nudity_comfort: (profile.nudity_comfort as ProfileFormValues["nudity_comfort"]) ?? undefined,
        rep_status: (profile.rep_status as ProfileFormValues["rep_status"]) ?? "self-submit",
        rep_agency: profile.rep_agency ?? "",
        rate_floor: profile.rate_floor ?? undefined,
        conflict_brands: profile.conflict_brands ?? [],
        reel_url: profile.reel_url ?? "",
        resume_url: profile.resume_url ?? "",
        imdb_url: profile.imdb_url ?? "",
        actors_access_url: profile.actors_access_url ?? "",
        backstage_url: profile.backstage_url ?? "",
        casting_networks_url: profile.casting_networks_url ?? "",
        shirt_size: profile.shirt_size ?? "",
        pants_size: profile.pants_size ?? "",
        shoe_size: profile.shoe_size ?? "",
      }
    : undefined

  const { data: headshotData } = await supabase
    .from("actor_headshots")
    .select("id, public_url, label, storage_path")
    .eq("actor_id", user!.id)
    .order("created_at", { ascending: true })

  const headshots = headshotData ?? []

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {profile ? "Edit profile" : "Build your profile"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your profile is the foundation of every AI recommendation.
        </p>
      </div>
      <ProfileFlow existingValues={existingValues} isEditing={!!profile} />
      <HeadshotManager headshots={headshots} />
      {profile?.inbound_token && (
        <ExtensionTokenCard token={profile.inbound_token} />
      )}
    </div>
  )
}
