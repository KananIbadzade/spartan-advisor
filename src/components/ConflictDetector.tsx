import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';

export interface CourseTime {
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
}

export interface Course {
  id: string;
  course_code: string;
  course_number: string;
  title: string;
  units: number;
  schedule?: CourseTime[];
  term: string;
  year: string;
}

export interface ConflictInfo {
  conflictingCourses: Course[];
  conflictDetails: {
    day: string;
    timeOverlap: string;
    courses: string[];
  }[];
}

// Utility functions for time conflict detection
export const timeUtils = {
  // Convert time string to minutes (e.g., "10:30 AM" -> 630)
  timeToMinutes(timeStr: string): number {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + (minutes || 0);

    if (period?.toUpperCase() === 'PM' && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period?.toUpperCase() === 'AM' && hours === 12) {
      totalMinutes = minutes || 0;
    }

    return totalMinutes;
  },

  // Check if two time ranges overlap
  timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
  },

  // Format overlap time for display
  formatOverlapTime(start1: string, end1: string, start2: string, end2: string): string {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);

    const overlapStart = Math.max(start1Min, start2Min);
    const overlapEnd = Math.min(end1Min, end2Min);

    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    return `${formatTime(overlapStart)} - ${formatTime(overlapEnd)}`;
  }
};

// Main conflict detection function
export const detectCourseConflicts = (courses: Course[]) => {
  if (!courses || courses.length === 0) return { conflicts: [], hasConflicts: false };

  const conflicts: ConflictInfo[] = [];
  const conflictMap = new Map<string, ConflictInfo>();

  // Group courses by term and year
  const coursesByTerm = courses.reduce((acc, course) => {
    const termKey = `${course.term}-${course.year}`;
    if (!acc[termKey]) acc[termKey] = [];
    acc[termKey].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  // Check conflicts within each term
  Object.values(coursesByTerm).forEach(termCourses => {
    for (let i = 0; i < termCourses.length; i++) {
      for (let j = i + 1; j < termCourses.length; j++) {
        const course1 = termCourses[i];
        const course2 = termCourses[j];

        if (!course1.schedule || !course2.schedule) continue;

        const conflictDetails: ConflictInfo['conflictDetails'] = [];

        // Check each schedule combination
        course1.schedule.forEach(sched1 => {
          course2.schedule!.forEach(sched2 => {
            if (sched1.day === sched2.day &&
                timeUtils.timesOverlap(sched1.startTime, sched1.endTime, sched2.startTime, sched2.endTime)) {

              conflictDetails.push({
                day: sched1.day,
                timeOverlap: timeUtils.formatOverlapTime(
                  sched1.startTime, sched1.endTime,
                  sched2.startTime, sched2.endTime
                ),
                courses: [
                  `${course1.course_code} ${course1.course_number}`,
                  `${course2.course_code} ${course2.course_number}`
                ]
              });
            }
          });
        });

        // If conflicts found, create or update conflict info
        if (conflictDetails.length > 0) {
          const conflictKey = [course1.id, course2.id].sort().join('-');

          if (!conflictMap.has(conflictKey)) {
            conflictMap.set(conflictKey, {
              conflictingCourses: [course1, course2],
              conflictDetails
            });
          }
        }
      }
    }
  });

  return Array.from(conflictMap.values());
};

// React component to display conflicts
interface ConflictIndicatorProps {
  conflicts: ConflictInfo[];
  variant?: 'compact' | 'detailed';
}

export const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  conflicts,
  variant = 'detailed'
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
      </Badge>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict, index) => (
        <Alert key={index} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">
                Schedule Conflict: {conflict.conflictingCourses.map(c =>
                  `${c.course_code} ${c.course_number}`
                ).join(' & ')}
              </div>

              {conflict.conflictDetails.map((detail, detailIndex) => (
                <div key={detailIndex} className="text-sm flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">{detail.day}</span>
                  <Clock className="w-3 h-3" />
                  <span>{detail.timeOverlap}</span>
                </div>
              ))}

              <div className="text-xs text-muted-foreground">
                These courses have overlapping class times and cannot be taken together.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

// Hook for using conflict detection
export const useConflictDetection = (courses: Course[]) => {
  const conflicts = React.useMemo(() => {
    return detectCourseConflicts(courses);
  }, [courses]);

  const hasConflicts = conflicts.length > 0;

  const getConflictsForCourse = (courseId: string) => {
    return conflicts.filter(conflict =>
      conflict.conflictingCourses.some(course => course.id === courseId)
    );
  };

  return {
    conflicts,
    hasConflicts,
    getConflictsForCourse
  };
};