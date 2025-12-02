-- Add RLS policies for plan_courses table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can insert their own plan courses" ON public.plan_courses;
DROP POLICY IF EXISTS "Students can view their own plan courses" ON public.plan_courses;
DROP POLICY IF EXISTS "Students can update their own plan courses" ON public.plan_courses;
DROP POLICY IF EXISTS "Students can delete their own plan courses" ON public.plan_courses;
DROP POLICY IF EXISTS "Advisors can view their students plan courses" ON public.plan_courses;

-- Students can manage their own plan courses
CREATE POLICY "Students can insert their own plan courses"
ON public.plan_courses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_plans
    WHERE student_plans.id = plan_courses.plan_id
    AND student_plans.student_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own plan courses"
ON public.plan_courses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_plans
    WHERE student_plans.id = plan_courses.plan_id
    AND student_plans.student_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own plan courses"
ON public.plan_courses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_plans
    WHERE student_plans.id = plan_courses.plan_id
    AND student_plans.student_id = auth.uid()
  )
);

CREATE POLICY "Students can delete their own plan courses"
ON public.plan_courses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_plans
    WHERE student_plans.id = plan_courses.plan_id
    AND student_plans.student_id = auth.uid()
  )
);

-- Advisors can view plan courses for their assigned students
CREATE POLICY "Advisors can view their students plan courses"
ON public.plan_courses
FOR SELECT
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
