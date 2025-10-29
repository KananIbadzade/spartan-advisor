-- Add status column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'denied'));

-- Update existing rows to have active status
UPDATE public.user_roles SET status = 'active';

-- Create function to check if user has an active role
CREATE OR REPLACE FUNCTION public.has_active_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND status = 'active'
  )
$$;

-- Add RLS policy for admins to manage user roles
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_active_role(auth.uid(), 'admin'));

-- Add policy for users to view their own roles
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);