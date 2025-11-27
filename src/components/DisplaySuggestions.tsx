import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Course {
  id: string;
  course_code: string;
  course_number: string;
  title: string;
  units: number;
}

interface AdvisorSuggestion {
  id: string;
  advisor_id: string;
  student_id: string;
  course_id: string;
  content: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  courses?: Course;
}

interface DisplaySuggestionsProps {
  studentId: string;
  studentName?: string;
  currentUserRole?: 'student' | 'advisor' | 'admin';
  maxHeight?: string;
  onStatusUpdate?: (suggestionId: string, newStatus: 'accepted' | 'declined') => Promise<void>;
}

export const DisplaySuggestions: React.FC<DisplaySuggestionsProps> = ({
  studentId,
  studentName,
  currentUserRole = 'student',
  maxHeight = "400px",
  onStatusUpdate
}) => {
  const [suggestions, setSuggestions] = useState<AdvisorSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, [studentId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      // This will be implemented with the service function
      // For now, using placeholder
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (suggestionId: string, newStatus: 'accepted' | 'declined') => {
    if (!onStatusUpdate) return;

    try {
      setUpdatingId(suggestionId);
      await onStatusUpdate(suggestionId, newStatus);

      // Update local state
      setSuggestions(prev =>
        prev.map(suggestion =>
          suggestion.id === suggestionId
            ? { ...suggestion, status: newStatus, updated_at: new Date().toISOString() }
            : suggestion
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update suggestion');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default' as const;
      case 'declined':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const canUpdateStatus = currentUserRole === 'student' || currentUserRole === 'admin';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Course Suggestions {studentName && `for ${studentName}`}
          </CardTitle>
          <CardDescription>Loading suggestions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Course Suggestions {studentName && `for ${studentName}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Course Suggestions {studentName && `for ${studentName}`}
        </CardTitle>
        <CardDescription>
          {suggestions.length === 0
            ? 'No course suggestions yet'
            : `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No course suggestions yet</p>
            <p className="text-sm">Suggestions from advisors will appear here</p>
          </div>
        ) : (
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div key={suggestion.id}>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Advisor Suggestion</span>
                        <Badge
                          variant={getStatusBadgeVariant(suggestion.status)}
                          className="flex items-center gap-1"
                        >
                          {getStatusIcon(suggestion.status)}
                          {suggestion.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(suggestion.created_at)}
                      </div>
                    </div>

                    {/* Course Information */}
                    <div className="bg-primary/5 rounded-md p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {suggestion.courses?.course_code} {suggestion.courses?.course_number}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.courses?.units} units
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mb-1">{suggestion.courses?.title}</p>
                    </div>

                    {/* Advisor's Notes */}
                    {suggestion.content && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Advisor's Notes:</p>
                        <p className="text-sm leading-relaxed">{suggestion.content}</p>
                      </div>
                    )}

                    {/* Action Buttons for Students */}
                    {canUpdateStatus && suggestion.status === 'pending' && (
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(suggestion.id, 'declined')}
                          disabled={updatingId === suggestion.id}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(suggestion.id, 'accepted')}
                          disabled={updatingId === suggestion.id}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>

                  {index < suggestions.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DisplaySuggestions;