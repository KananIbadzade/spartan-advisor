import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, NotebookPen, Users, ClipboardCheck } from 'lucide-react';
import { AddSuggestionForm } from '@/components/AddSuggestionForm';
import { DisplaySuggestions } from '@/components/DisplaySuggestions';
import { PlanDiscussion } from '@/components/PlanDiscussion';
import { addAdvisorSuggestion } from '@/lib/advisorSuggestionsService';

const AdvisorTools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAdvisorAccess();
  }, []);

  const checkAdvisorAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      console.log('Current user:', user.email, user.id);
      setCurrentUser(user);

      // Check if user is an active advisor
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      console.log('User roles:', roles);

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
      await loadAssignedStudents(user.id);
    } catch (error: any) {
      console.error('Error in checkAdvisorAccess:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

const loadAssignedStudents = async (advisorId: string) => {
  try {
    console.log('=== SIMPLIFIED STUDENT LOADING ===');
    console.log('Advisor ID:', advisorId);

    // Get assignments first
    const { data: assignments, error: assignError } = await supabase
      .from('advisor_assignments')
      .select('student_id')
      .eq('advisor_id', advisorId);

    console.log('Assignments:', assignments);
    console.log('Assignment error:', assignError);

    if (!assignments || assignments.length === 0) {
      console.log('No assignments found');
      setStudents([]);
      return;
    }

    // Get student IDs
    const studentIds = assignments.map(a => a.student_id);
    console.log('Student IDs:', studentIds);

    // Get profiles directly - simplified query
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds);

    console.log('Profiles result:', profiles);
    console.log('Profile error:', profileError);

    if (profileError) {
      console.error('Profile query failed:', profileError);
      toast({
        title: 'Error',
        description: 'Failed to load student profiles',
        variant: 'destructive',
      });
      return;
    }

    let studentsList = profiles || [];
    // resolve signed urls for avatars
    studentsList = await Promise.all(studentsList.map(async (p: any) => {
      if (!p.avatar_url) return p;

      // If stored as full URL, use it directly
      if (typeof p.avatar_url === 'string' && (p.avatar_url.startsWith('http://') || p.avatar_url.startsWith('https://'))) {
        return { ...p, avatar_signed_url: p.avatar_url };
      }

      try {
        const { data: signed, error: sError } = await supabase.storage.from('avatars').createSignedUrl(p.avatar_url, 60 * 60);
        if (signed?.signedUrl) {
          return { ...p, avatar_signed_url: signed.signedUrl };
        }
        if (sError) console.warn('Failed to create signed URL for student avatar:', p.avatar_url, sError.message || sError);
      } catch (e) { console.warn('Error creating signed url for student avatar', e); }

      return p;
    }));
    console.log('Setting students to:', studentsList);

    setStudents(studentsList);

    if (studentsList.length > 0) {
      setSelectedStudent(studentsList[0].id);
      console.log('Selected first student:', studentsList[0].id);
    }

  } catch (error: any) {
    console.error('❌ Caught error:', error);
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
  }
};

  const handleAddSuggestion = async (courseId: string, content?: string, term?: string, year?: string) => {
    if (!selectedStudent) {
      toast({
        title: 'Error',
        description: 'Please select a student first',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Adding suggestion for student:', selectedStudent, 'course:', courseId);
      await addAdvisorSuggestion({
        student_id: selectedStudent,
        course_id: courseId,
        content,
        term,
        year
      });

      toast({
        title: "Success",
        description: "Course suggestion added successfully!"
      });
    } catch (error) {
      console.error('Error adding suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to add suggestion. " + (error as Error).message,
        variant: "destructive"
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading advisor tools...</p>
        </div>
      </div>
    );
  }

  if (!isAdvisor) {
    return null;
  }

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="gap-2 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-secondary rounded-full p-2">
                <NotebookPen className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">Advisor Tools</h1>
                <p className="text-sm text-primary-foreground/80">
                  Manage student notes and course suggestions
                  {currentUser && (
                    <span className="block text-xs opacity-75">
                      Logged in as: {currentUser.email}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Pending Plan Approvals Link */}
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <ClipboardCheck className="w-5 h-5" />
                  Pending Plan Approvals
                </CardTitle>
                <CardDescription className="text-green-700">
                  Review and approve student course plans awaiting your decision
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate('/pending-approvals')}
                className="bg-green-600 hover:bg-green-700"
              >
                View Pending Plans
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Student Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Student
            </CardTitle>
            <CardDescription>
              Choose a student to add notes and suggestions
              ({students.length} students found)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No students found for this advisor.</p>
                <p className="text-sm">Check the browser console for debugging info.</p>
              </div>
            ) : (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-full">
                  {selectedStudentData ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {selectedStudentData.avatar_signed_url ? (
                          <img src={selectedStudentData.avatar_signed_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-xs text-muted-foreground">{(selectedStudentData.first_name?.[0] || '') + (selectedStudentData.last_name?.[0] || '')}</div>
                        )}
                      </div>
                      <div className="truncate text-sm">{selectedStudentData.first_name} {selectedStudentData.last_name}</div>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a student to work with..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          {student.avatar_signed_url ? (
                            <img src={student.avatar_signed_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-xs text-muted-foreground">{(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}</div>
                          )}
                        </div>
                        <div className="truncate text-sm">
                          {student.first_name} {student.last_name}
                          {student.student_id && ` (${student.student_id})`}
                          {student.email && ` - ${student.email}`}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Notes and Suggestions */}
        {selectedStudent && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Plan Discussion Column */}
            <div className="space-y-6">
              <PlanDiscussion
                studentId={selectedStudent}
                advisorId={currentUser?.id}
                currentUserRole="advisor"
                studentName={selectedStudentData ? `${selectedStudentData.first_name} ${selectedStudentData.last_name}` : undefined}
              />
            </div>

            {/* Suggestions Column */}
            <div className="space-y-6">
              <AddSuggestionForm
                studentId={selectedStudent}
                studentName={selectedStudentData ? `${selectedStudentData.first_name} ${selectedStudentData.last_name}` : undefined}
                onSubmit={handleAddSuggestion}
              />
              <DisplaySuggestions
                studentId={selectedStudent}
                studentName={selectedStudentData ? `${selectedStudentData.first_name} ${selectedStudentData.last_name}` : undefined}
                currentUserRole="advisor"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdvisorTools;