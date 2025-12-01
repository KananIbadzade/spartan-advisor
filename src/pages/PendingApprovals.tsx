import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

const PendingApprovals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<StudentPlan[]>([]);
  const [isAdvisor, setIsAdvisor] = useState(false);

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

  const handleApprove = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('student_plans')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Plan approved',
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

  const handleReject = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('student_plans')
        .update({ 
          status: 'declined',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Plan declined',
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
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(plan.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(plan.id)}
                            className="gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
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
      </main>
    </div>
  );
};

export default PendingApprovals;
