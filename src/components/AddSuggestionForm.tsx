import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  course_code: string;
  course_number: string;
  title: string;
  units: number;
}

interface AddSuggestionFormProps {
  studentId: string;
  studentName?: string;
  onSubmit: (courseId: string, content?: string) => Promise<void>;
  onCancel?: () => void;
}

export const AddSuggestionForm: React.FC<AddSuggestionFormProps> = ({
  studentId,
  studentName,
  onSubmit,
  onCancel
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [content, setContent] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoadingCourses(true);
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, course_code, course_number, title, units')
        .order('course_code', { ascending: true })
        .order('course_number', { ascending: true });

      if (coursesError) {
        throw new Error('Failed to load courses');
      }

      setCourses(coursesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced Validation
    if (!selectedCourseId) {
      setError('Please select a course');
      return;
    }

    if (!studentId) {
      setError('Student ID is required');
      return;
    }

    const trimmedContent = content.trim();

    // Optional content validation (if provided)
    if (trimmedContent && trimmedContent.length > 1000) {
      setError('Reason/notes cannot exceed 1000 characters');
      return;
    }

    if (trimmedContent && trimmedContent.length < 5) {
      setError('If providing a reason, please write at least 5 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(selectedCourseId, trimmedContent || undefined);

      // Clear form on success
      setSelectedCourseId('');
      setContent('');
    } catch (err) {
      console.error('AddSuggestionForm error:', err);

      // Enhanced error handling
      if (err instanceof Error) {
        if (err.message.includes('not assigned')) {
          setError('You are not authorized to suggest courses for this student');
        } else if (err.message.includes('logged in')) {
          setError('Please log in to add course suggestions');
        } else if (err.message.includes('already suggested')) {
          setError('You have already suggested this course to this student');
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
    setSelectedCourseId('');
    setContent('');
    setError(null);
    onCancel?.();
  };

  const selectedCourse = courses.find(course => course.id === selectedCourseId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Add Course Suggestion {studentName && `for ${studentName}`}
        </CardTitle>
        <CardDescription>
          Recommend a course for this student to take
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-select">
              Course *
            </Label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={isSubmitting || isLoadingCourses}
            >
              <SelectTrigger id="course-select">
                <SelectValue placeholder={isLoadingCourses ? "Loading courses..." : "Select a course"} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_code} {course.course_number} - {course.title} ({course.units} units)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourse && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedCourse.course_code} {selectedCourse.course_number} - {selectedCourse.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestion-content">
              Reason/Notes (Optional)
            </Label>
            <Textarea
              id="suggestion-content"
              rows={3}
              placeholder="Why do you recommend this course? (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {content.length} characters
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
              disabled={isSubmitting || !selectedCourseId || isLoadingCourses}
            >
              {isSubmitting ? 'Saving...' : 'Add Suggestion'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};