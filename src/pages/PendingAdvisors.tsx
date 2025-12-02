import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield, Check, X, ArrowLeft } from 'lucide-react';
import RoleBadge from '@/components/RoleBadge';

interface PendingAdvisor {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const Admin = () => {
  const [pendingAdvisors, setPendingAdvisors] = useState<PendingAdvisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .eq('status', 'active');

      if (!roles || roles.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchPendingAdvisors();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    }
  };

  const fetchPendingAdvisors = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          status,
          created_at
        `)
        .eq('role', 'advisor')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
          const advisorData = await Promise.all(
        (data || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('id', role.user_id)
            .single();

          const profileWithSigned = profile ? { ...profile } : { first_name: '', last_name: '', email: '', avatar_url: null };
          if (profileWithSigned.avatar_url) {
            // handle absolute URLs stored directly
            if (typeof profileWithSigned.avatar_url === 'string' && (profileWithSigned.avatar_url.startsWith('http://') || profileWithSigned.avatar_url.startsWith('https://'))) {
              profileWithSigned.avatar_signed_url = profileWithSigned.avatar_url;
            } else {
              try {
                const { data: signed, error: sError } = await supabase.storage.from('avatars').createSignedUrl(profileWithSigned.avatar_url, 60 * 60);
                if (signed?.signedUrl) profileWithSigned.avatar_signed_url = signed.signedUrl;
                if (sError) console.warn('Failed to create signed URL for pending advisor avatar', profileWithSigned.avatar_url, sError.message || sError);
              } catch (e) { console.warn('Error creating signed url for pending advisor', e); }
            }
          }

          return {
            ...role,
            profiles: profileWithSigned
          };
        })
      );

      setPendingAdvisors(advisorData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ status: 'active' })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Approved!",
        description: "Advisor access has been granted.",
      });

      fetchPendingAdvisors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeny = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ status: 'denied' })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Denied",
        description: "Advisor access request has been denied.",
      });

      fetchPendingAdvisors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-secondary rounded-full p-2">
                <Shield className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">Admin Dashboard</h1>
                <p className="text-sm text-primary-foreground/80">Manage advisor access requests</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Pending Advisor Requests</CardTitle>
            <CardDescription>
              Review and approve advisor access requests from faculty members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : pendingAdvisors.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No pending requests</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAdvisors.map((advisor) => (
                    <TableRow key={advisor.id}>
                                <TableCell className="font-medium flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                                    {advisor.profiles.avatar_signed_url ? (
                                      <img src={advisor.profiles.avatar_signed_url} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="text-xs text-muted-foreground">{(advisor.profiles.first_name?.[0] || '') + (advisor.profiles.last_name?.[0] || '')}</div>
                                    )}
                                  </div>
                                  <div>{advisor.profiles.first_name} {advisor.profiles.last_name}</div>
                                </TableCell>
                      <TableCell>{advisor.profiles.email}</TableCell>
                      <TableCell>
                        {new Date(advisor.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role="advisor" status="pending" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(advisor.id)}
                            className="gap-1"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeny(advisor.id)}
                            className="gap-1"
                          >
                            <X className="w-4 h-4" />
                            Deny
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

export default Admin;
