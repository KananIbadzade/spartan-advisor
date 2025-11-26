import { supabase } from '@/integrations/supabase/client';

export interface AdvisorNote {
  id: string;
  advisor_id: string;
  student_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  student_id: string;
  content: string;
}

export const addAdvisorNote = async (noteData: CreateNoteData): Promise<AdvisorNote> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to add notes');
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('advisor_assignments')
    .select('id')
    .eq('advisor_id', user.id)
    .eq('student_id', noteData.student_id)
    .single();

  if (assignmentError || !assignment) {
    throw new Error('You are not assigned to this student');
  }

  const { data: note, error: insertError } = await supabase
    .from('advisor_notes')
    .insert({
      advisor_id: user.id,
      student_id: noteData.student_id,
      content: noteData.content.trim()
    })
    .select()
    .single();

  if (insertError) {
    console.error('Database error:', insertError);
    throw new Error('Failed to save note to database');
  }

  return note;
};

export const getAdvisorNotes = async (studentId: string): Promise<AdvisorNote[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to view notes');
  }

  const { data: notes, error: notesError } = await supabase
    .from('advisor_notes')
    .select('id, advisor_id, student_id, content, created_at, updated_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (notesError) {
    console.error('Database error:', notesError);
    throw new Error('Failed to fetch notes');
  }

  return notes || [];
};