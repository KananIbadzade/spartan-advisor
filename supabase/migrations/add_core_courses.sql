-- ============================================================================
-- SJSU Core Courses Migration
-- Populates courses and prerequisites tables with core CS/CMPE courses
-- Based on Software Engineering, Computer Engineering, and Computer Science roadmaps
-- ============================================================================

-- ============================================================================
-- INSERT COURSES
-- ============================================================================

-- Computer Science (CS) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('CS', '46A', 'Introduction to Programming', 4, 'Introduction to programming using Java. Covers basic programming constructs, data types, control structures, arrays, and objects.'),
('CS', '46B', 'Introduction to Data Structures', 4, 'Data structures and algorithms including lists, stacks, queues, trees, hashing, searching, and sorting using Java.'),
('CS', '47', 'Introduction to Computer Systems', 3, 'Introduction to computer organization, data representation, assembly language programming, and system software.'),
('CS', '100W', 'Technical Writing Workshop', 3, 'Writing workshop focused on technical writing for computer science. Covers documentation, specifications, and technical reports.'),
('CS', '146', 'Data Structures and Algorithms', 3, 'Advanced data structures and algorithm analysis. Topics include trees, graphs, hashing, and complexity analysis.'),
('CS', '147', 'Computer Architecture', 3, 'Computer organization and architecture including processor design, memory hierarchy, and I/O systems.'),
('CS', '149', 'Operating Systems', 3, 'Operating system concepts including process management, memory management, file systems, and concurrency.'),
('CS', '151', 'Object-Oriented Design', 3, 'Object-oriented analysis and design using UML. Design patterns and software architecture principles.'),
('CS', '152', 'Programming Paradigms', 3, 'Survey of programming paradigms including functional, logic, and concurrent programming languages.'),
('CS', '154', 'Formal Languages and Computability', 3, 'Theory of computation including automata, formal languages, Turing machines, and computational complexity.'),
('CS', '157A', 'Introduction to Database Management Systems', 3, 'Database design, SQL, relational model, normalization, and database application development.'),
('CS', '160', 'Software Engineering', 3, 'Software engineering principles, methodologies, and practices. Software lifecycle, testing, and project management.'),
('CS', '166', 'Information Security', 3, 'Fundamentals of information security including cryptography, network security, and secure software development.')
ON CONFLICT DO NOTHING;

-- Computer Engineering (CMPE) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('CMPE', '102', 'Assembly Language Programming', 3, 'Assembly language programming and computer organization. Introduction to system-level programming.'),
('CMPE', '120', 'Computer Organization and Architecture', 3, 'Computer organization including CPU design, memory systems, and I/O. Hardware-software interface.'),
('CMPE', '131', 'Software Engineering I', 3, 'Introduction to software engineering. Requirements analysis, design, implementation, and testing.'),
('CMPE', '133', 'Software Engineering II', 3, 'Advanced software engineering topics. Software architecture, design patterns, and agile methodologies.'),
('CMPE', '148', 'Computer Networks I', 3, 'Computer network architecture, protocols, and applications. TCP/IP, routing, and network security.'),
('CMPE', '165', 'Software Engineering Process Management', 3, 'Software process models, project management, quality assurance, and configuration management.'),
('CMPE', '172', 'Enterprise Software Platforms', 3, 'Enterprise application development using modern frameworks and platforms. Service-oriented architecture.'),
('CMPE', '187', 'Software Quality Engineering', 3, 'Software quality assurance, testing strategies, verification, and validation techniques.'),
('CMPE', '195A', 'Senior Design Project I', 2, 'First semester of two-semester senior design project. Requirements, design, and planning.'),
('CMPE', '195B', 'Senior Design Project II', 3, 'Second semester of senior design project. Implementation, testing, and project presentation.')
ON CONFLICT DO NOTHING;

-- Mathematics (MATH) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('MATH', '30', 'Calculus I', 3, 'Limits, continuity, derivatives, and applications. Introduction to integration.'),
('MATH', '31', 'Calculus II', 3, 'Integration techniques, applications of integration, sequences, and series.'),
('MATH', '32', 'Calculus III', 3, 'Multivariable calculus including partial derivatives, multiple integrals, and vector calculus.'),
('MATH', '33LA', 'Differential Equations and Linear Algebra', 3, 'First-order differential equations and linear algebra including matrices, vectors, and eigenvalues.'),
('MATH', '39', 'Linear Algebra I', 3, 'Vector spaces, linear transformations, matrices, determinants, and eigenvalues.'),
('MATH', '42', 'Discrete Mathematics', 3, 'Logic, sets, functions, relations, combinatorics, graph theory, and Boolean algebra.'),
('MATH', '161A', 'Applied Probability and Statistics I', 3, 'Probability theory, random variables, distributions, and statistical inference.')
ON CONFLICT DO NOTHING;

-- Physics (PHYS) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('PHYS', '50', 'General Physics I: Mechanics', 4, 'Mechanics including kinematics, dynamics, energy, momentum, and rotational motion. Includes laboratory.'),
('PHYS', '51', 'General Physics II: Electricity and Magnetism', 4, 'Electricity and magnetism including electric fields, circuits, magnetic fields, and electromagnetic induction. Includes laboratory.')
ON CONFLICT DO NOTHING;

