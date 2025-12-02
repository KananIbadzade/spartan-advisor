-- Create plan_messages table for two-way advisor-student communication

CREATE TABLE public.plan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_messages ENABLE ROW LEVEL SECURITY;

-- Students can view messages in their conversations
CREATE POLICY "Students can view their messages"
  ON public.plan_messages FOR SELECT
  USING (auth.uid() = student_id);

-- Advisors can view messages for their assigned students
CREATE POLICY "Advisors can view their student messages"
  ON public.plan_messages FOR SELECT
  USING (
    auth.uid() = advisor_id
    OR EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_assignments.advisor_id = auth.uid()
      AND advisor_assignments.student_id = plan_messages.student_id
    )
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.plan_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.status = 'active'
    )
  );

-- Students can send messages to their advisor
CREATE POLICY "Students can send messages"
  ON public.plan_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_assignments.student_id = auth.uid()
      AND advisor_assignments.advisor_id = plan_messages.advisor_id
    )
  );

-- Advisors can send messages to their students
CREATE POLICY "Advisors can send messages"
  ON public.plan_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() = advisor_id
    AND EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_assignments.advisor_id = auth.uid()
      AND advisor_assignments.student_id = plan_messages.student_id
    )
  );

-- Create indexes for performance
CREATE INDEX idx_plan_messages_student_id ON public.plan_messages(student_id);
CREATE INDEX idx_plan_messages_advisor_id ON public.plan_messages(advisor_id);
CREATE INDEX idx_plan_messages_created_at ON public.plan_messages(created_at DESC);
