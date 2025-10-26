-- Create security definer function to check conversation access
CREATE OR REPLACE FUNCTION public.user_can_access_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
    AND user_id = _user_id
  );
$$;

-- Replace RLS policy with secure function
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants
FOR SELECT
USING (
  user_id = auth.uid() OR
  public.user_can_access_conversation(conversation_id, auth.uid())
);

-- Update conversations policy to use the function too
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;

CREATE POLICY "Participants can view their conversations"
ON public.conversations
FOR SELECT
USING (
  public.user_can_access_conversation(id, auth.uid())
);