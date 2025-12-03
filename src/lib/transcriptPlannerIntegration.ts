/**
 * Integration between transcript parsing and course planner
 * Handles auto-populating planner with completed courses from transcript
 */

import { supabase } from '@/integrations/supabase/client';

export interface TranscriptCourse {
  code: string;
  title?: string;
  units?: number;
  grade?: string;
  semester?: string;
  year?: string;
}

interface PlannerCourse {
  term: string;
  year: string;
  course_id: string;
  term_order: number;
  position: number;
}

/**
 * Parse semester string from transcript (e.g., "Fall 2023") into term and year
 */
function parseSemester(semester: string | undefined): { term: string | null; year: string | null } {
  if (!semester) return { term: null, year: null };

  const match = semester.match(/(Fall|Spring|Summer|Winter)\s+(\d{4})/i);
  if (!match) return { term: null, year: null };

  return {
    term: match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(), // Capitalize
    year: match[2]
  };
}

/**
 * Get term order for sorting (used by planner)
 */
function getTermOrder(term: string, year: string): number {
  const termOrderMap: { [key: string]: number } = {
    'Spring': 1,
    'Summer': 2,
    'Fall': 3,
    'Winter': 4
  };
  const baseOrder = parseInt(year) * 10;
  return baseOrder + (termOrderMap[term] || 0);
}

/**
 * Find course ID by course code (e.g., "CS 46A")
 */
async function findCourseId(courseCode: string): Promise<string | null> {
  try {
    // Parse course code like "CS 46A" into code "CS" and number "46A"
    const match = courseCode.trim().match(/^([A-Z]{2,4})\s*(\d{1,3}[A-Z]?)$/i);
    if (!match) {
      console.warn(`Invalid course code format: ${courseCode}`);
      return null;
    }

    const [, code, number] = match;

    // Try to find existing course
    const { data, error } = await supabase
      .from('courses')
      .select('id')
      .ilike('course_code', code)
      .ilike('course_number', number)
      .single();

    if (data && !error) {
      return data.id;
    }

    console.warn(`Course not found in database: ${courseCode}`);
    return null;
  } catch (error) {
    console.error(`Error finding course ID for ${courseCode}:`, error);
    return null;
  }
}

/**
 * Auto-populate planner with courses from uploaded transcript
 */
export async function autoPopulatePlannerFromTranscript(userId: string, planId: string): Promise<{
  success: boolean;
  added: number;
  skipped: number;
  errors: string[];
}> {
  try {
    console.log('Starting auto-populate from transcript...');

    // 1. Get transcript data
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .select('parsed_data')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (transcriptError || !transcriptData || !transcriptData.parsed_data) {
      console.error('No transcript data found');
      return { success: false, added: 0, skipped: 0, errors: ['No transcript data found'] };
    }

    const transcriptCourses = transcriptData.parsed_data as TranscriptCourse[];
    console.log(`Found ${transcriptCourses.length} courses in transcript`);

    // 2. Get existing plan courses to avoid duplicates
    const { data: existingPlanCourses } = await supabase
      .from('plan_courses')
      .select('course_id, term, year')
      .eq('plan_id', planId);

    const existingCourseIds = new Set((existingPlanCourses || []).map(pc => pc.course_id));

    // 3. Process each transcript course
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const transcriptCourse of transcriptCourses) {
      try {
        // Parse semester FIRST (move this to the top of the loop)
        const { term, year } = parseSemester(transcriptCourse.semester);
        if (!term || !year) {
          skipped++;
          errors.push(`Could not parse semester for: ${transcriptCourse.code}`);
          console.warn(`Skipping ${transcriptCourse.code} - no semester info`);
          continue;
        }

        // Find course ID from database
        const courseId = await findCourseId(transcriptCourse.code);

        if (!courseId) {
          skipped++;
          errors.push(`Course not found in database: ${transcriptCourse.code}`);
          console.warn(`Skipping ${transcriptCourse.code} - not in database`);
          continue;
        }

        // Check if already in plan
        if (existingCourseIds.has(courseId)) {
          skipped++;
          console.log(`Course already in plan: ${transcriptCourse.code}`);
          continue;
        }

        // Calculate term order and position
        const termOrder = getTermOrder(term, year);

        // Check max position in term
        const { data: maxPositionData } = await supabase
          .from('plan_courses')
          .select('position')
          .eq('plan_id', planId)
          .eq('term', term)
          .eq('year', year)
          .order('position', { ascending: false })
          .limit(1)
          .single();

        const maxPosition = maxPositionData?.position || 0;

        // Add to plan
        const { error: insertError } = await supabase
          .from('plan_courses')
          .insert({
            plan_id: planId,
            course_id: courseId,
            term,
            year,
            term_order: termOrder,
            position: maxPosition + 1,
            status: 'draft'
          });

        if (insertError) {
          errors.push(`Failed to add ${transcriptCourse.code}: ${insertError.message}`);
          skipped++;
        } else {
          added++;
          existingCourseIds.add(courseId);
          console.log(`Added ${transcriptCourse.code} to ${term} ${year}`);
        }
      } catch (error: any) {
        errors.push(`Error processing ${transcriptCourse.code}: ${error.message}`);
        skipped++;
      }
    }

    console.log(`Auto-populate complete: ${added} added, ${skipped} skipped`);
    return { success: true, added, skipped, errors };
  } catch (error: any) {
    console.error('Error in autoPopulatePlannerFromTranscript:', error);
    return { success: false, added: 0, skipped: 0, errors: [error.message] };
  }
}

/**
 * Check if a course code is in the user's transcript (completed)
 */
export async function isCourseCompleted(userId: string, courseCode: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('transcripts')
      .select('parsed_data')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (!data || !data.parsed_data) return false;

    const transcriptCourses = data.parsed_data as TranscriptCourse[];
    return transcriptCourses.some(course =>
      course.code.toLowerCase() === courseCode.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking if course is completed:', error);
    return false;
  }
}

/**
 * Get all completed course codes from transcript
 */
export async function getCompletedCourseCodes(userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('transcripts')
      .select('parsed_data')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (!data || !data.parsed_data) return [];

    const transcriptCourses = data.parsed_data as TranscriptCourse[];
    return transcriptCourses.map(course => `${course.code}`);
  } catch (error) {
    console.error('Error getting completed course codes:', error);
    return [];
  }
}
