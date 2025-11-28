import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, GripVertical, ShoppingCart, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { z } from 'zod';
import { ChatbotWidget } from '@/components/ChatbotWidget';

// Import your new components
import { CourseCart, useCourseCart } from '@/components/CourseCart';
import { ConflictIndicator, useConflictDetection } from '@/components/ConflictDetector';
import { CourseTypeBadge, ColorCodedCourseCard, CourseTypeLegend, useCourseTypeFilter } from '@/components/CourseColorCoding';
import { SchedulePDFExporter } from '@/components/SchedulePDFExporter';

const planCourseSchema = z.object({
  term: z.enum(['Fall', 'Spring', 'Summer'], {
    errorMap: () => ({ message: 'Please select a valid term (Fall, Spring, or Summer)' })
  }),
  year: z.string()
    .regex(/^\d{4}$/, 'Year must be a 4-digit number')
    .refine((val) => {
      const year = parseInt(val);
      return year >= 2000 && year <= 2050;
    }, 'Year must be between 2000 and 2050')
});

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Course {
  id: string;
  course_code: string;
  course_number: string;
  title: string;
  units: number;
  department_id: string | null;
  type?: any; // Course type for color coding
}

interface PlanCourse {
  id: string;
  plan_id: string;
  course_id: string;
  term: string;
  year: string;
  term_order: number;
  position: number;
  courses: Course;
}

interface TermGroup {
  term: string;
  year: string;
  term_order: number;
  courses: PlanCourse[];
}

