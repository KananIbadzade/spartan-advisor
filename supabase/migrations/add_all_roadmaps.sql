-- ============================================================================
-- SJSU Roadmaps - Combined Migration
-- Creates roadmaps table and inserts all major roadmaps
-- ============================================================================

-- Create roadmaps table (skip if already exists)
CREATE TABLE IF NOT EXISTS roadmaps (
  id SERIAL PRIMARY KEY,
  major_name VARCHAR(200) NOT NULL,
  degree_type VARCHAR(50) NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  description TEXT,
  roadmap_data JSONB NOT NULL,
  notes TEXT,
  gpa_requirements TEXT,
  total_units INTEGER DEFAULT 120,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on major_name and degree_type (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roadmaps_major_degree_unique'
  ) THEN
    ALTER TABLE roadmaps ADD CONSTRAINT roadmaps_major_degree_unique UNIQUE (major_name, degree_type);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roadmaps_major_name ON roadmaps(major_name);
CREATE INDEX IF NOT EXISTS idx_roadmaps_keywords ON roadmaps USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_roadmaps_roadmap_data ON roadmaps USING gin(roadmap_data);

-- Enable Row Level Security
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'roadmaps' AND policyname = 'Anyone can read roadmaps'
  ) THEN
    CREATE POLICY "Anyone can read roadmaps" ON roadmaps FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'roadmaps' AND policyname = 'Authenticated users can insert roadmaps'
  ) THEN
    CREATE POLICY "Authenticated users can insert roadmaps" ON roadmaps FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'roadmaps' AND policyname = 'Authenticated users can update roadmaps'
  ) THEN
    CREATE POLICY "Authenticated users can update roadmaps" ON roadmaps FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- Create trigger for updated_at (skip if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roadmaps_updated_at ON roadmaps;
CREATE TRIGGER update_roadmaps_updated_at
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROADMAP 1: Software Engineering, BS
-- ============================================================================

INSERT INTO roadmaps (
  major_name,
  degree_type,
  keywords,
  description,
  roadmap_data,
  notes,
  gpa_requirements,
  total_units
) VALUES (
  'Software Engineering',
  'BS',
  ARRAY['software engineering', 'software', 'se', 'cmpe'],
  'The following roadmap is a sample advising map to complete the degree program in four years.',
  '{
    "year1": {
      "fall": {
        "semester": "Year 1 Fall",
        "total_units": 16,
        "courses": [
          {"code": "CS 46A", "name": "Introduction to Programming", "units": 4},
          {"code": "ENGR 10", "name": "Introduction to Engineering", "units": 3},
          {"code": "GE Area 1A", "name": "Recommend ENGL 1A", "units": 3},
          {"code": "GE Area 1C", "name": "", "units": 3},
          {"code": "MATH 30", "name": "Calculus I", "units": 3, "ge": "GE Area 2"}
        ]
      },
      "spring": {
        "semester": "Year 1 Spring",
        "total_units": 14,
        "courses": [
          {"code": "CS 46B", "name": "Introduction to Data Structures", "units": 4},
          {"code": "ENGL 1B", "name": "Argument and Analysis", "units": 3, "ge": "GE Area 3B"},
          {"code": "MATH 42", "name": "Discrete Mathematics", "units": 3},
          {"code": "PHYS 50", "name": "General Physics I: Mechanics", "units": 4, "ge": "GE Areas 5A + 5C"}
        ]
      }
    },
    "year2": {
      "fall": {
        "semester": "Year 2 Fall",
        "total_units": 16,
        "notes": "Complete the Upper Division Writing - Directed Self Placement",
        "courses": [
          {"code": "BIOL 10", "name": "The Living World", "units": 3, "ge": "GE Area 5B"},
          {"code": "CMPE 131", "name": "Software Engineering I", "units": 3},
          {"code": "GE Area 3A", "name": "", "units": 3, "flexible": true},
          {"code": "GE Area 4 + US 1 or US 2-3", "name": "", "units": 3, "flexible": true},
          {"code": "MATH 31", "name": "Calculus II", "units": 4, "ge": "GE Area 2"}
        ]
      },
      "spring": {
        "semester": "Year 2 Spring",
        "total_units": 16,
        "courses": [
          {"code": "CS 146", "name": "Data Structures and Algorithms", "units": 3},
          {"code": "GE Area 6", "name": "", "units": 3, "flexible": true},
          {"code": "GE Area 4 + US 1 or US 2-3", "name": "", "units": 3, "flexible": true},
          {"code": "MATH 32", "name": "Calculus III", "units": 3, "ge": "GE Area 2"},
          {"code": "PHYS 51", "name": "General Physics II: Electricity and Magnetism", "units": 4, "ge": "GE Areas 5A + 5C"}
        ]
      }
    },
    "year3": {
      "fall": {
        "semester": "Year 3 Fall",
        "total_units": 15,
        "courses": [
          {"code": "CMPE 102", "name": "Assembly Language Programming", "units": 3},
          {"code": "CMPE 120", "name": "Computer Organization and Architecture", "units": 3},
          {"code": "CMPE 133", "name": "Software Engineering II", "units": 3},
          {"code": "CS 157A", "name": "Introduction to Database Management Systems", "units": 3},
          {"code": "MATH 161A", "name": "Applied Probability and Statistics I", "units": 3, "note": "OR ISE 130"}
        ]
      },
      "spring": {
        "semester": "Year 3 Spring",
        "total_units": 15,
        "notes": "Apply to Graduate",
        "courses": [
          {"code": "CMPE 148", "name": "Computer Networks I", "units": 3},
          {"code": "CS 149", "name": "Operating Systems", "units": 3},
          {"code": "CS 151", "name": "Object-Oriented Design", "units": 3},
          {"code": "ENGR 100W", "name": "Engineering Reports", "units": 3, "ge": "GE Upper Division Area 2/5 + WID"},
          {"code": "MATH 33LA", "name": "Differential Equations and Linear Algebra", "units": 3}
        ]
      }
    },
    "year4": {
      "fall": {
        "semester": "Year 4 Fall",
        "total_units": 15,
        "courses": [
          {"code": "CMPE 165", "name": "Software Engineering Process Management", "units": 3},
          {"code": "CMPE 172", "name": "Enterprise Software Platforms", "units": 3},
          {"code": "CMPE 187", "name": "Software Quality Engineering", "units": 3},
          {"code": "CMPE 195A", "name": "Senior Design Project I", "units": 2, "ge": "GE Upper Division Area 4"},
          {"code": "CS 166", "name": "Information Security", "units": 3},
          {"code": "ENGR 195A", "name": "Global and Social Issues in Engineering", "units": 1, "ge": "GE Upper Division Area 4"}
        ]
      },
      "spring": {
        "semester": "Year 4 Spring",
        "total_units": 13,
        "courses": [
          {"code": "CMPE 195B", "name": "Senior Design Project II", "units": 3, "ge": "GE Upper Division Area 3"},
          {"code": "ENGR 195B", "name": "Global and Social Issues in Engineering", "units": 1, "ge": "GE Upper Division Area 3"},
          {"code": "ISE 164", "name": "Computer and Human Interaction", "units": 3},
          {"code": "Technical Upper Division Elective", "name": "", "units": 3},
          {"code": "Technical Upper Division Elective", "name": "", "units": 3}
        ]
      }
    }
  }'::jsonb,
  E'*Courses marked with an asterisk may be taken in a different semester than listed.\n\nLower division courses should generally be taken in years 1-2, and upper division courses in years 3-4. Students must have completed 60+ units in order to enroll in Upper Division GE courses. Students should work with an academic advisor to create an individual roadmap using the MyPlanner tool.',
  E'A minimum 2.0 GPA in all required courses and technical electives taken at SJSU has been achieved.\nA minimum grade of "C" in MATH 30, MATH 31 and PHYS 50 has been achieved.\nA minimum grade of "C-" in the remaining courses in preparation for the major as well as in all courses in requirements of the major is required.\nA minimum grade of "C" in CMPE 195A/CMPE 195B and ENGR 195A/ENGR 195B has been achieved.',
  120
)
ON CONFLICT (major_name, degree_type) DO NOTHING;

