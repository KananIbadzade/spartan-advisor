import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { z } from 'zod';
import { ChatbotWidget } from '@/components/ChatbotWidget';

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
  title: string;
  units: number;
  department_id: string | null;
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

      // Load plan courses
      if (plans && plans.length > 0) {
        const { data: courses } = await supabase
          .from('plan_courses')
          .select('*, courses(*)')
          .eq('plan_id', plans[0].id)
          .order('term_order')
          .order('position');

        setPlanCourses(courses || []);
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

  const handleAddTerm = async () => {
    if (!planId) return;

    // Calculate next term_order
    const maxOrder = Math.max(0, ...planCourses.map(pc => pc.term_order));
    const newTermOrder = maxOrder + 1;

    // Add a placeholder course to create the term (we'll delete it after)
    // For now, just close dialog - terms are created when courses are added
    setAddTermOpen(false);
    toast({
      title: 'Ready to add courses',
      description: `Add courses to ${newTermName} ${newTermYear}`,
    });
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
      // Validate term and year
      const validatedData = planCourseSchema.parse({
        term: selectedTerm,
        year: selectedYear
      });

      // Calculate term_order based on term name
      const termOrderMap: { [key: string]: number } = {
        'Spring': 1,
        'Summer': 2,
        'Fall': 3,
        'Winter': 4
      };
      const baseOrder = parseInt(validatedData.year) * 10;
      const termOrder = baseOrder + (termOrderMap[validatedData.term] || 0);

      // Get max position for this term
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

  const handleDragStart = (event: DragEndEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const courseId = active.id as string;
    const overTermKey = over.id as string;

    // Parse the term key (format: "year-term")
    const [newYear, newTerm] = overTermKey.split('-');

    if (!newTerm || !newYear) return;

    try {
      const termOrderMap: { [key: string]: number } = {
        'Spring': 1,
        'Summer': 2,
        'Fall': 3,
        'Winter': 4
      };
      const baseOrder = parseInt(newYear) * 10;
      const termOrder = baseOrder + (termOrderMap[newTerm] || 0);

      const { error } = await supabase
        .from('plan_courses')
        .update({
          term: newTerm,
          year: newYear,
          term_order: termOrder
        })
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course moved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {terms.map((term) => (
                <TermCard key={`${term.year}-${term.term}`} term={term} onDeleteCourse={handleDeleteCourse} />
              ))}
            </div>
            <DragOverlay>
              {activeCourse ? (
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-card shadow-lg opacity-80">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-semibold">{activeCourse.courses.course_code}</div>
                    <div className="text-sm text-muted-foreground">{activeCourse.courses.title}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{activeCourse.courses.units} units</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>
      <ChatbotWidget />
    </div>
  );
};

interface TermCardProps {
  term: TermGroup;
  onDeleteCourse: (courseId: string) => void;
}

const TermCard = ({ term, onDeleteCourse }: TermCardProps) => {
  const { setNodeRef } = useSortable({
    id: `${term.year}-${term.term}`,
    data: {
      type: 'term',
      term: term.term,
      year: term.year,
    },
  });

  const courseIds = term.courses.map(c => c.id);

  return (
    <Card ref={setNodeRef} className="transition-colors hover:border-primary/30">
      <CardHeader>
        <CardTitle>{term.term} {term.year}</CardTitle>
        <CardDescription>
          {term.courses.reduce((sum, c) => sum + c.courses.units, 0)} total units
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[60px]">
            {term.courses.map(planCourse => (
              <DraggableCourse
                key={planCourse.id}
                planCourse={planCourse}
                onDelete={onDeleteCourse}
              />
            ))}
            {term.courses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Drop courses here
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
};

interface DraggableCourseProps {
  planCourse: PlanCourse;
  onDelete: (courseId: string) => void;
}

const DraggableCourse = ({ planCourse, onDelete }: DraggableCourseProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: planCourse.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-move"
    >
      <div {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="font-semibold">{planCourse.courses.course_code}</div>
        <div className="text-sm text-muted-foreground">{planCourse.courses.title}</div>
      </div>
      <div className="text-sm text-muted-foreground">{planCourse.courses.units} units</div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(planCourse.id)}
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
};

export default Planner;
