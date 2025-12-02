import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { updateSuggestionStatus, getSuggestionsForAdvisor } from '@/lib/advisorSuggestionsService';

interface Suggestion {
  id: string;
  student_id: string;
  course_id: string;
  content: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  courses: {
    course_code: string;
    course_number: string;
    title: string;
    units: number;
  };
}

const AdvisorSuggestionsReview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role,status')
        .eq('user_id', user.id);

      const allowed = roles?.some(r =>
        (r.role === 'advisor' || r.role === 'admin') && r.status === 'active'
      );
      if (!allowed) {
        toast({
          title: 'Access Denied',
          description: 'Advisor access required',
          variant: 'destructive'
        });
        navigate('/dashboard');
        return;
      }
      setIsAdvisor(true);
      loadSuggestions();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const data = await getSuggestionsForAdvisor();
      setSuggestions(data as any);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'accepted' | 'declined') => {
    try {
      await updateSuggestionStatus(id, newStatus);
      toast({
        title: 'Updated',
        description: `Suggestion ${newStatus}`
      });
      loadSuggestions();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdvisor) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">Course Suggestions Review</h1>
            <p className="text-sm text-primary-foreground/80">
              Accept or decline pending course recommendations
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pending Suggestions</CardTitle>
            <CardDescription>
              Suggestions you created for students (pending status)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No suggestions yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{s.courses.course_code} {s.courses.course_number}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{s.courses.title}</TableCell>
                      <TableCell>{s.courses.units}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                        {s.content || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.status === 'pending'
                              ? 'outline'
                              : s.status === 'accepted'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          disabled={s.status !== 'pending'}
                          onClick={() => handleUpdateStatus(s.id, 'accepted')}
                          className="gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={s.status !== 'pending'}
                          onClick={() => handleUpdateStatus(s.id, 'declined')}
                          className="gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {suggestions.length > 0 && (
              <div className="mt-4 text-right">
                <Button variant="outline" size="sm" onClick={loadSuggestions}>
                  Refresh
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdvisorSuggestionsReview;