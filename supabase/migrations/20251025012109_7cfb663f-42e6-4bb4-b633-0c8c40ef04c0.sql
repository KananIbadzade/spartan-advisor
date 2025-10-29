-- Insert Computer Science department
INSERT INTO public.departments (code, name)
VALUES ('CS', 'Computer Science')
ON CONFLICT DO NOTHING;

-- Insert CS courses (linking to CS department)
INSERT INTO public.courses (course_code, course_number, title, units, department_id)
SELECT 
  'CS 46A', '46A', 'Introduction to Programming', 4, d.id
FROM public.departments d
WHERE d.code = 'CS'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (course_code, course_number, title, units, department_id)
SELECT 
  'CS 46B', '46B', 'Introduction to Data Structures', 4, d.id
FROM public.departments d
WHERE d.code = 'CS'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (course_code, course_number, title, units, department_id)
SELECT 
  'CS 47', '47', 'Introduction to Computer Systems', 3, d.id
FROM public.departments d
WHERE d.code = 'CS'
ON CONFLICT DO NOTHING;