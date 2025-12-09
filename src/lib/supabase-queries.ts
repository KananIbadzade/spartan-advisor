/**
 * Supabase database queries for SJSU course data and roadmaps
 * Uses existing courses and prerequisites tables from the database
 */

import { supabase } from '@/integrations/supabase/client';

// Matches existing database schema
export interface Course {
  id: string;
  course_code: string;      // e.g., "CS"
  course_number: string;    // e.g., "46A"
  title: string;
  units: number;
  description: string | null;
  department_id: string | null;
  prerequisites?: string[]; // Computed from prerequisites table
  corequisites?: string[];  // Computed from prerequisites table
}

// Helper to get full course code (e.g., "CS 46A")
export function getFullCourseCode(course: Course): string {
  return `${course.course_code} ${course.course_number}`;
}

export interface Roadmap {
  id: number;
  major_name: string;
  degree_type: string;
  keywords: string[];
  description: string;
  roadmap_data: any; // JSON structure with year/semester/courses
  notes: string;
  gpa_requirements: string;
  total_units: number;
}

/**
 * Get a specific course by its code (e.g., "CMPE 133" or "CS 46A")
 */
export async function getCourseInfo(courseCode: string): Promise<Course | null> {
  try {
    // Parse course code like "CMPE 133" into code "CMPE" and number "133"
    const match = courseCode.trim().match(/^([A-Z]{2,4})\s*(\d{1,3}[A-Z]?)$/i);

    if (!match) {
      console.error('Invalid course code format:', courseCode);
      return null;
    }

    const [, code, number] = match;

    // Query course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .ilike('course_code', code)
      .ilike('course_number', number)
      .single();

    if (courseError || !courseData) {
      console.error('Error fetching course:', courseError);
      return null;
    }

    // Query prerequisites
    const { data: prereqData } = await supabase
      .from('prerequisites')
      .select(`
        prerequisite_course_id,
        is_corequisite,
        prerequisite:courses!prerequisites_prerequisite_course_id_fkey(course_code, course_number)
      `)
      .eq('course_id', courseData.id);

    // Build prerequisites and corequisites arrays
    const prerequisites: string[] = [];
    const corequisites: string[] = [];

    prereqData?.forEach((p: any) => {
      if (p.prerequisite) {
        const fullCode = `${p.prerequisite.course_code} ${p.prerequisite.course_number}`;
        if (p.is_corequisite) {
          corequisites.push(fullCode);
        } else {
          prerequisites.push(fullCode);
        }
      }
    });

    return {
      ...courseData,
      prerequisites,
      corequisites
    };
  } catch (error) {
    console.error('Error in getCourseInfo:', error);
    return null;
  }
}

/**
 * Search for courses by keyword (searches code, title, and description)
 */
