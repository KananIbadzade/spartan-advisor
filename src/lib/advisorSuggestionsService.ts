import { supabase } from '@/integrations/supabase/client';

export interface AdvisorSuggestion {
  id: string;
  advisor_id: string;
  student_id: string;
  course_id: string;
  content: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface AdvisorSuggestionWithCourse extends AdvisorSuggestion {
  courses: {
    id: string;
    course_code: string;
    course_number: string;
    title: string;
    units: number;
  };
}

export interface CreateSuggestionData {
  student_id: string;
  course_id: string;
  content?: string;
}

export const addAdvisorSuggestion = async (suggestionData: CreateSuggestionData): Promise<AdvisorSuggestion> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to add suggestions');
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('advisor_assignments')
    .select('id')
    .eq('advisor_id', user.id)
    .eq('student_id', suggestionData.student_id)
    .single();

  if (assignmentError || !assignment) {
    throw new Error('You are not assigned to this student');
  }

  const { data: suggestion, error: insertError } = await supabase
    .from('advisor_suggestions')
    .insert({
      advisor_id: user.id,
      student_id: suggestionData.student_id,
      course_id: suggestionData.course_id,
      content: suggestionData.content || null
    })
    .select()
    .single();

  if (insertError) {
    console.error('Database error:', insertError);
    throw new Error('Failed to save suggestion to database');
  }

  return suggestion;
};

export const getAdvisorSuggestions = async (studentId: string): Promise<AdvisorSuggestionWithCourse[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to view suggestions');
  }

  const { data: suggestions, error: suggestionsError } = await supabase
    .from('advisor_suggestions')
    .select(`
      id,
      advisor_id,
      student_id,
      course_id,
      content,
      status,
      created_at,
      updated_at,
      courses:course_id (
        id,
        course_code,
        course_number,
        title,
        units
      )
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (suggestionsError) {
    console.error('Database error:', suggestionsError);
    throw new Error('Failed to fetch suggestions');
  }

  return suggestions || [];
};

export const getSuggestionsForAdvisor = async (): Promise<AdvisorSuggestionWithCourse[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to view suggestions');
  }

  const { data: suggestions, error: suggestionsError } = await supabase
    .from('advisor_suggestions')
    .select(`
      id,
      advisor_id,
      student_id,
      course_id,
      content,
      status,
      created_at,
      updated_at,
      courses:course_id (
        id,
        course_code,
        course_number,
        title,
        units
      )
    `)
    .eq('advisor_id', user.id)
    .order('created_at', { ascending: false });

  if (suggestionsError) {
    console.error('Database error:', suggestionsError);
    throw new Error('Failed to fetch suggestions');
  }

  return suggestions || [];
};

export const updateSuggestionStatus = async (
  suggestionId: string,
  newStatus: 'accepted' | 'declined'
): Promise<AdvisorSuggestion> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to update suggestions');
  }

  const { data: suggestion, error: updateError } = await supabase
    .from('advisor_suggestions')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', suggestionId)
    .eq('student_id', user.id) // Only students can update their own suggestions
    .select()
    .single();

  if (updateError) {
    console.error('Database error:', updateError);
    throw new Error('Failed to update suggestion status');
  }

  return suggestion;
};