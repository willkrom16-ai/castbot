-- Headshots table — stores upload metadata and actor-assigned labels
CREATE TABLE IF NOT EXISTS actor_headshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  label text NOT NULL DEFAULT 'General',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE actor_headshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actor_headshots: own rows"
  ON actor_headshots FOR ALL
  USING (auth.uid() = actor_id);

-- Storage bucket for headshots (insert only if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'headshots',
  'headshots',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: actors can upload/read/delete their own headshots
CREATE POLICY "headshots: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "headshots: read own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "headshots: delete own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'headshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read for the bucket (headshots are served publicly by URL)
CREATE POLICY "headshots: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'headshots');
