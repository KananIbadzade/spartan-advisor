-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'advisor', 'admin');

-- Create enum for plan status
CREATE TYPE public.plan_status AS ENUM ('draft', 'submitted', 'approved', 'declined');

-- Create enum for course grade
CREATE TYPE public.course_grade AS ENUM ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'P', 'NP', 'W', 'IP');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  student_id TEXT UNIQUE,
  major TEXT,
  catalog_year TEXT,
  year_in_school TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL,
  course_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  units INTEGER NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_code, course_number)
);

-- Create prerequisites table
CREATE TABLE public.prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  is_corequisite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id)
);

-- Create transcripts table
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  parsed_data JSONB,
  embeddings_data JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create transcript_courses table (extracted from transcript)
CREATE TABLE public.transcript_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_number TEXT NOT NULL,
  title TEXT,
  units REAL NOT NULL,
  grade course_grade,
  term TEXT,
  year TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create student_plans table
CREATE TABLE public.student_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Academic Plan',
  status plan_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  advisor_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create plan_courses table
CREATE TABLE public.plan_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.student_plans(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  term TEXT NOT NULL,
  year TEXT NOT NULL,
  term_order INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, course_id, term, year)
);

-- Create advisor_assignments table
CREATE TABLE public.advisor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(advisor_id, student_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Advisors can view assigned students' profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_id = auth.uid() AND student_id = profiles.id
    )
  );

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for departments (public read)
CREATE POLICY "Anyone can view departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses (public read)
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for prerequisites (public read)
CREATE POLICY "Anyone can view prerequisites"
  ON public.prerequisites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage prerequisites"
  ON public.prerequisites FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transcripts
CREATE POLICY "Students can view their own transcripts"
  ON public.transcripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own transcripts"
  ON public.transcripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own transcripts"
  ON public.transcripts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Advisors can view assigned students' transcripts"
  ON public.transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_id = auth.uid() AND student_id = transcripts.user_id
    )
  );

-- RLS Policies for transcript_courses
CREATE POLICY "Students can view their own transcript courses"
  ON public.transcript_courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transcripts
      WHERE transcripts.id = transcript_courses.transcript_id
      AND transcripts.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert their own transcript courses"
  ON public.transcript_courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transcripts
      WHERE transcripts.id = transcript_courses.transcript_id
      AND transcripts.user_id = auth.uid()
    )
  );

-- RLS Policies for student_plans
CREATE POLICY "Students can view their own plans"
  ON public.student_plans FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own plans"
  ON public.student_plans FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Advisors can view assigned students' plans"
  ON public.student_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_id = auth.uid() AND student_id = student_plans.student_id
    )
  );

CREATE POLICY "Advisors can update assigned students' plans"
  ON public.student_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.advisor_assignments
      WHERE advisor_id = auth.uid() AND student_id = student_plans.student_id
    )
  );

-- RLS Policies for plan_courses
CREATE POLICY "Students can view their own plan courses"
  ON public.plan_courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_plans
      WHERE student_plans.id = plan_courses.plan_id
      AND student_plans.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can manage their own plan courses"
  ON public.plan_courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.student_plans
      WHERE student_plans.id = plan_courses.plan_id
      AND student_plans.student_id = auth.uid()
    )
  );

-- RLS Policies for advisor_assignments
CREATE POLICY "Advisors can view their assignments"
  ON public.advisor_assignments FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Students can view their advisor assignments"
  ON public.advisor_assignments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all assignments"
  ON public.advisor_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for messages
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update message read status"
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_plans_updated_at
  BEFORE UPDATE ON public.student_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  -- Assign student role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_courses_department ON public.courses(department_id);
CREATE INDEX idx_transcripts_user_id ON public.transcripts(user_id);
CREATE INDEX idx_student_plans_student_id ON public.student_plans(student_id);
CREATE INDEX idx_student_plans_status ON public.student_plans(status);
CREATE INDEX idx_plan_courses_plan_id ON public.plan_courses(plan_id);
CREATE INDEX idx_advisor_assignments_advisor ON public.advisor_assignments(advisor_id);
CREATE INDEX idx_advisor_assignments_student ON public.advisor_assignments(student_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);