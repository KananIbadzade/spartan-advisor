-- Add RLS policy to allow advisors to update plan_courses status

-- Allow advisors to update plan courses for their assigned students
CREATE POLICY "Advisors can update their students plan courses"
ON public.plan_courses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_plans sp
    JOIN public.advisor_assignments aa ON aa.student_id = sp.student_id
    WHERE sp.id = plan_courses.plan_id
    AND aa.advisor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.status = 'active'
  )
);
