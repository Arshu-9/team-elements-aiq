-- Create storage bucket for session files
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-files', 'session-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow session participants to upload files
CREATE POLICY "Session participants can upload files to storage"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'session-files' AND
  (storage.foldername(name))[1] IN (
    SELECT session_id::text FROM public.session_participants WHERE user_id = auth.uid()
  )
);

-- Allow session participants to view files
CREATE POLICY "Session participants can view files from storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'session-files' AND
  (storage.foldername(name))[1] IN (
    SELECT session_id::text FROM public.session_participants WHERE user_id = auth.uid()
  )
);

-- Allow session participants to download files
CREATE POLICY "Session participants can download files from storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'session-files' AND
  (storage.foldername(name))[1] IN (
    SELECT session_id::text FROM public.session_participants WHERE user_id = auth.uid()
  )
);