export async function searchCourses(keyword: string): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .or(`course_code.ilike.%${keyword}%,course_number.ilike.%${keyword}%,title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .limit(10);

    if (error) {
      console.error('Error searching courses:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchCourses:', error);
    return [];
  }
}

/**
 * Get multiple courses by their codes (e.g., ["CMPE 133", "CS 46A"])
 */
export async function getCoursesByCodes(courseCodes: string[]): Promise<Course[]> {
  try {
    const courses: Course[] = [];

    // Fetch each course individually (since we need to parse code + number)
    for (const courseCode of courseCodes) {
      const course = await getCourseInfo(courseCode);
      if (course) {
        courses.push(course);
      }
    }

    return courses;
  } catch (error) {
    console.error('Error in getCoursesByCodes:', error);
    return [];
  }
}

/**
 * Extract course codes from text (e.g., "CMPE 133", "CS 46A")
 */
export function extractCourseCodes(text: string): string[] {
  // Match patterns like "CMPE 133", "CS 46A", "MATH 30"
  const matches = text.match(/[A-Z]{2,4}\s*\d{1,3}[A-Z]?/gi);

  if (!matches) return [];

  // Normalize: uppercase and single space
  return [...new Set(matches.map(code => code.toUpperCase().replace(/\s+/g, ' ')))];
}

/**
 * Build context string from course data for AI prompt
 */
export function buildCourseContext(courses: Course[]): string {
  if (courses.length === 0) return '';

  let context = 'Relevant SJSU Course Information:\n\n';

  courses.forEach(course => {
    const fullCode = getFullCourseCode(course);
    context += `${fullCode} - ${course.title}\n`;
    context += `Units: ${course.units}\n`;

    if (course.prerequisites && course.prerequisites.length > 0) {
      context += `Prerequisites: ${course.prerequisites.join(', ')}\n`;
    }

    if (course.corequisites && course.corequisites.length > 0) {
      context += `Corequisites: ${course.corequisites.join(', ')}\n`;
    }

    if (course.description) {
      context += `Description: ${course.description}\n`;
    }

    context += '\n';
  });

  return context;
}

// ============================================================================
// ROADMAP QUERIES
// ============================================================================

/**
 * Search for roadmaps by major keyword
 * First tries exact match on major_name, then searches keywords array
 */
export async function searchRoadmaps(keyword: string): Promise<Roadmap[]> {
  try {
    // First try exact match on major_name (case-insensitive)
    const { data: exactMatch, error: exactError } = await supabase
      .from('roadmaps')
      .select('*')
      .ilike('major_name', keyword)
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      return exactMatch;
    }

    // If no exact match, search in keywords array
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .contains('keywords', [keyword])
      .limit(5);

    if (error) {
      console.error('Error searching roadmaps:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchRoadmaps:', error);
    return [];
  }
}

/**
 * Get a roadmap by exact major name
 */
export async function getRoadmapByMajor(majorName: string): Promise<Roadmap | null> {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .ilike('major_name', majorName)
      .single();

    if (error) {
      console.error('Error fetching roadmap:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getRoadmapByMajor:', error);
    return null;
  }
}

/**
 * Extract major keywords from text
 * Orders patterns from most specific to least specific to avoid false matches
 */
export function extractMajorKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();

  // Common major keywords - ORDER MATTERS! Most specific first to avoid false matches
  const majorPatterns = [
    { keywords: ['software engineering', 'software eng'], major: 'software engineering' },
    { keywords: ['computer science', 'comp sci', 'compsci'], major: 'computer science' },
    { keywords: ['computer engineering', 'comp eng'], major: 'computer engineering' },
    { keywords: ['electrical engineering', 'elect eng'], major: 'electrical engineering' },
    { keywords: ['mechanical engineering', 'mech eng'], major: 'mechanical engineering' },
    { keywords: ['business administration'], major: 'business' },
  ];

  for (const pattern of majorPatterns) {
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword)) {
        keywords.push(pattern.major);
        break; // Only add once per major
      }
    }
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Build context string from roadmap data for AI prompt
 */
export function buildRoadmapContext(roadmap: Roadmap): string {
  let context = `SJSU ${roadmap.major_name}, ${roadmap.degree_type} - 4-Year Roadmap\n\n`;
  context += `${roadmap.description}\n\n`;

  // Parse the roadmap_data JSON
  const data = roadmap.roadmap_data;

  // Iterate through years
  for (let year = 1; year <= 4; year++) {
    const yearKey = `year${year}`;
    if (!data[yearKey]) continue;

    context += `=== Year ${year} ===\n\n`;

    // Fall semester
    if (data[yearKey].fall) {
      const fall = data[yearKey].fall;
      context += `${fall.semester} (${fall.total_units} units)\n`;
      if (fall.notes) context += `Note: ${fall.notes}\n`;
      fall.courses.forEach((course: any) => {
        context += `  - ${course.code}`;
        if (course.name) context += `: ${course.name}`;
        context += ` (${course.units} units)`;
        if (course.ge) context += ` [${course.ge}]`;
        if (course.note) context += ` [${course.note}]`;
        context += '\n';
      });
      context += '\n';
    }

    // Spring semester
    if (data[yearKey].spring) {
      const spring = data[yearKey].spring;
      context += `${spring.semester} (${spring.total_units} units)\n`;
      if (spring.notes) context += `Note: ${spring.notes}\n`;
      spring.courses.forEach((course: any) => {
        context += `  - ${course.code}`;
        if (course.name) context += `: ${course.name}`;
        context += ` (${course.units} units)`;
        if (course.ge) context += ` [${course.ge}]`;
        if (course.note) context += ` [${course.note}]`;
        context += '\n';
      });
      context += '\n';
    }
  }

  // Add notes and requirements
  if (roadmap.notes) {
    context += `Important Notes:\n${roadmap.notes}\n\n`;
  }

  if (roadmap.gpa_requirements) {
    context += `GPA Requirements:\n${roadmap.gpa_requirements}\n\n`;
  }

  context += `Total Units Required: ${roadmap.total_units}\n`;

  return context;
}

// ============================================================================
// USER PROFILE QUERIES
// ============================================================================

/**
 * Get the current authenticated user's major from their profile
 * Returns null if user is not authenticated or major is not set
 */
export async function getCurrentUserMajor(): Promise<string | null> {
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    // Get user's profile with major field
    const { data, error } = await supabase
      .from('profiles')
      .select('major')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!data || !data.major) {
      console.log('User profile exists but major is not set');
      return null;
    }

    console.log(`Detected user major: ${data.major}`);
    return data.major; // e.g., "Computer Science", "Software Engineering"
  } catch (error) {
    console.error('Error in getCurrentUserMajor:', error);
    return null;
  }
}

/**
 * Get completed courses from user's uploaded transcript
 * Returns array of course codes like ["CS 46A", "MATH 30", "CMPE 131"]
 */
export async function getCompletedCoursesFromTranscript(): Promise<string[]> {
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('No authenticated user found');
      return [];
    }

    // Get user's most recent transcript
    const { data, error } = await supabase
      .from('transcripts')
      .select('parsed_data')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data || !data.parsed_data) {
      console.log('No transcript found or no parsed data');
      return [];
    }

    const parsedData = data.parsed_data as any;

    // Extract completed courses from parsed data
    // Format depends on how the transcript parser stores data
    // Common formats:
    // - parsedData.courses = [{ code: "CS 46A", grade: "A" }, ...]
    // - parsedData = [{ courseCode: "CS 46A", ... }, ...]

    const completedCourses: string[] = [];

    // Try different possible data structures
    if (Array.isArray(parsedData)) {
      // If parsed_data is directly an array of courses
      parsedData.forEach((course: any) => {
        const courseCode = course.code || course.courseCode || course.course_code ||
                          (course.course_code && course.course_number ?
                            `${course.course_code} ${course.course_number}` : null);
        if (courseCode) {
          completedCourses.push(courseCode);
        }
      });
    } else if (parsedData.courses && Array.isArray(parsedData.courses)) {
      // If parsed_data has a courses array
      parsedData.courses.forEach((course: any) => {
        const courseCode = course.code || course.courseCode || course.course_code ||
                          (course.course_code && course.course_number ?
                            `${course.course_code} ${course.course_number}` : null);
        if (courseCode) {
          completedCourses.push(courseCode);
        }
      });
    }

    console.log(`Found ${completedCourses.length} completed courses from transcript`);
    return completedCourses;
  } catch (error) {
    console.error('Error in getCompletedCoursesFromTranscript:', error);
    return [];
  }
}

/**
 * Build context string about user's completed courses
 */
export function buildCompletedCoursesContext(completedCourses: string[]): string {
  if (completedCourses.length === 0) {
    return '';
  }

  return `Student's Completed Courses (from transcript):\n${completedCourses.join(', ')}\n\n`;
}