-- ============================================================================
-- ROADMAP 2: Computer Engineering, BS
-- ============================================================================

INSERT INTO roadmaps (
  major_name,
  degree_type,
  keywords,
  description,
  roadmap_data,
  notes,
  gpa_requirements,
  total_units
) VALUES (
  'Computer Engineering',
  'BS',
  ARRAY['computer engineering', 'comp eng', 'cmpe', 'cpe', 'computer eng'],
  'The following roadmap is a sample advising map to complete the degree program in four years.',
  '{
    "year1": {
      "fall": {
        "semester": "Year 1 Fall",
        "total_units": 15,
        "courses": [
          {"code": "ENGR 10", "name": "Introduction to Engineering", "units": 3},
          {"code": "GE Area 1A", "name": "Recommend ENGL 1A", "units": 3},
          {"code": "GE Area 1C", "name": "", "units": 3, "flexible": true},
          {"code": "MATH 30", "name": "Calculus I", "units": 3, "ge": "GE Area 2"},
          {"code": "MATH 42", "name": "Discrete Mathematics", "units": 3}
        ]
      },
      "spring": {
        "semester": "Year 1 Spring",
        "total_units": 14,
        "courses": [
          {"code": "CMPE 30", "name": "Programming Concepts and Methodology", "units": 3},
          {"code": "ENGL 1B", "name": "Argument and Analysis", "units": 3, "ge": "GE Area 3B"},
          {"code": "MATH 31", "name": "Calculus II", "units": 4, "ge": "GE Area 2"},
          {"code": "PHYS 50", "name": "General Physics I: Mechanics", "units": 4, "ge": "GE Areas 5A + 5C"}
        ]
      }
    },
    "year2": {
      "fall": {
        "semester": "Year 2 Fall",
        "total_units": 16,
        "notes": "Complete the Upper Division Writing - Directed Self Placement",
        "courses": [
          {"code": "CMPE 50", "name": "Object-Oriented Concepts and Methodology", "units": 3},
          {"code": "GE Area 4 + US 1 or US 2-3", "name": "", "units": 3, "flexible": true},
          {"code": "GE Area 6", "name": "", "units": 3, "flexible": true},
          {"code": "MATH 32", "name": "Calculus III", "units": 3, "ge": "GE Area 2"},
          {"code": "PHYS 51", "name": "General Physics II: Electricity and Magnetism", "units": 4, "ge": "GE Area 5A + 5C"}
        ]
      },
      "spring": {
        "semester": "Year 2 Spring",
        "total_units": 16,
        "courses": [
          {"code": "BIOL 10", "name": "The Living World", "units": 3, "ge": "GE Area 5B"},
          {"code": "EE 97", "name": "Introductory Electrical Engineering Laboratory", "units": 1},
          {"code": "EE 98", "name": "Introduction to Circuit Analysis", "units": 3},
          {"code": "GE Area 3A", "name": "", "units": 3, "flexible": true},
          {"code": "GE Area 4 + US 1 or US 2-3", "name": "", "units": 3, "flexible": true},
          {"code": "MATH 33LA", "name": "Differential Equations and Linear Algebra", "units": 3}
        ]
      }
    },
    "year3": {
      "fall": {
        "semester": "Year 3 Fall",
        "total_units": 15,
        "courses": [
          {"code": "CMPE 110", "name": "Electronics for Computing Systems", "units": 3},
          {"code": "CMPE 124", "name": "Digital Design I", "units": 3},
          {"code": "CMPE 126", "name": "Algorithms and Data Structure Design", "units": 3},
          {"code": "ENGR 100W", "name": "Engineering Reports", "units": 3, "ge": "GE Upper Division Area 2/5 + WID"},
          {"code": "ISE 130", "name": "Engineering Probability and Statistics", "units": 3}
        ]
      },
      "spring": {
        "semester": "Year 3 Spring",
        "total_units": 15,
        "notes": "Apply to Graduate",
        "courses": [
          {"code": "CMPE 102", "name": "Assembly Language Programming", "units": 3},
          {"code": "CMPE 125", "name": "Digital Design II", "units": 3},
          {"code": "CMPE 127", "name": "Microprocessor Design I", "units": 3},
          {"code": "CMPE 130", "name": "Advanced Algorithm Design", "units": 3},
          {"code": "CMPE 131", "name": "Software Engineering I", "units": 3}
        ]
      }
    },
    "year4": {
      "fall": {
        "semester": "Year 4 Fall",
        "total_units": 15,
        "courses": [
          {"code": "CMPE 140", "name": "Computer Architecture and Design", "units": 3},
          {"code": "CMPE 142", "name": "Operating Systems Design", "units": 3},
          {"code": "CMPE 148", "name": "Computer Networks I", "units": 3},
          {"code": "CMPE 152", "name": "Compiler Design", "units": 3},
          {"code": "CMPE 195A", "name": "Senior Design Project I", "units": 2, "ge": "GE Upper Division Area 4"},
          {"code": "ENGR 195A", "name": "Global and Social Issues in Engineering", "units": 1, "ge": "GE Upper Division Area 4"}
        ]
      },
      "spring": {
        "semester": "Year 4 Spring",
        "total_units": 14,
        "courses": [
          {"code": "CMPE 146", "name": "Real-Time Embedded System Co-Design", "units": 3},
          {"code": "CMPE 195B", "name": "Senior Design Project II", "units": 3, "ge": "GE Upper Division Area 3"},
          {"code": "ENGR 195B", "name": "Global and Social Issues in Engineering", "units": 1, "ge": "GE Upper Division Area 3"},
          {"code": "Technical Upper Division Elective", "name": "", "units": 3},
          {"code": "Technical Upper Division Elective", "name": "", "units": 3},
          {"code": "Technical Upper Division Elective", "name": "", "units": 1}
        ]
      }
    }
  }'::jsonb,
  E'*Courses marked with an asterisk may be taken in a different semester than listed.\n\nLower division courses should generally be taken in years 1-2, and upper division courses in years 3-4. Students must have completed 60+ units in order to enroll in Upper Division GE courses. Students should work with an academic advisor to create an individual roadmap using the MyPlanner tool.',
  E'A minimum 2.0 GPA in all required courses and technical electives taken at SJSU has been achieved.\nA minimum "C" in MATH 30, MATH 31, PHYS 50 and PHYS 51 has been achieved.\nA minimum "C-" in the remaining courses in preparation for the major as well as in all courses in requirements of the major has been achieved.\nA minimum "C" in CMPE 195A/CMPE 195B and ENGR 195A/ENGR 195B has been achieved.',
  120
)
ON CONFLICT (major_name, degree_type) DO NOTHING;

