-- Change union_status from single text to text array (actors can hold multiple unions)
ALTER TABLE actor_profiles
  ALTER COLUMN union_status TYPE text[]
  USING CASE WHEN union_status IS NULL THEN NULL ELSE ARRAY[union_status] END;

-- Physical attributes
ALTER TABLE actor_profiles
  ADD COLUMN IF NOT EXISTS pronouns text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS weight_lbs integer,
  ADD COLUMN IF NOT EXISTS hair_color text,
  ADD COLUMN IF NOT EXISTS eye_color text,
  ADD COLUMN IF NOT EXISTS hair_length text,
  ADD COLUMN IF NOT EXISTS body_type text,
  ADD COLUMN IF NOT EXISTS distinctive_features text;

-- Location & availability
ALTER TABLE actor_profiles
  ADD COLUMN IF NOT EXISTS willing_to_relocate boolean,
  ADD COLUMN IF NOT EXISTS work_authorization text;

-- Skills & training
ALTER TABLE actor_profiles
  ADD COLUMN IF NOT EXISTS character_types text[],
  ADD COLUMN IF NOT EXISTS project_type_preferences text[],
  ADD COLUMN IF NOT EXISTS training text[],
  ADD COLUMN IF NOT EXISTS voice_type text,
  ADD COLUMN IF NOT EXISTS nudity_comfort text;

-- Materials & casting links
ALTER TABLE actor_profiles
  ADD COLUMN IF NOT EXISTS imdb_url text,
  ADD COLUMN IF NOT EXISTS actors_access_url text,
  ADD COLUMN IF NOT EXISTS backstage_url text,
  ADD COLUMN IF NOT EXISTS casting_networks_url text;

-- Commercial size card
ALTER TABLE actor_profiles
  ADD COLUMN IF NOT EXISTS shirt_size text,
  ADD COLUMN IF NOT EXISTS pants_size text,
  ADD COLUMN IF NOT EXISTS shoe_size text;
