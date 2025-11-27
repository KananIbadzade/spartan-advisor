import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BookOpen, GraduationCap, Star, AlertCircle, Users, Zap } from 'lucide-react';

export type CourseType =
  | 'major-requirement'
  | 'major-elective'
  | 'general-education'
  | 'prerequisite'
  | 'free-elective'
  | 'corequisite';

export interface CourseTypeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
  description: string;
}

// Course type configurations with colors and styling
export const courseTypeConfigs: Record<CourseType, CourseTypeConfig> = {
  'major-requirement': {
    label: 'Major Requirement',
    color: 'bg-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Required courses for your major'
  },
  'major-elective': {
    label: 'Major Elective',
    color: 'bg-blue-400',
    bgColor: 'bg-blue-25',
    borderColor: 'border-blue-100',
    textColor: 'text-blue-700',
    icon: <BookOpen className="w-4 h-4" />,
    description: 'Elective courses within your major'
  },
  'general-education': {
    label: 'General Education',
    color: 'bg-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    icon: <Users className="w-4 h-4" />,
    description: 'General education requirements'
  },
  'prerequisite': {
    label: 'Prerequisite',
    color: 'bg-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    icon: <AlertCircle className="w-4 h-4" />,
    description: 'Required before taking other courses'
  },
  'free-elective': {
    label: 'Free Elective',
    color: 'bg-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    icon: <Star className="w-4 h-4" />,
    description: 'Courses of your choice'
  },
  'corequisite': {
    label: 'Corequisite',
    color: 'bg-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    icon: <Zap className="w-4 h-4" />,
    description: 'Must be taken with another course'
  }
};

// Course type badge component
interface CourseTypeBadgeProps {
  type: CourseType;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'solid';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const CourseTypeBadge: React.FC<CourseTypeBadgeProps> = ({
  type,
  size = 'md',
  variant = 'default',
  showIcon = true,
  showLabel = true,
  className
}) => {
  const config = courseTypeConfigs[type];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'solid':
        return `${config.color} text-white`;
      case 'outline':
        return `border ${config.borderColor} ${config.textColor} bg-transparent`;
      default:
        return `${config.bgColor} ${config.textColor} ${config.borderColor}`;
    }
  };

  return (
    <Badge
      className={cn(
        'flex items-center gap-1 font-medium border',
        sizeClasses[size],
        getVariantClasses(),
        className
      )}
    >
      {showIcon && config.icon}
      {showLabel && config.label}
    </Badge>
  );
};

// Course card with color coding
interface ColorCodedCourseCardProps {
  course: {
    id: string;
    course_code: string;
    course_number: string;
    title: string;
    units: number;
    type: CourseType;
    description?: string;
  };
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ColorCodedCourseCard: React.FC<ColorCodedCourseCardProps> = ({
  course,
  children,
  onClick,
  className
}) => {
  const config = courseTypeConfigs[course.type];

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all hover:shadow-md border-l-4',
        config.bgColor,
        config.borderColor,
        'border-l-current',
        className
      )}
      onClick={onClick}
      style={{ borderLeftColor: config.color.replace('bg-', '#') }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">
              {course.course_code} {course.course_number}
            </span>
            <CourseTypeBadge type={course.type} size="sm" />
          </div>
          <Badge variant="outline" className="text-xs">
            {course.units} units
          </Badge>
        </div>

        <h3 className="font-medium text-base line-clamp-1">{course.title}</h3>

        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}

        {children}
      </div>
    </Card>
  );
};

// Legend component to show all course types
interface CourseTypeLegendProps {
  types?: CourseType[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  showDescriptions?: boolean;
}

export const CourseTypeLegend: React.FC<CourseTypeLegendProps> = ({
  types = Object.keys(courseTypeConfigs) as CourseType[],
  layout = 'grid',
  showDescriptions = false
}) => {
  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-2',
    vertical: 'space-y-2',
    grid: 'grid grid-cols-2 md:grid-cols-3 gap-3'
  };

  return (
    <div className={layoutClasses[layout]}>
      {types.map(type => (
        <div key={type} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: courseTypeConfigs[type].color.replace('bg-', '#') }}
          />
          <div className="flex-1">
            <span className="text-sm font-medium">{courseTypeConfigs[type].label}</span>
            {showDescriptions && (
              <p className="text-xs text-muted-foreground">
                {courseTypeConfigs[type].description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Utility function to determine course type
export const determineCourseType = (
  course: any,
  userMajor?: string,
  isGeneralEd?: boolean,
  isPrerequisite?: boolean
): CourseType => {
  // This is a basic example - you'd implement your own logic
  if (isPrerequisite) return 'prerequisite';
  if (isGeneralEd) return 'general-education';

  // Check if it's major related (simplified logic)
  if (userMajor && course.course_code?.startsWith(userMajor)) {
    // You could have more sophisticated logic here
    return 'major-requirement'; // or 'major-elective'
  }

  return 'free-elective';
};

// Hook for managing course type filtering
export const useCourseTypeFilter = (courses: any[]) => {
  const [selectedTypes, setSelectedTypes] = React.useState<CourseType[]>(
    Object.keys(courseTypeConfigs) as CourseType[]
  );

  const filteredCourses = React.useMemo(() => {
    return courses.filter(course =>
      selectedTypes.includes(course.type || 'free-elective')
    );
  }, [courses, selectedTypes]);

  const toggleType = (type: CourseType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes(Object.keys(courseTypeConfigs) as CourseType[]);
  };

  const selectOnly = (type: CourseType) => {
    setSelectedTypes([type]);
  };

  return {
    selectedTypes,
    filteredCourses,
    toggleType,
    clearFilters,
    selectOnly
  };
};