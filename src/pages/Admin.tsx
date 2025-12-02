import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ChevronDown, ChevronRight, Shield, HelpCircle } from 'lucide-react';
import AdminOnboarding from '@/components/AdminOnboarding';
import RoleBadge from '@/components/RoleBadge';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
  major: string | null;
  catalog_year: string | null;
  year_in_school: string | null;
  department: string | null;
  roles: Array<{
    id: string;
    role: string;
    status: string;
    created_at: string;
  }>;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .eq('status', 'active');

      if (!roles || roles.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchAllUsers();

      // Show onboarding for first-time admins only (persist opt-out in localStorage)
      try {
        const hidden = window.localStorage.getItem('admin_onboarding_shown');
        if (!hidden) setShowOnboarding(true);
      } catch (e) {
        // ignore localStorage errors in restrictive environments
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    }
  };

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, status, created_at');

      if (rolesError) throw rolesError;

      // Map profiles with their roles
      const formattedUsers: UserProfile[] = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        student_id: profile.student_id,
        major: profile.major,
        catalog_year: profile.catalog_year,
        year_in_school: profile.year_in_school,
        department: profile.department,
        roles: allRoles?.filter(role => role.user_id === profile.id).map(role => ({
          id: role.id,
          role: role.role,
          status: role.status,
          created_at: role.created_at
        })) || []
      })) || [];

      setUsers(formattedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2 text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-foreground" />
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowOnboarding(true)} className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
                <HelpCircle className="w-4 h-4" />
                Help
              </Button>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground">Admin Dashboard</h1>
              <p className="text-primary-foreground/80">Manage all users and their profiles</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-card">
          <AdminOnboarding open={showOnboarding} onClose={(dontShowAgain?: boolean) => {
            setShowOnboarding(false);
            if (dontShowAgain) {
              try { window.localStorage.setItem('admin_onboarding_shown', '1'); } catch (e) {}
            }
          }} />
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              View and manage all student and advisor accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Student ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <Collapsible key={user.id} open={expandedRows.has(user.id)}>
                        <TableRow>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(user.id)}
                              >
                                {expandedRows.has(user.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {user.roles.map((role) => (
                                <RoleBadge
                                  key={role.id}
                                  role={role.role as 'admin' | 'advisor' | 'student'}
                                  status={role.status as 'active' | 'pending' | 'denied'}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{user.student_id || '-'}</TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={5}>
                              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                <h4 className="font-semibold text-sm">Profile Details</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Major:</span>
                                    <p className="font-medium">{user.major || 'Not set'}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Department:</span>
                                    <p className="font-medium">{user.department || 'Not set'}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Catalog Year:</span>
                                    <p className="font-medium">{user.catalog_year || 'Not set'}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Year in School:</span>
                                    <p className="font-medium">{user.year_in_school || 'Not set'}</p>
                                  </div>
                                </div>
                                <div className="pt-2 border-t border-border">
                                  <span className="text-muted-foreground text-sm">User ID:</span>
                                  <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
