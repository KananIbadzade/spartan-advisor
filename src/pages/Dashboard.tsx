import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Calendar, FileText, MessageSquare, LogOut, User, Shield, AlertCircle } from 'lucide-react';
import RoleBadge from '@/components/RoleBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profile);

      // Fetch user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (!userRoles || userRoles.length === 0) {
        // No roles assigned yet, redirect to role selection
        navigate('/role-selection');
        return;
      }

      setRoles(userRoles);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const hasActiveRole = (role: string) => 
    roles.some(r => r.role === role && r.status === 'active');
  
  const hasPendingRole = (role: string) => 
    roles.some(r => r.role === role && r.status === 'pending');

  const hasRole = (role: string) => 
    roles.some(r => r.role === role);

  const isStudent = hasRole('student');
  const isAdvisor = hasActiveRole('advisor');
  const isAdmin = hasActiveRole('admin');
  const advisorPending = hasPendingRole('advisor');

  // Get highest priority role for display
  // CRITICAL: Advisors should NEVER show student role, even if they have student features
  const getPrimaryRole = () => {
    if (isAdmin) return roles.find(r => r.role === 'admin');
    if (hasRole('advisor')) return roles.find(r => r.role === 'advisor'); // Always show advisor, never student
    return roles.find(r => r.role === 'student');
  };

  const primaryRole = getPrimaryRole();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-secondary rounded-full p-2">
                <GraduationCap className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">SJSU MyPlanner</h1>
                <p className="text-sm text-primary-foreground/80">
                  Welcome back, {profile?.first_name || 'Student'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {primaryRole && (
                <RoleBadge role={primaryRole.role} status={primaryRole.status} />
              )}
              <Button variant="outline" onClick={handleSignOut} className="gap-2 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Advisor Pending Banner */}
        {advisorPending && (
          <Alert className="mb-8 border-warning bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertTitle>Advisor Access Pending</AlertTitle>
            <AlertDescription>
              Your advisor access request is pending admin approval. You'll be notified once it's reviewed.
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Completion Banner */}
        {!profile?.student_id && !isAdmin && (
          <Card className="mb-8 border-warning bg-warning/10 shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <User className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-warning-foreground mb-2">Complete Your Profile</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your information to get personalized course recommendations
                  </p>
                  <Button variant="outline" onClick={() => navigate('/profile')} className="border-warning text-warning hover:bg-warning/10">
                    Complete Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Admin Dashboard Card */}
          {isAdmin && (
            <Card className="hover:shadow-card transition-all cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-destructive/20 transition-colors">
                  <Shield className="w-6 h-6 text-destructive" />
                </div>
                <CardTitle className="text-lg">Admin Dashboard</CardTitle>
                <CardDescription>Manage system settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/admin')} variant="destructive" className="w-full">
                  Open Admin
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pending Advisor Approvals - Admin only */}
          {isAdmin && (
            <Card className="hover:shadow-card transition-all cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-warning/20 transition-colors">
                  <User className="w-6 h-6 text-warning" />
                </div>
                <CardTitle className="text-lg">Pending Advisor Approvals</CardTitle>
                <CardDescription>Review advisor requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/pending-advisors')} variant="outline" className="w-full border-warning text-warning hover:bg-warning/10">
                  Review Requests
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Course Planner - All users */}
          <Card className="hover:shadow-card transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Course Planner</CardTitle>
              <CardDescription>Build your academic roadmap</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/planner')} className="w-full">
                Open Planner
              </Button>
            </CardContent>
          </Card>

          {/* Transcript - All users */}
          <Card className="hover:shadow-card transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-secondary/30 transition-colors">
                <FileText className="w-6 h-6 text-secondary-foreground" />
              </div>
              <CardTitle className="text-lg">Transcript</CardTitle>
              <CardDescription>Upload and view your transcript</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/transcript')} variant="secondary" className="w-full">
                Manage Transcript
              </Button>
            </CardContent>
          </Card>

          {/* Messages - All users, fully clickable for everyone */}
          <Card className="hover:shadow-card transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Messages</CardTitle>
              <CardDescription>Chat with others</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/messages')} 
                variant="outline" 
                className="w-full"
              >
                View Messages
              </Button>
            </CardContent>
          </Card>

          {/* Pending Plan Approvals - Advisors and Admins */}
          {/* For pending advisors: show but grayed out and not clickable */}
          {(isAdvisor || isAdmin || advisorPending) && (
            <Card className={`transition-all ${advisorPending ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-card cursor-pointer group'}`}>
              <CardHeader>
                <div className={`w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2 ${!advisorPending && 'group-hover:bg-primary/20'} transition-colors`}>
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Pending Plan Approvals</CardTitle>
                <CardDescription>Review student course plans</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => !advisorPending && navigate('/pending-approvals')} 
                  className="w-full"
                  disabled={advisorPending}
                >
                  {advisorPending ? 'Approval Required' : 'Review Plans'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Profile - All users */}
          <Card className="hover:shadow-card transition-all cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <User className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Update your information</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/profile')} variant="outline" className="w-full">
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to make the most of MyPlanner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Complete Your Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your student ID, major, and catalog year
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-semibold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Upload Your Transcript</h4>
                  <p className="text-sm text-muted-foreground">
                    Import your completed courses for accurate planning
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground font-semibold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Create Your Plan</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the AI advisor to build an optimized course schedule
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
