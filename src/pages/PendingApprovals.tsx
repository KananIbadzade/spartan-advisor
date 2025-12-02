import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StudentPlan {
  id: string;
  name: string;
  status: string;
  submitted_at: string;
  student_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface PlanCourse {
  id: string;
  term: string;
  year: string;
  course_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'declined';
  courses: {
    id: string;
    course_code: string;
    course_number: string;
    title: string;
    units: number;
  };
}

const PendingApprovals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<StudentPlan[]>([]);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<StudentPlan | null>(null);
  const [planCourses, setPlanCourses] = useState<PlanCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is an active advisor or admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      const hasAdvisorAccess = roles?.some(
        r => (r.role === 'advisor' && r.status === 'active') || (r.role === 'admin' && r.status === 'active')
      );

      if (!hasAdvisorAccess) {
        toast({
          title: 'Access Denied',
          description: 'You need advisor privileges to access this page',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setIsAdvisor(true);
      loadPendingPlans();
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

  const loadPendingPlans = async () => {
    try {
      const { data } = await supabase
        .from('student_plans')
        .select('*')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (!data) {
        setPlans([]);
        return;
      }

      // Fetch profiles separately
      const profileIds = data.map(p => p.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', profileIds);

      // Merge data
      const plansWithProfiles = data.map(plan => ({
        ...plan,
        profiles: profiles?.find(p => p.id === plan.student_id) || {
          first_name: '',
          last_name: '',
          email: ''
        }
      }));

      setPlans(plansWithProfiles as any);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleApproveCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('plan_courses')
        .update({
          status: 'approved'
        } as any)
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course approved',
      });

      // Reload the current viewing plan to show updated status
      if (viewingPlan) {
        await handleViewPlan(viewingPlan);
        // Check if all courses have been reviewed and update plan status accordingly
        await updatePlanStatusIfAllReviewed(viewingPlan.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleApproveAllCourses = async (planId: string) => {
    try {
      // Approve all draft/submitted courses in this plan
      const { error } = await supabase
        .from('plan_courses')
        .update({
          status: 'approved'
        } as any)
        .eq('plan_id', planId)
        .in('status', ['draft', 'submitted']);

      if (error) throw error;

      // Update the plan status to approved
      const { error: planError } = await supabase
        .from('student_plans')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (planError) throw planError;

      toast({
        title: 'Success',
        description: 'All courses approved',
      });

      loadPendingPlans();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeclineCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('plan_courses')
        .update({
          status: 'declined'
        } as any)
        .eq('id', courseId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course declined',
      });

      // Reload the current viewing plan to show updated status
      if (viewingPlan) {
        await handleViewPlan(viewingPlan);
        // Check if all courses have been reviewed and update plan status accordingly
        await updatePlanStatusIfAllReviewed(viewingPlan.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeclineAllCourses = async (planId: string) => {
    try {
      // Decline all draft/submitted courses in this plan
      const { error } = await supabase
        .from('plan_courses')
        .update({
          status: 'declined'
        } as any)
        .eq('plan_id', planId)
        .in('status', ['draft', 'submitted']);

      if (error) throw error;

      // Update the plan status to declined
      const { error: planError } = await supabase
        .from('student_plans')
        .update({
          status: 'declined',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (planError) throw planError;

      toast({
        title: 'Success',
        description: 'All courses declined',
      });

      loadPendingPlans();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Helper function to check and update plan status based on course statuses
  const updatePlanStatusIfAllReviewed = async (planId: string) => {
    try {
      // Get all courses for this plan
      const { data: courses, error } = await supabase
        .from('plan_courses')
        .select('status')
        .eq('plan_id', planId);

      if (error) throw error;
      if (!courses || courses.length === 0) return;

      // Check if there are any pending courses
      const hasPending = courses.some(c => c.status === 'draft' || c.status === 'submitted');

      // If all courses have been reviewed (no pending)
      if (!hasPending) {
        const hasDeclined = courses.some(c => c.status === 'declined');
        const allApproved = courses.every(c => c.status === 'approved');

        let newStatus: 'approved' | 'declined';
        if (allApproved) {
          newStatus = 'approved';
        } else {
          // If any course is declined, mark the whole plan as declined
          newStatus = 'declined';
        }

        // Update plan status
        const { error: updateError } = await supabase
          .from('student_plans')
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', planId);

        if (updateError) throw updateError;

        // Reload the pending plans list to remove this plan if needed
        loadPendingPlans();
      }
    } catch (error: any) {
      console.error('Error updating plan status:', error);
    }
  };

  const handleApproveSemester = async (term: string, year: string) => {
    if (!viewingPlan) return;

    try {
      // Approve all draft/submitted courses in this semester
      const { error } = await supabase
        .from('plan_courses')
        .update({ status: 'approved' } as any)
        .eq('plan_id', viewingPlan.id)
        .eq('term', term)
        .eq('year', year)
        .in('status', ['draft', 'submitted']);

      if (error) throw error;

      toast({
        title: 'Semester Approved',
        description: `All courses in ${term} ${year} have been approved`,
      });

      // Reload the plan to show updated statuses
      await handleViewPlan(viewingPlan);
      // Check if all courses have been reviewed and update plan status accordingly
      await updatePlanStatusIfAllReviewed(viewingPlan.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeclineSemester = async (term: string, year: string) => {
    if (!viewingPlan) return;

    try {
      // Decline all draft/submitted courses in this semester
      const { error } = await supabase
        .from('plan_courses')
        .update({ status: 'declined' } as any)
        .eq('plan_id', viewingPlan.id)
        .eq('term', term)
        .eq('year', year)
        .in('status', ['draft', 'submitted']);

      if (error) throw error;

      toast({
        title: 'Semester Declined',
        description: `All courses in ${term} ${year} have been declined`,
      });

      // Reload the plan to show updated statuses
      await handleViewPlan(viewingPlan);
      // Check if all courses have been reviewed and update plan status accordingly
      await updatePlanStatusIfAllReviewed(viewingPlan.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleViewPlan = async (plan: StudentPlan) => {
    try {
      setLoadingCourses(true);
      setViewingPlan(plan);
      console.log('=== DEBUG: Loading plan courses ===');
      console.log('Plan ID:', plan.id);
      console.log('Plan name:', plan.name);
      console.log('Plan status:', plan.status);

      // First, let's check if plan_courses exist at all (without join)
      const { data: rawCourses, error: rawError } = await supabase
        .from('plan_courses')
        .select('*')
        .eq('plan_id', plan.id);

      console.log('Raw plan_courses (no join):', rawCourses);
      console.log('Raw error:', rawError);

      if (!rawCourses || rawCourses.length === 0) {
        console.error('❌ No plan_courses records found for this plan!');
        console.log('This plan may not have any courses, or there is an RLS policy blocking access.');
        setPlanCourses([]);
        return;
      }

      // Now try with the join
      const { data, error } = await supabase
        .from('plan_courses')
        .select(`
          id,
          term,
          year,
          course_id,
          status,
          courses:course_id (
            id,
            course_code,
            course_number,
            title,
            units
          )
        `)
        .eq('plan_id', plan.id)
        .order('term_order', { ascending: true });

      console.log('Plan courses with join:', data);
      console.log('Join error:', error);

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      setPlanCourses(data as any || []);
    } catch (error: any) {
      console.error('Error loading plan courses:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load courses',
        variant: 'destructive',
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdvisor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Advisor Tasks</h1>
              <p className="text-sm text-primary-foreground/80">Review and approve student course plans</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Plans Awaiting Review</CardTitle>
            <CardDescription>Student plans submitted for approval</CardDescription>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No pending plans to review</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(plan => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.profiles.first_name} {plan.profiles.last_name}
                      </TableCell>
                      <TableCell>{plan.profiles.email}</TableCell>
                      <TableCell>{plan.name}</TableCell>
                      <TableCell>
                        {new Date(plan.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPlan(plan)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveAllCourses(plan.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve All
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeclineAllCourses(plan.id)}
                            className="gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline All
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Plan Dialog */}
        <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewingPlan?.name || 'Plan Details'}
              </DialogTitle>
              <DialogDescription>
                Submitted by {viewingPlan?.profiles.first_name} {viewingPlan?.profiles.last_name} on{' '}
                {viewingPlan?.submitted_at && new Date(viewingPlan.submitted_at).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {loadingCourses ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading courses...</p>
                </div>
              ) : planCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">No courses in this plan</p>
                  <p className="text-xs">This plan may be empty or the courses haven't been loaded yet.</p>
                </div>
              ) : (
                <>
                  {/* Debug info */}
                  {console.log('Rendering plan courses:', planCourses)}

                  {/* Group courses by term and year */}
                  {Object.entries(
                    planCourses.reduce((acc, course) => {
                      const key = `${course.term} ${course.year}`;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(course);
                      return acc;
                    }, {} as Record<string, PlanCourse[]>)
                  ).map(([termYear, courses]) => {
                    const hasPendingCourses = courses.some(c => c.status === 'submitted' || c.status === 'draft');
                    const [term, year] = termYear.split(' ');

                    return (
                      <div key={termYear} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg">{termYear}</h3>
                          {hasPendingCourses && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApproveSemester(term, year)}
                                className="gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Approve Semester
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeclineSemester(term, year)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <XCircle className="w-3 h-3" />
                                Decline Semester
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                        {courses.map((course) => {
                          const getStatusBadge = (status: string) => {
                            switch (status) {
                              case 'approved':
                                return <Badge className="bg-green-100 text-green-800 border-green-300">✓ Approved</Badge>;
                              case 'declined':
                                return <Badge className="bg-red-100 text-red-800 border-red-300">✗ Declined</Badge>;
                              case 'submitted':
                                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ Pending</Badge>;
                              default:
                                return <Badge variant="outline">Draft</Badge>;
                            }
                          };

                          return (
                            <div
                              key={course.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded gap-3"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {course.courses?.course_code || 'N/A'} {course.courses?.course_number || 'N/A'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {course.courses?.units || 0} units
                                  </span>
                                  {getStatusBadge(course.status)}
                                </div>
                                <p className="text-sm font-medium">{course.courses?.title || 'Unknown Course'}</p>
                              </div>
                              {(course.status === 'submitted' || course.status === 'draft') && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApproveCourse(course.id)}
                                    className="gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeclineCourse(course.id)}
                                    className="gap-1 text-destructive hover:text-destructive"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Decline
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                        Total: {courses.reduce((sum, c) => sum + (c.courses?.units || 0), 0)} units
                      </div>
                    </div>
                    );
                  })}

                  {/* Overall total */}
                  <div className="pt-4 border-t">
                    <p className="text-sm font-semibold">
                      Overall Total: {planCourses.reduce((sum, c) => sum + (c.courses?.units || 0), 0)} units
                    </p>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PendingApprovals;
