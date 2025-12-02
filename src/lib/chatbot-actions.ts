/**
 * Chatbot Actions - Functions the AI can call to modify the course planner
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Get or create the user's active plan
 */
export async function getUserPlanId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get existing plan
    const { data: plans } = await supabase
      .from('student_plans')
      .select('id')
      .eq('student_id', user.id)
      .limit(1);

    if (plans && plans.length > 0) {
      return plans[0].id;
    }

    // Create new plan if none exists
    const { data: newPlan, error } = await supabase
      .from('student_plans')
      .insert({ student_id: user.id, name: 'My Academic Plan' })
      .select('id')
      .single();

    if (error) throw error;
    return newPlan.id;
  } catch (error) {
    console.error('Error getting plan ID:', error);
    return null;
  }
}

/**
 * Find course ID by course code (e.g., "CMPE 133")
 */
async function findCourseIdByCode(courseCode: string): Promise<string | null> {
  try {
    const match = courseCode.trim().match(/^([A-Z]{2,4})\s*(\d{1,3}[A-Z]?)$/i);
    if (!match) return null;

    const [, code, number] = match;

    const { data } = await supabase
      .from('courses')
      .select('id')
      .ilike('course_code', code)
      .ilike('course_number', number)
      .single();

    return data?.id || null;
  } catch (error) {
    console.error('Error finding course:', error);
    return null;
  }
}

/**
 * Calculate term order for sorting
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
 * Add a course to the user's planner
 */
export async function addCourseToPlan(
  courseCode: string,
  term: string,
  year: string
): Promise<{ success: boolean; message: string }> {
  try {
    const planId = await getUserPlanId();
    if (!planId) {
      return { success: false, message: 'No active plan found. Please create a plan first.' };
    }

    // Find course by code
    const courseId = await findCourseIdByCode(courseCode);
    if (!courseId) {
      return { success: false, message: `Course ${courseCode} not found in database.` };
    }

    // Check if already in plan
    const { data: existing } = await supabase
      .from('plan_courses')
      .select('id')
      .eq('plan_id', planId)
      .eq('course_id', courseId);

    if (existing && existing.length > 0) {
      return { success: false, message: `${courseCode} is already in your plan.` };
    }

    // Get courses in same term to calculate position
    const { data: coursesInTerm } = await supabase
      .from('plan_courses')
      .select('position')
      .eq('plan_id', planId)
      .eq('term', term)
      .eq('year', year);

    const position = coursesInTerm ? coursesInTerm.length : 0;
    const termOrder = getTermOrder(term, year);

    // Add to plan
    const { error } = await supabase
      .from('plan_courses')
      .insert({
        plan_id: planId,
        course_id: courseId,
        term: term,
        year: year,
        term_order: termOrder,
        position: position
      });

    if (error) throw error;

    return { success: true, message: `Successfully added ${courseCode} to ${term} ${year}!` };
  } catch (error: any) {
    console.error('Error adding course to plan:', error);
    return { success: false, message: `Failed to add course: ${error.message}` };
  }
}

/**
 * Remove a course from the user's planner
 */
export async function removeCourseFromPlan(
  courseCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const planId = await getUserPlanId();
    if (!planId) {
      return { success: false, message: 'No active plan found.' };
    }

    // Find course by code
    const courseId = await findCourseIdByCode(courseCode);
    if (!courseId) {
      return { success: false, message: `Course ${courseCode} not found.` };
    }

    // Delete from plan
    const { error, count } = await supabase
      .from('plan_courses')
      .delete({ count: 'exact' })
      .eq('plan_id', planId)
      .eq('course_id', courseId);

    if (error) throw error;

    if (count === 0) {
      return { success: false, message: `${courseCode} is not in your plan.` };
    }

    return { success: true, message: `Successfully removed ${courseCode} from your plan!` };
  } catch (error: any) {
    console.error('Error removing course from plan:', error);
    return { success: false, message: `Failed to remove course: ${error.message}` };
  }
}

/**
 * Get all courses currently in the user's plan
 */
export async function getCoursesInPlan(): Promise<{ success: boolean; courses: any[]; message?: string }> {
  try {
    const planId = await getUserPlanId();
    if (!planId) {
      return { success: false, courses: [], message: 'No active plan found.' };
    }

    const { data, error } = await supabase
      .from('plan_courses')
      .select(`
        term,
        year,
        courses (
          course_code,
          course_number,
          title,
          units
        )
      `)
      .eq('plan_id', planId)
      .order('term_order');

    if (error) throw error;

    const courses = (data || []).map(pc => ({
      code: `${pc.courses.course_code} ${pc.courses.course_number}`,
      title: pc.courses.title,
      units: pc.courses.units,
      term: pc.term,
      year: pc.year
    }));

    return { success: true, courses };
  } catch (error: any) {
    console.error('Error getting plan courses:', error);
    return { success: false, courses: [], message: `Failed to get courses: ${error.message}` };
  }
}

/**
 * Move a course to a different semester/year in the user's plan
 */
export async function moveCourseToSemester(
  courseCode: string,
  newTerm: string,
  newYear: string
): Promise<{ success: boolean; message: string }> {
  try {
    const planId = await getUserPlanId();
    if (!planId) {
      return { success: false, message: 'No active plan found.' };
    }

    // Find course by code
    const courseId = await findCourseIdByCode(courseCode);
    if (!courseId) {
      return { success: false, message: `Course ${courseCode} not found.` };
    }

    // Check if course is in the plan
    const { data: existingCourse } = await supabase
      .from('plan_courses')
      .select('id, term, year')
      .eq('plan_id', planId)
      .eq('course_id', courseId)
      .single();

    if (!existingCourse) {
      return { success: false, message: `${courseCode} is not in your plan. Use 'add' to add it first.` };
    }

    // Check if course already exists in the target semester
    const { data: conflictingCourse } = await supabase
      .from('plan_courses')
      .select('id')
      .eq('plan_id', planId)
      .eq('course_id', courseId)
      .eq('term', newTerm)
      .eq('year', newYear);

    if (conflictingCourse && conflictingCourse.length > 0) {
      return { success: false, message: `${courseCode} is already in ${newTerm} ${newYear}.` };
    }

    // Get courses in new term to calculate position
    const { data: coursesInNewTerm } = await supabase
      .from('plan_courses')
      .select('position')
      .eq('plan_id', planId)
      .eq('term', newTerm)
      .eq('year', newYear);

    const newPosition = coursesInNewTerm ? coursesInNewTerm.length : 0;
    const newTermOrder = getTermOrder(newTerm, newYear);

    const oldTerm = existingCourse.term;
    const oldYear = existingCourse.year;

    // Update the course with new semester info
    const { error } = await supabase
      .from('plan_courses')
      .update({
        term: newTerm,
        year: newYear,
        term_order: newTermOrder,
        position: newPosition
      })
      .eq('plan_id', planId)
      .eq('course_id', courseId);

    if (error) throw error;

    return {
      success: true,
      message: `Successfully moved ${courseCode} from ${oldTerm} ${oldYear} to ${newTerm} ${newYear}!`
    };
  } catch (error: any) {
    console.error('Error moving course:', error);
    return { success: false, message: `Failed to move course: ${error.message}` };
  }
}
