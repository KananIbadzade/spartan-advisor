import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdvisorNotes, AdvisorNote } from '@/lib/advisorNotesService';
import { MessageSquare, Calendar, User } from 'lucide-react';

interface DisplayNotesProps {
  studentId: string;
  studentName?: string;
  maxHeight?: string;
}

export const DisplayNotes: React.FC<DisplayNotesProps> = ({
  studentId,
  studentName,
  maxHeight = "400px"
}) => {
  const [notes, setNotes] = useState<AdvisorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [studentId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedNotes = await getAdvisorNotes(studentId);
      setNotes(fetchedNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
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

  // Refresh function that can be called from parent components
  const refreshNotes = () => {
    loadNotes();
  };

  // Expose refresh function via ref or callback if needed
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    refreshNotes
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Advisor Notes {studentName && `for ${studentName}`}
          </CardTitle>
          <CardDescription>Loading notes...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
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
            <MessageSquare className="w-5 h-5" />
            Advisor Notes {studentName && `for ${studentName}`}
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
          <MessageSquare className="w-5 h-5" />
          Advisor Notes {studentName && `for ${studentName}`}
        </CardTitle>
        <CardDescription>
          {notes.length === 0
            ? 'No notes yet'
            : `${notes.length} note${notes.length === 1 ? '' : 's'}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No advisor notes yet</p>
            <p className="text-sm">Notes will appear here when advisors add them</p>
          </div>
        ) : (
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-4">
              {notes.map((note, index) => (
                <div key={note.id}>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Advisor</span>
                        <Badge variant="outline" className="text-xs">
                          Note
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(note.created_at)}
                      </div>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </div>
                  </div>
                  {index < notes.length - 1 && (
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

export default DisplayNotes;