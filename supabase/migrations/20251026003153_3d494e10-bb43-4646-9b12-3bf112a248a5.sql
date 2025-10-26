-- Add UPDATE policy for messages to mark as read
DROP POLICY IF EXISTS "Users can update message read status" ON public.messages;

CREATE POLICY "Users can update message read status"
ON public.messages
FOR UPDATE
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);