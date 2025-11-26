-- Create enum for suggestion status
CREATE TYPE public.suggestion_status AS ENUM ('pending', 'accepted', 'declined');

-- Create advisor_notes table
CREATE TABLE public.advisor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create advisor_suggestions table
CREATE TABLE public.advisor_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content TEXT, -- Optional explanation/reason for the suggestion
  status suggestion_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.advisor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advisor_notes
CREATE POLICY "Advisors can view notes they created"
  ON public.advisor_notes FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Students can view notes about them"
  ON public.advisor_notes FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Advisors can create notes for assigned students"
  ON public.advisor_notes FOR INSERT
  WITH CHECK (
    auth.uid() = advisor_id AND
    EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_id = auth.uid() AND student_id = advisor_notes.student_id
    )
  );

CREATE POLICY "Advisors can update their own notes"
  ON public.advisor_notes FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete their own notes"
  ON public.advisor_notes FOR DELETE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Admins can manage all notes"
  ON public.advisor_notes FOR ALL
  USING (public.has_active_role(auth.uid(), 'admin'));

-- RLS Policies for advisor_suggestions
CREATE POLICY "Advisors can view suggestions they created"
  ON public.advisor_suggestions FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Students can view suggestions for them"
  ON public.advisor_suggestions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Advisors can create suggestions for assigned students"
  ON public.advisor_suggestions FOR INSERT
  WITH CHECK (
    auth.uid() = advisor_id AND
    EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_id = auth.uid() AND student_id = advisor_suggestions.student_id
    )
  );

CREATE POLICY "Advisors can update their own suggestions"
  ON public.advisor_suggestions FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Students can update status of suggestions for them"
  ON public.advisor_suggestions FOR UPDATE
  USING (
    auth.uid() = student_id AND
    -- Students can only update the status field
    (OLD.advisor_id, OLD.student_id, OLD.course_id, OLD.content, OLD.created_at) =
    (NEW.advisor_id, NEW.student_id, NEW.course_id, NEW.content, NEW.created_at)
  );

CREATE POLICY "Advisors can delete their own suggestions"
  ON public.advisor_suggestions FOR DELETE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Admins can manage all suggestions"
  ON public.advisor_suggestions FOR ALL
  USING (public.has_active_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_advisor_notes_updated_at
  BEFORE UPDATE ON public.advisor_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advisor_suggestions_updated_at
  BEFORE UPDATE ON public.advisor_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_advisor_notes_advisor_id ON public.advisor_notes(advisor_id);
CREATE INDEX idx_advisor_notes_student_id ON public.advisor_notes(student_id);
CREATE INDEX idx_advisor_notes_created_at ON public.advisor_notes(created_at DESC);

CREATE INDEX idx_advisor_suggestions_advisor_id ON public.advisor_suggestions(advisor_id);
CREATE INDEX idx_advisor_suggestions_student_id ON public.advisor_suggestions(student_id);
CREATE INDEX idx_advisor_suggestions_course_id ON public.advisor_suggestions(course_id);
CREATE INDEX idx_advisor_suggestions_status ON public.advisor_suggestions(status);
CREATE INDEX idx_advisor_suggestions_created_at ON public.advisor_suggestions(created_at DESC);