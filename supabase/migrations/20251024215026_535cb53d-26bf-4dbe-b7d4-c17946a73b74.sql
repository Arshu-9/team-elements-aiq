-- Create session_files table
CREATE TABLE IF NOT EXISTS public.session_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  encryption_key TEXT NOT NULL,
  is_opened BOOLEAN DEFAULT false,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on session_files
ALTER TABLE public.session_files ENABLE ROW LEVEL SECURITY;

-- Session participants can view files
CREATE POLICY "Session participants can view files"
ON public.session_files
FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM public.session_participants WHERE user_id = auth.uid()
  )
);

-- Session participants can upload files
CREATE POLICY "Session participants can upload files"
ON public.session_files
FOR INSERT
WITH CHECK (
  auth.uid() = uploader_id AND
  session_id IN (
    SELECT session_id FROM public.session_participants WHERE user_id = auth.uid()
  )
);

-- Session participants can update files (for marking as opened)
CREATE POLICY "Session participants can update files"
ON public.session_files
FOR UPDATE
USING (
  session_id IN (
    SELECT session_id FROM public.session_participants WHERE user_id = auth.uid()
  )
);

-- Add intrusion_attempts table for logging unauthorized access
CREATE TABLE IF NOT EXISTS public.intrusion_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  attempted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempt_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_info JSONB,
  ip_address TEXT,
  reason TEXT NOT NULL
);

-- Enable RLS on intrusion_attempts
ALTER TABLE public.intrusion_attempts ENABLE ROW LEVEL SECURITY;

-- Session creators can view intrusion attempts for their sessions
CREATE POLICY "Session creators can view intrusion attempts"
ON public.intrusion_attempts
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE creator_id = auth.uid()
  )
);

-- System can insert intrusion attempts
CREATE POLICY "System can insert intrusion attempts"
ON public.intrusion_attempts
FOR INSERT
WITH CHECK (true);

-- Add key rotation tracking
CREATE TABLE IF NOT EXISTS public.session_key_rotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  old_key TEXT NOT NULL,
  new_key TEXT NOT NULL,
  rotated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on session_key_rotations
ALTER TABLE public.session_key_rotations ENABLE ROW LEVEL SECURITY;

-- Session participants can view key rotations
CREATE POLICY "Participants can view key rotations"
ON public.session_key_rotations
FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM public.session_participants WHERE user_id = auth.uid()
  )
);

-- Update session_participants to track if they created the session
ALTER TABLE public.session_participants 
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT false;

-- Add columns to session_messages for enhanced features
ALTER TABLE public.session_messages 
ADD COLUMN IF NOT EXISTS chat_mode TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS read_by UUID[],
ADD COLUMN IF NOT EXISTS delivered_to UUID[];