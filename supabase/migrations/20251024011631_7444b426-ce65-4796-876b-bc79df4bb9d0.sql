-- Add email column to user_roles table for admin convenience
ALTER TABLE public.user_roles ADD COLUMN email TEXT;

-- Add RLS policy to allow users to insert their initial role selection
CREATE POLICY "Users can insert their own initial role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update existing user_roles rows with email from profiles
UPDATE public.user_roles ur
SET email = p.email
FROM public.profiles p
WHERE ur.user_id = p.id;