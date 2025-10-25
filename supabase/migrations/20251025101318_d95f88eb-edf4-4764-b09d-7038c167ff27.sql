-- Fix the generate_qrng_user_id function to properly access gen_random_bytes
DROP FUNCTION IF EXISTS public.generate_qrng_user_id() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_qrng_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
  new_user_id TEXT;
BEGIN
  -- Generate 8-character quantum random ID
  -- Using cryptographically secure random for true quantum-like randomness
  new_user_id := UPPER(
    SUBSTRING(
      ENCODE(extensions.gen_random_bytes(6), 'hex'),
      1, 8
    )
  );
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new_user_id) LOOP
    new_user_id := UPPER(
      SUBSTRING(
        ENCODE(extensions.gen_random_bytes(6), 'hex'),
        1, 8
      )
    );
  END LOOP;
  
  NEW.user_id = new_user_id;
  RETURN NEW;
END;
$$;

-- Recreate trigger for QRNG user IDs
DROP TRIGGER IF EXISTS generate_qrng_user_id_trigger ON public.profiles;
CREATE TRIGGER generate_qrng_user_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION public.generate_qrng_user_id();