-- Engineering (ENGR) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('ENGR', '10', 'Introduction to Engineering', 3, 'Introduction to engineering disciplines, problem-solving, and design process.'),
('ENGR', '100W', 'Engineering Reports', 3, 'Technical writing for engineers. Written and oral communication of technical information.'),
('ENGR', '195A', 'Global and Social Issues in Engineering', 1, 'Ethical, social, and global issues in engineering practice. Part I of two-semester sequence.'),
('ENGR', '195B', 'Global and Social Issues in Engineering', 1, 'Continuation of ethical, social, and global issues in engineering. Part II of sequence.')
ON CONFLICT DO NOTHING;

-- English (ENGL) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('ENGL', '1A', 'First Year Writing', 3, 'Written communication, critical reading, and analytical writing.'),
('ENGL', '1B', 'Argument and Analysis', 3, 'Argumentation, research, and critical analysis. Advanced writing skills.')
ON CONFLICT DO NOTHING;

-- Biology (BIOL) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('BIOL', '10', 'The Living World', 3, 'Introduction to biology including cell structure, genetics, evolution, and ecology.'),
('BIOL', '30', 'Biology I', 4, 'General biology including molecular and cellular biology. Includes laboratory.')
ON CONFLICT DO NOTHING;

-- Philosophy (PHIL) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('PHIL', '134', 'Computers, Ethics and Society', 3, 'Ethical and social issues in computing including privacy, security, intellectual property, and professional responsibility.')
ON CONFLICT DO NOTHING;

