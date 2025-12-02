-- Add avatar_url to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Optional: create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles (avatar_url);

-- NOTE: Ensure a private storage bucket named 'avatars' exists in Supabase
