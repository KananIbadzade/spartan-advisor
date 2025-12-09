-- Add course sections table for real schedule data and conflict detection
-- Create course_sections table
CREATE TABLE public.course_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    section_number TEXT NOT NULL,
    -- e.g., "01", "02", "A", "B"
    term TEXT NOT NULL,
    -- e.g., "Fall", "Spring", "Summer", "Winter"
    year TEXT NOT NULL,
    -- e.g., "2024", "2025"
    days_of_week TEXT [],
    -- e.g., ['Monday', 'Wednesday', 'Friday']
    start_time TEXT NOT NULL,
    -- e.g., "10:00 AM"
    end_time TEXT NOT NULL,
    -- e.g., "11:15 AM"
    room TEXT,
    -- e.g., "ENG 101"
    instructor TEXT,
    -- e.g., "Dr. Smith"
    max_capacity INTEGER DEFAULT 30,
    current_enrollment INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(course_id, section_number, term, year)
);
-- Add course type to courses table for better categorization
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'free-elective';
-- Valid types: 'major-requirement', 'prerequisite', 'general-education', 'free-elective'
COMMENT ON COLUMN public.courses.type IS 'Course type: major-requirement, prerequisite, general-education, or free-elective';
-- Enable RLS on course_sections
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
-- RLS Policies for course_sections (public read)
CREATE POLICY "Anyone can view course sections" ON public.course_sections FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage course sections" ON public.course_sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));
-- Add trigger for updated_at
CREATE TRIGGER update_course_sections_updated_at BEFORE
UPDATE ON public.course_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Create indexes for performance
CREATE INDEX idx_course_sections_course_id ON public.course_sections(course_id);
CREATE INDEX idx_course_sections_term_year ON public.course_sections(term, year);
-- Sample data for testing conflict detection
-- You can modify or delete these after adding real data
INSERT INTO course_sections (
        course_id,
        section_number,
        term,
        year,
        days_of_week,
        start_time,
        end_time,
        room,
        instructor
    )
SELECT c.id,
    '01',
    'Spring',
    '2025',
    ARRAY ['Monday', 'Wednesday'],
    '10:00 AM',
    '11:15 AM',
    'ENG 101',
    'Dr. Smith'
FROM courses c
WHERE c.course_code = 'CS'
    AND c.course_number = '46A'
LIMIT 1;
INSERT INTO course_sections (
        course_id,
        section_number,
        term,
        year,
        days_of_week,
        start_time,
        end_time,
        room,
        instructor
    )
SELECT c.id,
    '01',
    'Spring',
    '2025',
    ARRAY ['Monday', 'Wednesday', 'Friday'],
    '10:30 AM',
    '11:45 AM',
    'SCI 201',
    'Dr. Johnson'
FROM courses c
WHERE c.course_code = 'MATH'
    AND c.course_number = '30'
LIMIT 1;
-- Update existing courses with types (examples - adjust based on your courses)
UPDATE public.courses
SET type = 'major-requirement'
WHERE course_code = 'CS';
UPDATE public.courses
SET type = 'prerequisite'
WHERE course_code = 'MATH';
UPDATE public.courses
SET type = 'general-education'
WHERE course_code = 'ENGL';
UPDATE public.courses
SET type = 'general-education'
WHERE course_code = 'COMM';
COMMENT ON TABLE public.course_sections IS 'Stores specific sections of courses with meeting times for conflict detection';