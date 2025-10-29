import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, UserCog } from 'lucide-react';
import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['student', 'advisor'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  })
});

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'advisor'>('student');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Validate role selection
      const validatedData = roleSchema.parse({ role: selectedRole });

      // Check if user already has this role
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', validatedData.role);

      // Only insert if role doesn't exist
      if (!existingRoles || existingRoles.length === 0) {
        // Server enforces that only 'student' role can be set to 'active' directly
        // Advisor role requests will always be 'pending' due to RLS policy
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: validatedData.role,
            status: validatedData.role === 'student' ? 'active' : 'pending',
            email: user.email
          });

        if (error) throw error;
      }

      toast({
        title: "Success!",
        description: validatedData.role === 'advisor' 
          ? "Your advisor access request has been submitted for approval."
          : "Welcome! Your account is ready.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary rounded-full mb-4 mx-auto">
            <GraduationCap className="w-8 h-8 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl">Choose Your Role</CardTitle>
          <CardDescription>
            Select how you'll be using SJSU MyPlanner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'student' | 'advisor')}>
            <div className="space-y-4">
              <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedRole === 'student' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`} onClick={() => setSelectedRole('student')}>
                <RadioGroupItem value="student" id="student" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="student" className="flex items-center gap-2 cursor-pointer">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <span className="font-semibold">I'm a Student</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Plan your courses, upload transcripts, and get AI-powered recommendations
                  </p>
                </div>
              </div>

              <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedRole === 'advisor' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`} onClick={() => setSelectedRole('advisor')}>
                <RadioGroupItem value="advisor" id="advisor" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="advisor" className="flex items-center gap-2 cursor-pointer">
                    <UserCog className="w-5 h-5 text-secondary-foreground" />
                    <span className="font-semibold">I'm an Advisor</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review student plans and provide guidance (requires admin approval)
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>

          <Button onClick={handleContinue} disabled={loading} className="w-full">
            {loading ? 'Setting up...' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelection;
