-- Enhanced prerequisites to support complex logic (AND/OR groups)
-- Add prerequisite_group column to support OR logic
-- Courses in the same group are OR'd together
-- Different groups are AND'd together
ALTER TABLE public.prerequisites
ADD COLUMN IF NOT EXISTS prerequisite_group INTEGER DEFAULT 1;
-- Add optional requirement (if true, this prereq is recommended but not required)
ALTER TABLE public.prerequisites
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;
-- Add minimum grade requirement (e.g., 'C-' minimum in CS 46B)
ALTER TABLE public.prerequisites
ADD COLUMN IF NOT EXISTS minimum_grade TEXT;
COMMENT ON COLUMN public.prerequisites.prerequisite_group IS 'Group number for OR logic. Courses in the same group are OR''d together. Different groups are AND''d together.
   Example: CS 146 requires (MATH 30 AND MATH 42 AND CS 46B AND (CS 48 OR CS 49J))
   - MATH 30: group 1
   - MATH 42: group 2  
   - CS 46B: group 3
   - CS 48: group 4 (OR)
   - CS 49J: group 4 (OR)
   You need to satisfy ALL groups (AND), but only ONE course from each group.';
COMMENT ON COLUMN public.prerequisites.is_optional IS 'If true, this prerequisite is recommended but not strictly required';
COMMENT ON COLUMN public.prerequisites.minimum_grade IS 'Minimum grade required for this prerequisite (e.g., C-, C, B-)';
-- Example: How to add CS 146 prerequisites
-- CS 146 requires: MATH 30 AND MATH 42 AND CS 46B AND (CS 48 OR CS 49J)
-- Clear example data (don't run in production if you have real data)
-- DELETE FROM prerequisites WHERE course_id = (SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '146');
-- Add the prerequisites:
-- Group 1: MATH 30 (required)
-- Group 2: MATH 42 (required)  
-- Group 3: CS 46B (required with minimum grade C-)
-- Group 4: CS 48 OR CS 49J (one of these required)
/*
 Example insertions (commented out - uncomment when you have the courses):
 
 INSERT INTO prerequisites (course_id, prerequisite_course_id, prerequisite_group, minimum_grade)
 VALUES 
 -- Group 1: MATH 30
 ((SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '146'),
 (SELECT id FROM courses WHERE course_code = 'MATH' AND course_number = '30'),
 1, NULL),
 
 -- Group 2: MATH 42
 ((SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '146'),
 (SELECT id FROM courses WHERE course_code = 'MATH' AND course_number = '42'),
 2, NULL),
 
 -- Group 3: CS 46B with minimum grade C-
 ((SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '146'),
 (SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '46B'),
 3, 'C-'),
 
 -- Group 4: CS 48 (OR)
 ((SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '146'),
 (SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '48'),
 4, NULL),
 
 -- Group 4: CS 49J (OR) - same group as CS 48
 ((SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '146'),
 (SELECT id FROM courses WHERE course_code = 'CS' AND course_number = '49J'),
 4, NULL);
 */
-- Create helper view to display prerequisites in readable format
CREATE OR REPLACE VIEW prerequisite_view AS
SELECT c1.course_code || ' ' || c1.course_number AS course,
    c1.title AS course_title,
    p.prerequisite_group,
    c2.course_code || ' ' || c2.course_number AS prerequisite,
    c2.title AS prerequisite_title,
    p.minimum_grade,
    p.is_corequisite,
    p.is_optional
FROM prerequisites p
    JOIN courses c1 ON p.course_id = c1.id
    JOIN courses c2 ON p.prerequisite_course_id = c2.id
ORDER BY c1.course_code,
    c1.course_number,
    p.prerequisite_group;
COMMENT ON VIEW prerequisite_view IS 'Human-readable view of prerequisites showing course names and grouping';