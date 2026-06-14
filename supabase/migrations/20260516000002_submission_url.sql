-- Add submission URL to opportunity_details for one-tap platform submit
ALTER TABLE opportunity_details
  ADD COLUMN IF NOT EXISTS submission_url text;
