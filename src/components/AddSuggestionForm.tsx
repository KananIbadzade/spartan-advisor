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
  department_id: string | null;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface AddSuggestionFormProps {
  studentId: string;
  studentName?: string;
  onSubmit: (courseId: string, content?: string, term?: string, year?: string) => Promise<void>;
  onCancel?: () => void;
}

export const AddSuggestionForm: React.FC<AddSuggestionFormProps> = ({
  studentId,
  studentName,
  onSubmit,
  onCancel
}) => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [content, setContent] = useState('');
  const [term, setTerm] = useState('');
  const [year, setYear] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load departments
      const { data: deptsData, error: deptsError } = await supabase
        .from('departments')
        .select('id, code, name')
        .order('code');
      
      if (deptsError) throw deptsError;
      setDepartments(deptsData || []);

      // Load courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, course_code, course_number, title, units, department_id')
        .order('course_code', { ascending: true })
        .order('course_number', { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourseId) {
      setError('Please select a course');
      return;
    }

    if (!studentId) {
      setError('Student ID is required');
      return;
    }

    const trimmedContent = content.trim();

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
      await onSubmit(
        selectedCourseId,
        trimmedContent || undefined,
        term || undefined,
        year || undefined
      );

      // Clear form on success
      setSelectedCourseId('');
      // Don't clear department so they can add another course from same dept easily
      setContent('');
      setTerm('');
      setYear('');
    } catch (err) {
      console.error('AddSuggestionForm error:', err);
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
    setSelectedDepartmentId('');
    setContent('');
    setTerm('');
    setYear('');
    setError(null);
    onCancel?.();
  };

  const selectedCourse = courses.find(course => course.id === selectedCourseId);
  
  // Filter courses by selected department
  const filteredCourses = selectedDepartmentId 
    ? courses.filter(c => c.department_id === selectedDepartmentId)
    : [];

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
            <Label htmlFor="dept-select">Subject *</Label>
            <Select
              value={selectedDepartmentId}
              onValueChange={(val) => {
                setSelectedDepartmentId(val);
                setSelectedCourseId(''); // Reset course when dept changes
              }}
              disabled={isSubmitting || isLoading}
            >
              <SelectTrigger id="dept-select">
                <SelectValue placeholder={isLoading ? "Loading..." : "Select a subject"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.code} - {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-select">Course *</Label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={isSubmitting || isLoading || !selectedDepartmentId}
            >
              <SelectTrigger id="course-select">
                <SelectValue placeholder={
                  !selectedDepartmentId 
                    ? "Select a subject first" 
                    : filteredCourses.length === 0 
                      ? "No courses found" 
                      : "Select a course"
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredCourses.map((course) => (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term-select">
                Suggested Term (Optional)
              </Label>
              <Select
                value={term}
                onValueChange={setTerm}
                disabled={isSubmitting}
              >
                <SelectTrigger id="term-select">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year-input">
                Suggested Year (Optional)
              </Label>
              <Select
                value={year}
                onValueChange={setYear}
                disabled={isSubmitting}
              >
                <SelectTrigger id="year-input">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              disabled={isSubmitting || !selectedCourseId || isLoading}
            >
              {isSubmitting ? 'Saving...' : 'Add Suggestion'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
