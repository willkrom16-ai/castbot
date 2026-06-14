-- Add unique inbound token to each actor profile for email routing
ALTER TABLE actor_profiles
  ADD COLUMN IF NOT EXISTS inbound_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS actor_profiles_inbound_token_idx
  ON actor_profiles (inbound_token);

-- Add email metadata columns to opportunities
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS source_email text,
  ADD COLUMN IF NOT EXISTS source_subject text;
