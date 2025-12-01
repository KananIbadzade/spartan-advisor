import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, GripVertical, ShoppingCart, Download, Clock } from 'lucide-react';
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
import { CourseCart, useCourseCart, useCourseCartManager } from '@/components/CourseCart';
import { ConflictIndicator, useConflictDetection } from '@/components/ConflictDetector';
import { CourseTypeBadge, ColorCodedCourseCard, CourseTypeLegend, courseTypeConfigs, CourseType } from '@/components/CourseColorCoding';
import { SchedulePDFExporter } from '@/components/SchedulePDFExporter';
import { DisplayNotes, DisplaySuggestions } from '@/components/AdvisorNotes'; // adjust if needed

const planCourseSchema = z.object({
  term: z.enum(['Fall', 'Spring', 'Summer', 'Winter'], {
    errorMap: () => ({ message: 'Please select a valid term (Fall, Spring, Summer, or Winter)' })
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

interface CourseTime {
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
}

interface Course {
  id: string;
  course_code: string;
  course_number: string;
  title: string;
  units: number;
  department_id: string | null;
  type?: any; // Course type for color coding
  schedule?: CourseTime[]; // Class meeting times
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
  const [planStatus, setPlanStatus] = useState<'draft' | 'submitted' | 'approved' | 'declined'>('draft');
  const [planCourses, setPlanCourses] = useState<PlanCourse[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [terms, setTerms] = useState<TermGroup[]>([]);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [advisorNotes, setAdvisorNotes] = useState<any[]>([]);
  const [advisorSuggestions, setAdvisorSuggestions] = useState<any[]>([]);

  // Course type filtering state
  const [selectedTypes, setSelectedTypes] = useState<CourseType[]>(
    Object.keys(courseTypeConfigs) as CourseType[]
  );

  // Filter plan courses based on selected types
  const filteredPlanCourses = useMemo(() => {
    return planCourses.filter(planCourse => {
      const courseType = planCourse.courses.type || 'free-elective';
      return selectedTypes.includes(courseType);
    });
  }, [planCourses, selectedTypes]);

  // Toggle type filter
  const toggleType = (type: CourseType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTypes(Object.keys(courseTypeConfigs) as CourseType[]);
  };

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

  // Add missing PDF export state
  const [showPDFExport, setShowPDFExport] = useState(false);

  // New feature integrations
  const { isOpen: isCartOpen, toggleCart } = useCourseCart();
  const {
    cartItems,
    addCourse,
    removeCourse,
    clearCart,
    updateCoursePriority,
    updateCourseNotes
  } = useCourseCartManager();

  // Split-view drag state
  const [cartWidth, setCartWidth] = React.useState(380);
  const minWidth = 260;
  const maxWidth = 600;
  const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  const startDrag = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startWidth: cartWidth };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
    e.preventDefault();
  };

  const onDrag = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startX - e.clientX; // drag left increases width
    const next = Math.min(Math.max(dragRef.current.startWidth + delta, minWidth), maxWidth);
    setCartWidth(next);
  };

  const endDrag = () => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
  };

  // const sensors = useSensors(
  //   useSensor(PointerSensor, {
  //     activationConstraint: {
  //       distance: 8,
  //     },
  //   })
  // );

  useEffect(() => {
    loadPlan();
    loadAllCourses();
    loadDepartments();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, []);

  useEffect(() => {
    organizeCoursesByTerm();
  }, [filteredPlanCourses]);

  useEffect(() => {
    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (!error && data) setRole(data.role);
    };
    loadRole();
  }, []);

  useEffect(() => {
    if (!planId || !user) return;
    const loadAdvisorFeedback = async () => {
      // Fetch notes/suggestions by student_id instead of plan_id
      const { data: notes } = await supabase
        .from('advisor_notes')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      const { data: suggestions } = await supabase
        .from('advisor_suggestions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      setAdvisorNotes(notes || []);
      setAdvisorSuggestions(suggestions || []);
    };
    loadAdvisorFeedback();
  }, [planId, user]);

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
      const { data: plans } = await supabase
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
        setPlanStatus(newPlan.status || 'draft');
      } else {
        setPlanId(plans[0].id);
        setPlanStatus(plans[0].status || 'draft');
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

    // Use filtered courses instead of all planCourses
    filteredPlanCourses.forEach(pc => {
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

  // Instead of calling handleAddCourse (which writes directly to DB),
  // add a lightweight "Add to Cart" handler:
  const handleAddToCart = () => {
    if (!selectedCourseId || !selectedTerm || !selectedYear) {
      toast({
        title: 'Missing information',
        description: 'Please select a course and term',
        variant: 'destructive',
      });
      return;
    }

    const course = allCourses.find(c => c.id === selectedCourseId);
    if (!course) {
      toast({
        title: 'Error',
        description: 'Selected course not found',
        variant: 'destructive',
      });
      return;
    }

    addCourse(
      {
        id: course.id,
        course_code: course.course_code,
        course_number: course.course_number || '',
        title: course.title,
        units: course.units,
        term: selectedTerm,
        year: selectedYear,
      },
      'medium'
    );

    setAddCourseOpen(false);
    setSelectedDepartmentId('');
    setSelectedCourseId('');
    setSelectedTerm('');
    setSelectedYear('');
    toast({
      title: 'Added to Cart',
      description: `${course.course_code} added to your course cart`,
    });
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

  const addCourseDirectToPlan = async (course: Course, term: string, year: string) => {
    if (!planId) {
      toast({ title: 'No plan', description: 'Create a plan first', variant: 'destructive' });
      return;
    }
    try {
      // Simple validation
      planCourseSchema.parse({ term, year });

      const termOrderMap: { [key: string]: number } = { Spring: 1, Summer: 2, Fall: 3, Winter: 4 };
      const baseOrder = parseInt(year) * 10;
      const term_order = baseOrder + (termOrderMap[term] || 0);

      const coursesInTerm = planCourses.filter(pc => pc.term === term && pc.year === year);
      const maxPosition = coursesInTerm.length > 0 ? Math.max(...coursesInTerm.map(pc => pc.position)) : -1;

      const { error } = await supabase.from('plan_courses').insert({
        plan_id: planId,
        course_id: course.id,
        term,
        year,
        term_order,
        position: maxPosition + 1,
      });
      if (error) throw error;

      toast({ title: 'Added', description: `${course.course_code} added to ${term} ${year}` });
    } catch (err: any) {
      const msg = err instanceof z.ZodError ? err.errors[0].message : err.message;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  // Derive conflict detection from current plan (NOT cart)
  const { conflicts, hasConflicts } = useConflictDetection(
    planCourses.map(pc => ({
      id: pc.id,
      course_code: pc.courses.course_code,
      course_number: pc.courses.course_number || '',
      title: pc.courses.title,
      units: pc.courses.units,
      term: pc.term,
      year: pc.year,
      schedule: pc.courses.schedule || []
    }))
  );

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
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="gap-2 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-primary-foreground">Course Planner</h1>
                  <Badge
                    variant={
                      planStatus === 'submitted' ? 'default' :
                      planStatus === 'approved' ? 'default' :
                      planStatus === 'declined' ? 'destructive' :
                      'outline'
                    }
                    className={cn(
                      "text-xs font-medium",
                      planStatus === 'submitted' && "bg-yellow-500 hover:bg-yellow-600",
                      planStatus === 'approved' && "bg-green-500 hover:bg-green-600"
                    )}
                  >
                    {planStatus === 'submitted' && '⏳ Pending Approval'}
                    {planStatus === 'approved' && '✓ Approved'}
                    {planStatus === 'declined' && '✗ Declined'}
                    {planStatus === 'draft' && '📝 Draft'}
                  </Badge>
                </div>
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
                    <Button onClick={handleAddToCart}>Add to Cart</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Split layout when cart open */}
      <div className="flex w-full">
        <div className={isCartOpen ? 'flex-1 overflow-hidden' : 'flex-1'}>
          {/* Main planner content */}
          <main className="container mx-auto px-4 py-8">
            {/* Course Type Legend and Filters */}
            {planCourses.length > 0 && (
              <div className="mb-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Course Types</CardTitle>
                        <CardDescription>Click to filter your courses by type</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                      >
                        Show All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {(Object.keys(courseTypeConfigs) as CourseType[]).map(type => {
                        const config = courseTypeConfigs[type];
                        const isSelected = selectedTypes.includes(type);
                        return (
                          <button
                            key={type}
                            onClick={() => toggleType(type)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                              isSelected
                                ? `${config.bgColor} ${config.borderColor} ${config.textColor} font-medium`
                                : "bg-gray-50 border-gray-200 text-gray-400 opacity-50 hover:opacity-75"
                            )}
                          >
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: config.hex }}
                            />
                            <span className="text-sm">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
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

            {role === 'student' && (
              <div className="mb-6 space-y-4">
                <DisplayNotes notes={advisorNotes} emptyMessage="No advisor notes yet." />
                <DisplaySuggestions suggestions={advisorSuggestions} emptyMessage="No advisor suggestions yet." />
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
        </div>

        {isCartOpen && (
          <>
            {/* Drag handle */}
            <div
              onMouseDown={startDrag}
              className="cursor-col-resize w-2 hover:bg-primary/30 transition-colors"
              style={{ userSelect: 'none' }}
            />
            {/* Embedded cart */}
            <CourseCart
              layoutMode="split"
              widthPx={cartWidth}
              isOpen={true}
              onToggle={toggleCart}
              onFinalizePlan={async (courses, submitToAdvisor = false) => {
                if (!planId) {
                  toast({
                    title: 'No plan',
                    description: 'Your plan could not be found.',
                    variant: 'destructive',
                  });
                  return;
                }
                try {
                  // Insert courses
                  for (const course of courses) {
                    const termOrderMap: Record<string, number> = {
                      Spring: 1,
                      Summer: 2,
                      Fall: 3,
                      Winter: 4
                    };
                    const baseOrder = parseInt(course.year) * 10;
                    const term_order = baseOrder + (termOrderMap[course.term] || 0);
                    const coursesInTerm = planCourses.filter(
                      pc => pc.term === course.term && pc.year === course.year
                    );
                    const maxPosition = coursesInTerm.length
                      ? Math.max(...coursesInTerm.map(pc => pc.position))
                      : -1;

                    const { error } = await supabase.from('plan_courses').insert({
                      plan_id: planId,
                      course_id: course.id,
                      term: course.term,
                      year: course.year,
                      term_order,
                      position: maxPosition + 1
                    });
                    if (error) throw error;
                  }

                  // Update plan status if submitting to advisor
                  if (submitToAdvisor) {
                    const { error: updateError } = await supabase
                      .from('student_plans')
                      .update({
                        status: 'submitted',
                        submitted_at: new Date().toISOString()
                      })
                      .eq('id', planId);

                    if (updateError) throw updateError;

                    // Update local state to reflect submission
                    setPlanStatus('submitted');
                  }

                  clearCart();
                  toast({
                    title: submitToAdvisor ? 'Plan Submitted' : 'Plan Updated',
                    description: submitToAdvisor
                      ? `${courses.length} courses added and submitted to your advisor for review.`
                      : `${courses.length} courses added to your plan.`
                  });
                } catch (err: any) {
                  toast({
                    title: 'Error',
                    description: err.message,
                    variant: 'destructive'
                  });
                }
              }}
              cartItems={cartItems}
              addCourse={addCourse}
              removeCourse={removeCourse}
              clearCart={clearCart}
              updateCoursePriority={updateCoursePriority}
              updateCourseNotes={updateCourseNotes}
              hideFab
            />
          </>
        )}
      </div>

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
                    title: 'Export Successful',
                    description: 'Schedule exported successfully!'
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
  const { toast } = useToast();

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
              {/* Display schedule if available */}
              {planCourse.courses.schedule && planCourse.courses.schedule.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-start gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      {planCourse.courses.schedule.map((time: any, idx: number) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          <span className="font-medium">{time.day}</span>: {time.startTime} - {time.endTime}
                          {time.room && <span className="ml-2">({time.room})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center gap-2 mt-2">
                {!planCourse.courses.schedule || planCourse.courses.schedule.length === 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => {
                      toast({
                        title: 'Add Class Times',
                        description: 'Feature coming soon! You can add schedule times to detect conflicts.',
                      });
                    }}
                  >
                    <Clock className="w-3 h-3" />
                    Add Times
                  </Button>
                ) : (
                  <div />
                )}
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