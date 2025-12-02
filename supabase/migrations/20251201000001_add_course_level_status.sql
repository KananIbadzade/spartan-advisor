-- Add status tracking at the course level instead of just plan level

-- Add status column to plan_courses
ALTER TABLE public.plan_courses
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'declined'));

-- Set existing courses to 'approved' if their plan is approved, otherwise 'draft'
UPDATE public.plan_courses pc
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.student_plans sp
    WHERE sp.id = pc.plan_id
    AND sp.status = 'approved'
  ) THEN 'approved'
  WHEN EXISTS (
    SELECT 1 FROM public.student_plans sp
    WHERE sp.id = pc.plan_id
    AND sp.status = 'submitted'
  ) THEN 'submitted'
  ELSE 'draft'
END
WHERE status IS NULL OR status = 'draft';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_plan_courses_status ON public.plan_courses(status);
