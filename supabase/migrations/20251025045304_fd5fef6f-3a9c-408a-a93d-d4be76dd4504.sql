-- Add user_id field to profiles for searchable unique identifier
ALTER TABLE public.profiles
ADD COLUMN user_id TEXT;

-- Generate unique 8-character user IDs for existing users
UPDATE public.profiles
SET user_id = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
WHERE user_id IS NULL;

-- Make user_id unique and not null
ALTER TABLE public.profiles
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Function to generate user_id on profile creation
CREATE OR REPLACE FUNCTION public.generate_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate user_id
CREATE TRIGGER set_user_id_on_profile
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_user_id();