const Planner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planCourses, setPlanCourses] = useState<PlanCourse[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [terms, setTerms] = useState<TermGroup[]>([]);
  const [user, setUser] = useState<any>(null);

  // Add term dialog state
  const [addTermOpen, setAddTermOpen] = useState(false);
  const [newTermName, setNewTermName] = useState('Fall');
  const [newTermYear, setNewTermYear] = useState('2024');

  // Add course dialog state
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // New feature integrations
  const { isOpen: isCartOpen, toggleCart } = useCourseCart();
  const { conflicts, hasConflicts } = useConflictDetection(planCourses);
  const { selectedTypes, filteredCourses, toggleType } = useCourseTypeFilter(planCourses);
  const [showPDFExport, setShowPDFExport] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadPlan();
    loadAllCourses();
    loadDepartments();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    organizeCoursesByTerm();
  }, [planCourses]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('plan-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_courses'
        },
        () => {
          loadPlan();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Get or create plan
      let { data: plans } = await supabase
        .from('student_plans')
        .select('*')
        .eq('student_id', user.id);

      if (!plans || plans.length === 0) {
        // Create a new plan
        const { data: newPlan, error: createError } = await supabase
          .from('student_plans')
          .insert({ student_id: user.id, name: 'My Academic Plan' })
          .select()
          .single();

        if (createError) throw createError;
        setPlanId(newPlan.id);
      } else {
        setPlanId(plans[0].id);
      }

      // Load plan courses with enhanced data for conflict detection
      if (plans && plans.length > 0) {
        const { data: courses } = await supabase
          .from('plan_courses')
          .select(`
            *,
            courses(
              *,
              departments(code, name)
            )
          `)
          .eq('plan_id', plans[0].id)
          .order('term_order')
          .order('position');

        // Add course types and sample schedule data for demo
        const enhancedCourses = (courses || []).map(course => ({
          ...course,
          courses: {
            ...course.courses,
            type: determineCourseType(course.courses),
            schedule: generateSampleSchedule(course.courses)
          }
        }));

        setPlanCourses(enhancedCourses);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine course type based on course code
  const determineCourseType = (course: any) => {
    if (course.course_code === 'CS') return 'major-requirement';
    if (course.course_code === 'MATH') return 'prerequisite';
    if (course.course_code === 'ENGL') return 'general-education';
    return 'free-elective';
  };

  // Generate sample schedule for conflict detection demo
  const generateSampleSchedule = (course: any) => {
    const schedules = [
      [{ day: 'Monday', startTime: '10:00 AM', endTime: '11:15 AM', room: 'ENG 101' }],
      [{ day: 'Tuesday', startTime: '2:00 PM', endTime: '3:15 PM', room: 'SCI 201' }],
      [{ day: 'Wednesday', startTime: '10:00 AM', endTime: '11:15 AM', room: 'ENG 102' }]
    ];
    return schedules[Math.floor(Math.random() * schedules.length)];
  };

  const loadAllCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('course_code');

    setAllCourses(data || []);
  };

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('code');

    setDepartments(data || []);
  };

  const organizeCoursesByTerm = () => {
    const termMap = new Map<string, TermGroup>();

    planCourses.forEach(pc => {
      const key = `${pc.year}-${pc.term}`;
      if (!termMap.has(key)) {
        termMap.set(key, {
          term: pc.term,
          year: pc.year,
          term_order: pc.term_order,
          courses: []
        });
      }
      termMap.get(key)!.courses.push(pc);
    });

    const sortedTerms = Array.from(termMap.values()).sort((a, b) => a.term_order - b.term_order);
    setTerms(sortedTerms);
  };

  const handleAddCourse = async () => {
    if (!planId || !selectedCourseId || !selectedTerm || !selectedYear) {
      toast({
        title: 'Missing information',
        description: 'Please select a course and term',
        variant: 'destructive',
      });
      return;
    }

    try {
      const validatedData = planCourseSchema.parse({
        term: selectedTerm,
        year: selectedYear
      });

      const termOrderMap: { [key: string]: number } = {
        'Spring': 1,
        'Summer': 2,
        'Fall': 3,
        'Winter': 4
      };
      const baseOrder = parseInt(validatedData.year) * 10;
      const termOrder = baseOrder + (termOrderMap[validatedData.term] || 0);

      const coursesInTerm = planCourses.filter(
        pc => pc.term === validatedData.term && pc.year === validatedData.year
      );
      const maxPosition = coursesInTerm.length > 0
        ? Math.max(...coursesInTerm.map(pc => pc.position))
        : -1;

      const { error } = await supabase
        .from('plan_courses')
        .insert({
          plan_id: planId,
          course_id: selectedCourseId,
          term: validatedData.term,
          year: validatedData.year,
          term_order: termOrder,
          position: maxPosition + 1
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course added to plan',
      });

      setAddCourseOpen(false);
      setSelectedDepartmentId('');
      setSelectedCourseId('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course from your plan?')) return;

    try {
      const { error } = await supabase
        .from('plan_courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course removed from plan',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Convert plan data for PDF export
  const getExportData = () => {
    const exportCourses = planCourses.map(pc => ({
      id: pc.id,
      course_code: pc.courses.course_code,
      course_number: pc.courses.course_number || '',
      title: pc.courses.title,
      units: pc.courses.units,
      term: pc.term,
      year: pc.year,
      type: pc.courses.type || 'free-elective',
      schedule: pc.courses.schedule,
      instructor: 'TBA'
    }));

    return {
      courses: exportCourses,
      studentInfo: {
        name: 'Student',
        studentId: 'N/A',
        major: 'Computer Science',
        totalUnits: exportCourses.reduce((sum, c) => sum + c.units, 0)
      }
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const activeCourse = activeDragId
    ? planCourses.find(pc => pc.id === activeDragId)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">Course Planner</h1>
                <p className="text-sm text-primary-foreground/80">Build your academic roadmap</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="gap-2" onClick={toggleCart}>
                <ShoppingCart className="w-4 h-4" />
                Cart
              </Button>
              <Button variant="secondary" className="gap-2" onClick={() => setShowPDFExport(true)}>
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Course
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Course</DialogTitle>
                    <DialogDescription>Select a course and term to add to your plan</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={selectedDepartmentId} onValueChange={(value) => {
                        setSelectedDepartmentId(value);
                        setSelectedCourseId('');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.code} - {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Course</Label>
                      <Select
                        value={selectedCourseId}
                        onValueChange={setSelectedCourseId}
                        disabled={!selectedDepartmentId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedDepartmentId ? "Select a course" : "Select a subject first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {allCourses
                            .filter(course => course.department_id === selectedDepartmentId)
                            .map(course => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.course_code} - {course.title} ({course.units} units)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Term</Label>
                        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                          <SelectTrigger>
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
                        <Label>Year</Label>
                        <Input
                          type="number"
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          placeholder="2024"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddCourseOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddCourse}>Add Course</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Course Type Legend and Filters */}
        {planCourses.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Types</CardTitle>
                <CardDescription>Filter your courses by type</CardDescription>
              </CardHeader>
              <CardContent>
                <CourseTypeLegend layout="horizontal" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conflict Alerts */}
        {hasConflicts && (
          <div className="mb-6">
            <ConflictIndicator conflicts={conflicts} />
          </div>
        )}

        {terms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No courses in your plan yet</p>
              <Button onClick={() => setAddCourseOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Course
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {terms.map((term) => (
              <TermCard key={`${term.year}-${term.term}`} term={term} onDeleteCourse={handleDeleteCourse} />
            ))}
          </div>
        )}
      </main>

      {/* Course Cart */}
      <CourseCart
        isOpen={isCartOpen}
        onToggle={toggleCart}
        onFinalizePlan={async (courses) => {
          toast({
            title: "Plan Finalized",
            description: `${courses.length} courses added to your plan!`
          });
        }}
      />

      {/* PDF Export Dialog */}
      {showPDFExport && (
        <Dialog open={showPDFExport} onOpenChange={setShowPDFExport}>
          <DialogContent className="max-w-2xl">
            <SchedulePDFExporter
              courses={getExportData().courses}
              studentInfo={getExportData().studentInfo}
              onExport={(success) => {
                if (success) {
                  toast({
                    title: "Export Successful",
                    description: "Schedule exported successfully!"
                  });
                }
                setShowPDFExport(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <ChatbotWidget />
    </div>
  );
};

interface TermCardProps {
  term: TermGroup;
  onDeleteCourse: (courseId: string) => void;
}

const TermCard = ({ term, onDeleteCourse }: TermCardProps) => {
  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardHeader>
        <CardTitle>{term.term} {term.year}</CardTitle>
        <CardDescription>
          {term.courses.reduce((sum, c) => sum + c.courses.units, 0)} total units
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 min-h-[60px]">
          {term.courses.map(planCourse => (
            <ColorCodedCourseCard
              key={planCourse.id}
              course={{
                id: planCourse.id,
                course_code: planCourse.courses.course_code,
                course_number: planCourse.courses.course_number || '',
                title: planCourse.courses.title,
                units: planCourse.courses.units,
                type: planCourse.courses.type || 'free-elective'
              }}
              className="cursor-pointer"
            >
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteCourse(planCourse.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </ColorCodedCourseCard>
          ))}
          {term.courses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No courses in this term
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Planner;
