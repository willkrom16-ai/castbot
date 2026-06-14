-- Lightweight scan results stored on every opportunity from a digest
-- scan_skip_reason = null means it passed to full pipeline
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS scan_title       text,
  ADD COLUMN IF NOT EXISTS scan_project     text,
  ADD COLUMN IF NOT EXISTS scan_skip_reason text;
