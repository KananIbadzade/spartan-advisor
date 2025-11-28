import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, User } from 'lucide-react';

interface Suggestion {
  id: string;
  content: string | null;
  created_at: string;
  courses: {
    course_code: string;
    course_number: string;
    title: string;
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

  useEffect(() => {
    if (studentId) {
      loadSuggestions();
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
          created_at,
          courses:course_id (
            course_code,
            course_number,
            title
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      console.log('Suggestions loaded:', data);
      console.log('Suggestions error:', error);

      if (error) {
        console.error('Error loading suggestions:', error);
        return;
      }

      setSuggestions(data || []);
    } catch (error) {
      console.error('Caught error loading suggestions:', error);
    } finally {
      setLoading(false);
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
            ? `Course recommendations for ${studentName || 'student'}`
            : 'Course recommendations from your advisor'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading suggestions...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No course suggestions yet</p>
            {currentUserRole === 'advisor' && (
              <p className="text-sm mt-1">Add a course suggestion above to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                {suggestion.courses && (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {suggestion.courses.course_code} {suggestion.courses.course_number}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm">{suggestion.courses.title}</h4>
                    </div>
                  </div>
                )}

                {suggestion.content && (
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-sm leading-relaxed">{suggestion.content}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Advisor recommendation</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadSuggestions}
              className="w-full text-muted-foreground"
            >
              Refresh suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};