-- Industrial & Systems Engineering (ISE) Courses
INSERT INTO courses (course_code, course_number, title, units, description) VALUES
('ISE', '130', 'Introduction to Probability and Statistics for Engineers', 3, 'Probability theory and statistical methods for engineering applications.'),
('ISE', '164', 'Computer and Human Interaction', 3, 'Human-computer interaction design principles, usability testing, and user interface design.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSERT PREREQUISITES
-- ============================================================================

-- Helper: Get course IDs for prerequisite relationships
-- CS Prerequisites
INSERT INTO prerequisites (course_id, prerequisite_course_id, is_corequisite)
SELECT
  c.id,
  p.id,
  false
FROM courses c
CROSS JOIN courses p
WHERE
  -- CS 46B requires CS 46A
  (c.course_code = 'CS' AND c.course_number = '46B' AND p.course_code = 'CS' AND p.course_number = '46A')
  -- CS 47 requires CS 46B
  OR (c.course_code = 'CS' AND c.course_number = '47' AND p.course_code = 'CS' AND p.course_number = '46B')
  -- CS 146 requires CS 46B
  OR (c.course_code = 'CS' AND c.course_number = '146' AND p.course_code = 'CS' AND p.course_number = '46B')
  -- CS 146 requires MATH 42
  OR (c.course_code = 'CS' AND c.course_number = '146' AND p.course_code = 'MATH' AND p.course_number = '42')
  -- CS 147 requires CS 47
  OR (c.course_code = 'CS' AND c.course_number = '147' AND p.course_code = 'CS' AND p.course_number = '47')
  -- CS 149 requires CS 146
  OR (c.course_code = 'CS' AND c.course_number = '149' AND p.course_code = 'CS' AND p.course_number = '146')
  -- CS 151 requires CS 46B
  OR (c.course_code = 'CS' AND c.course_number = '151' AND p.course_code = 'CS' AND p.course_number = '46B')
  -- CS 152 requires CS 146
  OR (c.course_code = 'CS' AND c.course_number = '152' AND p.course_code = 'CS' AND p.course_number = '146')
  -- CS 154 requires CS 146
  OR (c.course_code = 'CS' AND c.course_number = '154' AND p.course_code = 'CS' AND p.course_number = '146')
  -- CS 157A requires CS 146
  OR (c.course_code = 'CS' AND c.course_number = '157A' AND p.course_code = 'CS' AND p.course_number = '146')
  -- CS 160 requires CS 151
  OR (c.course_code = 'CS' AND c.course_number = '160' AND p.course_code = 'CS' AND p.course_number = '151')
  -- CS 166 requires CS 146
  OR (c.course_code = 'CS' AND c.course_number = '166' AND p.course_code = 'CS' AND p.course_number = '146')
ON CONFLICT DO NOTHING;

-- CMPE Prerequisites
INSERT INTO prerequisites (course_id, prerequisite_course_id, is_corequisite)
SELECT
  c.id,
  p.id,
  false
FROM courses c
CROSS JOIN courses p
WHERE
  -- CMPE 102 requires CS 46B
  (c.course_code = 'CMPE' AND c.course_number = '102' AND p.course_code = 'CS' AND p.course_number = '46B')
  -- CMPE 120 requires CS 46B
  OR (c.course_code = 'CMPE' AND c.course_number = '120' AND p.course_code = 'CS' AND p.course_number = '46B')
  -- CMPE 131 requires CS 46B
  OR (c.course_code = 'CMPE' AND c.course_number = '131' AND p.course_code = 'CS' AND p.course_number = '46B')
  -- CMPE 133 requires CMPE 131
  OR (c.course_code = 'CMPE' AND c.course_number = '133' AND p.course_code = 'CMPE' AND p.course_number = '131')
  -- CMPE 148 requires CS 146
  OR (c.course_code = 'CMPE' AND c.course_number = '148' AND p.course_code = 'CS' AND p.course_number = '146')
  -- CMPE 165 requires CMPE 131
  OR (c.course_code = 'CMPE' AND c.course_number = '165' AND p.course_code = 'CMPE' AND p.course_number = '131')
  -- CMPE 172 requires CS 146
  OR (c.course_code = 'CMPE' AND c.course_number = '172' AND p.course_code = 'CS' AND p.course_number = '146')
  -- CMPE 187 requires CMPE 131
  OR (c.course_code = 'CMPE' AND c.course_number = '187' AND p.course_code = 'CMPE' AND p.course_number = '131')
  -- CMPE 195A requires CMPE 133
  OR (c.course_code = 'CMPE' AND c.course_number = '195A' AND p.course_code = 'CMPE' AND p.course_number = '133')
  -- CMPE 195B requires CMPE 195A
  OR (c.course_code = 'CMPE' AND c.course_number = '195B' AND p.course_code = 'CMPE' AND p.course_number = '195A')
ON CONFLICT DO NOTHING;

-- MATH Prerequisites
INSERT INTO prerequisites (course_id, prerequisite_course_id, is_corequisite)
SELECT
  c.id,
  p.id,
  false
FROM courses c
CROSS JOIN courses p
WHERE
  -- MATH 31 requires MATH 30
  (c.course_code = 'MATH' AND c.course_number = '31' AND p.course_code = 'MATH' AND p.course_number = '30')
  -- MATH 32 requires MATH 31
  OR (c.course_code = 'MATH' AND c.course_number = '32' AND p.course_code = 'MATH' AND p.course_number = '31')
  -- MATH 33LA requires MATH 31
  OR (c.course_code = 'MATH' AND c.course_number = '33LA' AND p.course_code = 'MATH' AND p.course_number = '31')
  -- MATH 39 requires MATH 30
  OR (c.course_code = 'MATH' AND c.course_number = '39' AND p.course_code = 'MATH' AND p.course_number = '30')
  -- MATH 161A requires MATH 30
  OR (c.course_code = 'MATH' AND c.course_number = '161A' AND p.course_code = 'MATH' AND p.course_number = '30')
ON CONFLICT DO NOTHING;

-- PHYS Prerequisites
INSERT INTO prerequisites (course_id, prerequisite_course_id, is_corequisite)
SELECT
  c.id,
  p.id,
  false
FROM courses c
CROSS JOIN courses p
WHERE
  -- PHYS 50 requires MATH 30 (corequisite is okay)
  (c.course_code = 'PHYS' AND c.course_number = '50' AND p.course_code = 'MATH' AND p.course_number = '30')
  -- PHYS 51 requires PHYS 50
  OR (c.course_code = 'PHYS' AND c.course_number = '51' AND p.course_code = 'PHYS' AND p.course_number = '50')
  -- PHYS 51 requires MATH 31 (corequisite is okay)
  OR (c.course_code = 'PHYS' AND c.course_number = '51' AND p.course_code = 'MATH' AND p.course_number = '31')
ON CONFLICT DO NOTHING;

-- ENGR Prerequisites
INSERT INTO prerequisites (course_id, prerequisite_course_id, is_corequisite)
SELECT
  c.id,
  p.id,
  false
FROM courses c
CROSS JOIN courses p
WHERE
  -- ENGR 195B requires ENGR 195A
  (c.course_code = 'ENGR' AND c.course_number = '195B' AND p.course_code = 'ENGR' AND p.course_number = '195A')
ON CONFLICT DO NOTHING;

-- ENGL Prerequisites
INSERT INTO prerequisites (course_id, prerequisite_course_id, is_corequisite)
SELECT
  c.id,
  p.id,
  false
FROM courses c
CROSS JOIN courses p
WHERE
  -- ENGL 1B requires ENGL 1A
  (c.course_code = 'ENGL' AND c.course_number = '1B' AND p.course_code = 'ENGL' AND p.course_number = '1A')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
DECLARE
  course_count INTEGER;
  prereq_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO course_count FROM courses;
  SELECT COUNT(*) INTO prereq_count FROM prerequisites;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Course data migration completed successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total courses in database: %', course_count;
  RAISE NOTICE 'Total prerequisite relationships: %', prereq_count;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Chatbot is now ready to answer questions about:';
  RAISE NOTICE '  - Course information (descriptions, units)';
  RAISE NOTICE '  - Prerequisites and corequisites';
  RAISE NOTICE '  - CS, CMPE, MATH, PHYS, and ENGR courses';
  RAISE NOTICE '============================================';
END $$;
