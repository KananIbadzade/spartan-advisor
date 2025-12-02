import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, User, CheckCircle, XCircle, Archive, Calendar } from 'lucide-react';

interface Suggestion {
  id: string;
  content: string | null;
  status: 'pending' | 'accepted' | 'declined';
  term: string | null;
  year: string | null;
  archived: boolean;
  created_at: string;
  course_id: string;
  courses: {
    id: string;
    course_code: string;
    course_number: string;
    title: string;
    units: number;
  } | null;
}

interface DisplaySuggestionsProps {
  studentId: string;
  studentName?: string;
  currentUserRole: 'advisor' | 'student';
}

export const DisplaySuggestions = ({ studentId, studentName, currentUserRole }: DisplaySuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (studentId) {
      loadSuggestions();

      // Subscribe to real-time changes for suggestions
      const channel = supabase
        .channel(`advisor_suggestions_${studentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'advisor_suggestions',
            filter: `student_id=eq.${studentId}`
          },
          (payload) => {
            console.log('Suggestion changed, reloading...', payload);
            loadSuggestions();
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Removing channel subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [studentId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      console.log('Loading suggestions for student:', studentId);

      const { data, error } = await supabase
        .from('advisor_suggestions')
        .select(`
          id,
          content,
          status,
          term,
          year,
          archived,
          created_at,
          course_id,
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

      console.log('Suggestions loaded:', data);
      console.log('Suggestions error:', error);

      if (error) {
        console.error('Error loading suggestions:', error);

        // Check if it's a column-not-found error (migration not run)
        if (error.message && (error.message.includes('column') || error.message.includes('does not exist'))) {
          toast({
            title: 'Database Migration Required',
            description: 'Please run the suggestions enhancement migration in Supabase.',
            variant: 'destructive'
          });
        }
        return;
      }

      // Filter based on role
      let filteredData = data as any || [];

      if (currentUserRole === 'student') {
        // Students only see pending suggestions (accepted/declined ones are removed from view)
        filteredData = filteredData.filter((s: Suggestion) =>
          s.status === 'pending' && !s.archived
        );
      } else {
        // Advisors see all non-archived suggestions
        filteredData = filteredData.filter((s: Suggestion) => !s.archived);
      }

      setSuggestions(filteredData);
    } catch (error) {
      console.error('Caught error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: Suggestion) => {
    if (!suggestion.courses) return;

    try {
      // Get the student's current plan
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: plans } = await supabase
        .from('student_plans')
        .select('id')
        .eq('student_id', user.id)
        .single();

      if (!plans) {
        toast({
          title: 'No Plan Found',
          description: 'Please create a plan first',
          variant: 'destructive'
        });
        return;
      }

      // Determine term and year - use suggestion's term/year if available
      const targetTerm = suggestion.term || 'Fall';
      const targetYear = suggestion.year || new Date().getFullYear().toString();

      // Calculate term_order
      const termOrders: Record<string, number> = {
        'Spring': 0,
        'Summer': 1,
        'Fall': 2,
        'Winter': 3
      };
      const term_order = termOrders[targetTerm] || 2;

      // Get max position for this semester
      const { data: existingCourses } = await supabase
        .from('plan_courses')
        .select('position')
        .eq('plan_id', plans.id)
        .eq('term', targetTerm)
        .eq('year', targetYear);

      const maxPosition = existingCourses && existingCourses.length > 0
        ? Math.max(...existingCourses.map(c => c.position))
        : 0;

      // Add course to plan with 'approved' status
      const { error: insertError } = await supabase
        .from('plan_courses')
        .insert({
          plan_id: plans.id,
          course_id: suggestion.courses.id,
          term: targetTerm,
          year: targetYear,
          term_order,
          position: maxPosition + 1,
          status: 'approved'  // Pre-approved since advisor suggested it
        });

      if (insertError) throw insertError;

      // Update suggestion status to accepted
      const { error: statusError } = await supabase
        .from('advisor_suggestions')
        .update({ status: 'accepted' })
        .eq('id', suggestion.id);

      if (statusError) throw statusError;

      toast({
        title: 'Suggestion Accepted!',
        description: `${suggestion.courses.course_code} ${suggestion.courses.course_number} has been added to your ${targetTerm} ${targetYear} plan with approved status.`,
      });

      loadSuggestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeclineSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('advisor_suggestions')
        .update({ status: 'declined' })
        .eq('id', suggestionId);

      if (error) throw error;

      toast({
        title: 'Suggestion Declined',
        description: 'The course suggestion has been declined.'
      });

      loadSuggestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleArchiveSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('advisor_suggestions')
        .update({ archived: true })
        .eq('id', suggestionId);

      if (error) throw error;

      toast({
        title: 'Suggestion Archived',
        description: 'The suggestion has been archived and hidden from view.'
      });

      loadSuggestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('advisor_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) throw error;

      toast({
        title: 'Suggestion Deleted',
        description: 'The suggestion has been permanently deleted.'
      });

      loadSuggestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Course Suggestions
        </CardTitle>
        <CardDescription>
          {currentUserRole === 'advisor'
            ? `Course suggestions for ${studentName || 'this student'}`
            : 'Courses recommended by your advisor'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No course suggestions yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                {suggestion.courses && (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {suggestion.courses.course_code} {suggestion.courses.course_number}
                        </Badge>
                        <Badge
                          variant={
                            suggestion.status === 'pending'
                              ? 'outline'
                              : suggestion.status === 'accepted'
                              ? 'default'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {suggestion.status}
                        </Badge>
                        {suggestion.term && suggestion.year && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <Calendar className="w-3 h-3 mr-1" />
                            {suggestion.term} {suggestion.year}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{suggestion.courses.title}</h4>
                      <p className="text-xs text-muted-foreground">{suggestion.courses.units} units</p>
                    </div>
                  </div>
                )}

                {suggestion.content && (
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-sm leading-relaxed">{suggestion.content}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Advisor recommendation</span>
                  </div>
                </div>

                {/* Student actions for pending suggestions */}
                {currentUserRole === 'student' && suggestion.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="flex-1 gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Accept & Add to Plan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineSuggestion(suggestion.id)}
                      className="flex-1 gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      Decline
                    </Button>
                  </div>
                )}

                {/* Advisor actions */}
                {currentUserRole === 'advisor' && suggestion.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSuggestion(suggestion.id)}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <XCircle className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                )}
                {currentUserRole === 'advisor' && suggestion.status === 'accepted' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchiveSuggestion(suggestion.id)}
                      className="gap-1"
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </Button>
                  </div>
                )}
                {currentUserRole === 'advisor' && suggestion.status === 'declined' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSuggestion(suggestion.id)}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <XCircle className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {currentUserRole === 'student'
                ? 'Accepting a suggestion will add the course to your plan with approved status.'
                : `Showing ${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}. Delete pending/declined suggestions or archive accepted ones to clean up this view.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
