-- Create the ad-media storage bucket (public, 50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ad-media', 'ad-media', true, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif',
        'video/mp4','video/quicktime','video/webm','application/octet-stream']);

-- Allow public read access to all objects in the bucket
CREATE POLICY "Public read access for ad-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'ad-media');

-- Allow service role to insert objects
CREATE POLICY "Service role can insert ad-media"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'ad-media');

-- Allow service role to update objects (needed for upsert)
CREATE POLICY "Service role can update ad-media"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id = 'ad-media');
