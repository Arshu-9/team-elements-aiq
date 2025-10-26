-- Function to create conversation when connection is accepted
CREATE OR REPLACE FUNCTION public.create_conversation_on_connection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id UUID;
BEGIN
  -- Only create conversation when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status != 'accepted') THEN
    -- Create a new conversation
    INSERT INTO public.conversations (type, created_by)
    VALUES ('direct', NEW.user_id)
    RETURNING id INTO new_conversation_id;
    
    -- Add both users as participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
      (new_conversation_id, NEW.user_id),
      (new_conversation_id, NEW.connected_user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new accepted connections
DROP TRIGGER IF EXISTS on_connection_accepted ON public.connections;
CREATE TRIGGER on_connection_accepted
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.create_conversation_on_connection();