-- ============================================================================
-- ROADMAP 3: Computer Science, BS
-- ============================================================================

INSERT INTO roadmaps (
  major_name,
  degree_type,
  keywords,
  description,
  roadmap_data,
  notes,
  gpa_requirements,
  total_units
) VALUES (
  'Computer Science',
  'BS',
  ARRAY['computer science', 'cs', 'comp sci', 'compsci'],
  'The following roadmap is a sample advising map to complete the degree program in four years.',
  '{
    "year1": {
      "fall": {
        "semester": "Year 1 Fall",
        "total_units": 16,
        "courses": [
          {"code": "CS 46A", "name": "Introduction to Programming", "units": 4},
          {"code": "MATH 30", "name": "Calculus I", "units": 3, "ge": "GE Area 2"},
          {"code": "MATH 42", "name": "Discrete Mathematics", "units": 3},
          {"code": "GE Area 1A", "name": "Recommended ENGL 1A - First Year Writing", "units": 3},
          {"code": "GE Area 4 + US 1 or US 2-3", "name": "", "units": 3, "flexible": true}
        ]
      },
      "spring": {
        "semester": "Year 1 Spring",
        "total_units": 15,
        "courses": [
          {"code": "CS 46B", "name": "Introduction to Data Structures", "units": 4},
          {"code": "MATH 31", "name": "Calculus II", "units": 3, "ge": "GE Area 2"},
          {"code": "GE Area 4 + US 1 or US 2-3", "name": "", "units": 3, "flexible": true},
          {"code": "GE Area 1B", "name": "", "units": 3, "flexible": true},
          {"code": "Physical Education", "name": "", "units": 1, "flexible": true}
        ]
      }
    },
    "year2": {
      "fall": {
        "semester": "Year 2 Fall",
        "total_units": 16,
        "notes": "Complete the Upper Division Writing - Directed Self Placement",
        "courses": [
          {"code": "CS 47", "name": "Introduction to Computer Systems", "units": 3},
          {"code": "CS 146", "name": "Data Structures and Algorithms", "units": 3},
          {"code": "Approved Science Elective", "name": "Recommended PHYS 50, GEOL 1 OR GEOL 7", "units": 4, "ge": "GE Areas 5A + 5C"},
          {"code": "GE Area 1C", "name": "", "units": 3, "flexible": true},
          {"code": "GE Area 3A", "name": "", "units": 3, "flexible": true}
        ]
      },
      "spring": {
        "semester": "Year 2 Spring",
        "total_units": 15,
        "courses": [
          {"code": "CS 147", "name": "Computer Architecture", "units": 3},
          {"code": "CS 151", "name": "Object-Oriented Design", "units": 3},
          {"code": "MATH 39", "name": "Linear Algebra I", "units": 3},
          {"code": "Computer Science Elective", "name": "", "units": 3},
          {"code": "GE Area 3B", "name": "", "units": 3, "flexible": true}
        ]
      }
    },
    "year3": {
      "fall": {
        "semester": "Year 3 Fall",
        "total_units": 14,
        "courses": [
          {"code": "CS 149", "name": "Operating Systems", "units": 3},
          {"code": "Approved Science Elective", "name": "Recommended BIOL 30", "units": 4, "ge": "GE Areas 5B + 5C"},
          {"code": "Upper Division Computer Science Elective", "name": "", "units": 3},
          {"code": "GE Area 6", "name": "", "units": 3, "flexible": true},
          {"code": "Physical Education", "name": "", "units": 1, "flexible": true}
        ]
      },
      "spring": {
        "semester": "Year 3 Spring",
        "total_units": 15,
        "notes": "Apply to Graduate",
        "courses": [
          {"code": "CS 152", "name": "Programming Paradigms", "units": 3},
          {"code": "PHIL 134", "name": "Computers, Ethics and Society", "units": 3, "ge": "GE UD Area 3"},
          {"code": "CS 100W", "name": "Technical Writing Workshop", "units": 3, "ge": "WID"},
          {"code": "MATH 32/142/161A", "name": "Calculus III, Intro to Combinatorics, OR Applied Probability", "units": 3},
          {"code": "Upper Division Computer Science Elective", "name": "", "units": 3}
        ]
      }
    },
    "year4": {
      "fall": {
        "semester": "Year 4 Fall",
        "total_units": 15,
        "courses": [
          {"code": "CS 157A", "name": "Introduction to Database Management Systems", "units": 3},
          {"code": "CS 160", "name": "Software Engineering", "units": 3},
          {"code": "CS 166", "name": "Information Security", "units": 3},
          {"code": "Upper Division Computer Science Elective", "name": "", "units": 3},
          {"code": "GE UD Area 2/5", "name": "", "units": 3, "flexible": true}
        ]
      },
      "spring": {
        "semester": "Year 4 Spring",
        "total_units": 14,
        "courses": [
          {"code": "CS 154", "name": "Formal Languages and Computability", "units": 3},
          {"code": "Upper Division Computer Science Elective", "name": "", "units": 5},
          {"code": "GE UD Area 4", "name": "", "units": 3, "flexible": true},
          {"code": "University Elective", "name": "", "units": 3}
        ]
      }
    }
  }'::jsonb,
  E'*Courses marked with an asterisk may be taken in a different semester than listed.\n\nLower division courses should generally be taken in years 1-2, and upper division courses in years 3-4. Students must have completed 60+ units in order to enroll in Upper Division GE courses. Students should work with an academic advisor to create an individual roadmap using the MyPlanner tool.\n\nThis plan assumes readiness for calculus and for an introductory CS course. At least one CS electives should be chosen from the following list: CS 116A, CS 116B, CS 122, CS 123A, CS 123B, CS 131, CS 133, CS 134, CS 136, CS 144, CS 153, CS 155, CS 156, CS 157B, CS 157C, CS 158A, CS 158B, CS 159, CS 161, CS 168, CS 171, CS 174, CS 175, or CS 176.\n\nMath 42 is a strict prerequisite for CS 146, so it should be taken no later than concurrently with CS 46B. We recommend Math 32 for students interested in computer graphics or video game courses, and Math 142 or Math 161A for other students.',
  E'A minimum of 120 units is required for this degree.',
  120
)
ON CONFLICT (major_name, degree_type) DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Roadmap migration completed successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added roadmaps:';
  RAISE NOTICE '  1. Software Engineering, BS';
  RAISE NOTICE '  2. Computer Engineering, BS';
  RAISE NOTICE '  3. Computer Science, BS';
  RAISE NOTICE '';
  RAISE NOTICE 'Total roadmaps in database: %', (SELECT COUNT(*) FROM roadmaps);
  RAISE NOTICE '============================================';
END $$;
