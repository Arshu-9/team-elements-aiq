-- Add authenticity column to sessions for join policy UI
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS authenticity TEXT NOT NULL DEFAULT 'anyone';

-- Optional: index for queries by session_key
CREATE INDEX IF NOT EXISTS idx_sessions_session_key ON public.sessions (session_key);
