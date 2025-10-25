-- Update chat modes to replace spy/burn with self-destruct
-- Add a check constraint to ensure only valid chat modes
ALTER TABLE session_chat_state DROP CONSTRAINT IF EXISTS session_chat_state_chat_mode_check;
ALTER TABLE session_chat_state ADD CONSTRAINT session_chat_state_chat_mode_check 
  CHECK (chat_mode IN ('normal', 'self-destruct'));

ALTER TABLE session_messages DROP CONSTRAINT IF EXISTS session_messages_chat_mode_check;
ALTER TABLE session_messages ADD CONSTRAINT session_messages_chat_mode_check 
  CHECK (chat_mode IN ('normal', 'self-destruct'));

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_chat_mode_check;
ALTER TABLE messages ADD CONSTRAINT messages_chat_mode_check 
  CHECK (chat_mode IN ('normal', 'self-destruct'));

-- Update any existing records to use the new modes
UPDATE session_chat_state SET chat_mode = 'self-destruct' WHERE chat_mode IN ('spy', 'burn');
UPDATE session_messages SET chat_mode = 'self-destruct' WHERE chat_mode IN ('spy', 'burn');
UPDATE messages SET chat_mode = 'self-destruct' WHERE chat_mode IN ('spy', 'burn');

-- Add auto_delete_at column to session_messages for self-destruct tracking
ALTER TABLE session_messages ADD COLUMN IF NOT EXISTS auto_delete_at timestamp with time zone;