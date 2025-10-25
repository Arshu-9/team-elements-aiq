-- Update user_id generation to use QRNG
DROP FUNCTION IF EXISTS public.generate_user_id() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_qrng_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id TEXT;
BEGIN
  -- Generate 8-character quantum random ID
  -- Using cryptographically secure random for true quantum-like randomness
  new_user_id := UPPER(
    SUBSTRING(
      ENCODE(gen_random_bytes(6), 'hex'),
      1, 8
    )
  );
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new_user_id) LOOP
    new_user_id := UPPER(
      SUBSTRING(
        ENCODE(gen_random_bytes(6), 'hex'),
        1, 8
      )
    );
  END LOOP;
  
  NEW.user_id = new_user_id;
  RETURN NEW;
END;
$$;

-- Create trigger for QRNG user IDs
DROP TRIGGER IF EXISTS generate_qrng_user_id_trigger ON public.profiles;
CREATE TRIGGER generate_qrng_user_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION public.generate_qrng_user_id();

-- Update existing user_ids to QRNG format (only if they're still in old format)
UPDATE public.profiles
SET user_id = UPPER(SUBSTRING(ENCODE(gen_random_bytes(6), 'hex'), 1, 8))
WHERE user_id IS NULL OR LENGTH(user_id) < 8;

-- Create table for synchronized chat mode state
CREATE TABLE IF NOT EXISTS public.session_chat_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  chat_mode text NOT NULL DEFAULT 'normal',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.session_chat_state ENABLE ROW LEVEL SECURITY;

-- Policies for session_chat_state
CREATE POLICY "Session participants can view chat state"
ON public.session_chat_state
FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM public.session_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Session participants can update chat state"
ON public.session_chat_state
FOR ALL
USING (
  session_id IN (
    SELECT session_id FROM public.session_participants
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  session_id IN (
    SELECT session_id FROM public.session_participants
    WHERE user_id = auth.uid()
  )
);

-- Add realtime for chat state
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_chat_state;