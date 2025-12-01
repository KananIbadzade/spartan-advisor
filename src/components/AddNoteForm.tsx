import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddNoteFormProps {
  studentId: string;
  studentName?: string;
  onSubmit: (noteContent: string) => Promise<void>;
  onCancel?: () => void;
}

export const AddNoteForm: React.FC<AddNoteFormProps> = ({
  studentId,
  studentName,
  onSubmit,
  onCancel
}) => {
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced Validation
    const trimmedContent = noteContent.trim();

    if (!trimmedContent) {
      setError('Note content is required');
      return;
    }

    if (trimmedContent.length < 10) {
      setError('Note content must be at least 10 characters long');
      return;
    }

    if (trimmedContent.length > 2000) {
      setError('Note content cannot exceed 2000 characters');
      return;
    }

    if (!studentId) {
      setError('Student ID is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(trimmedContent);
      setNoteContent(''); // Clear form on success
    } catch (err) {
      console.error('AddNoteForm error:', err);

      // Enhanced error handling
      if (err instanceof Error) {
        if (err.message.includes('not assigned')) {
          setError('You are not authorized to add notes for this student');
        } else if (err.message.includes('logged in')) {
          setError('Please log in to add notes');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNoteContent('');
    setError(null);
    onCancel?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Add Note {studentName && `for ${studentName}`}
        </CardTitle>
        <CardDescription>
          Add a note or comment about this student's progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-content">
              Note Content *
            </Label>
            <Textarea
              id="note-content"
              rows={4}
              placeholder="Enter your note about the student..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-muted-foreground">
              {noteContent.length} characters
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !noteContent.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};