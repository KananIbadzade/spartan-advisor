import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const baseProfileSchema = z.object({
  first_name: z.string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters'),
  last_name: z.string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters'),
  department: z.string()
    .trim()
    .max(100, 'Department must be less than 100 characters')
    .optional()
    .or(z.literal(''))
});

// Student-specific fields live only on student profiles
// student_id is intentionally not editable by users — it's shown read-only in the profile UI
const studentFieldsSchema = z.object({
  major: z.string()
    .trim()
    .max(100, 'Major must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  catalog_year: z.string().optional().or(z.literal('')),
  year_in_school: z.string().optional().or(z.literal('')),
});

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'student' | 'advisor' | 'admin' | null>(null);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    major: '',
    catalog_year: '',
    year_in_school: '',
    department: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // signed url for display

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Also load the user's primary role to tailor the form
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, status')
        .eq('user_id', user.id);

      if (roles && roles.length > 0) {
        const active = roles.find(r => r.status === 'active') || roles[0];
        if (active.role === 'student' || active.role === 'advisor' || active.role === 'admin') {
          setRole(active.role);
        }
      }

      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          student_id: data.student_id || '',
          major: data.major || '',
          catalog_year: data.catalog_year || '',
          year_in_school: data.year_in_school || '',
          department: data.department || '',
        });
        // If the profile has an avatar url path, generate a short-lived signed url for display
        if (data.avatar_url) {
          try {
            const { data: signed, error: sError } = await supabase.storage
              .from('avatars')
              .createSignedUrl(data.avatar_url, 60 * 60);

            if (!sError && signed?.signedUrl) {
              setAvatarUrl(signed.signedUrl);
            } else if (sError) {
              // log so admins/devs can debug why the signed URL failed
              console.warn('createSignedUrl failed for avatar:', sError.message || sError);
            }
          } catch (e) {
            console.warn('Error creating signed url for avatar', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Pick schema based on role: advisors/admins only use base fields,
      // students use full student profile schema.
      const schema = role === 'student'
        ? baseProfileSchema.merge(studentFieldsSchema)
        : baseProfileSchema;

      const validatedData = schema.parse(profile);

      // Ensure student_id is not updated by clients — remove it if present
      // (profile object still keeps student_id for display but we won't send it)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { student_id, ...updateData } = validatedData as any;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your profile has been updated',
      });
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
    } finally {
      setLoading(false);
    }
  };

  const sanitizeName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.')) {
      return;
    }

    setLoading(true);
    try {
      // Get the session to pass to the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Call edge function to delete user account from auth
      const { error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });
      
      // Sign out and redirect
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    // Validate image size/type
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(f.type)) {
      toast({ title: 'Invalid file', description: 'Please upload a PNG/JPEG/WebP image.', variant: 'destructive' });
      return;
    }

    if (f.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Avatar must be < 2MB', variant: 'destructive' });
      return;
    }

    setAvatarFile(f);
    setAvatarPreviewUrl(URL.createObjectURL(f));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get existing avatar (we will remove it AFTER successful update)
      const { data: profileRow } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
      const oldAvatarPath: string | null = profileRow?.avatar_url || null;

      const originalBase = sanitizeName(avatarFile.name.replace(/\.[^.]+$/, ''));
      const ext = (avatarFile.name.split('.').pop() || 'png').toLowerCase();
      const fileName = `${user.id}/avatar_${Date.now()}_${originalBase}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      // save path to profile in DB
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: fileName }).eq('id', user.id);
      if (dbErr) {
        // Cleanup newly uploaded file to avoid orphaned files
        try {
          await supabase.storage.from('avatars').remove([fileName]);
        } catch (cleanupErr) {
          console.warn('Failed to cleanup newly uploaded avatar after DB error', cleanupErr);
        }
        throw dbErr;
      }

      // If we had an old avatar, delete it now (best-effort)
      if (oldAvatarPath && oldAvatarPath !== fileName) {
        try {
          await supabase.storage.from('avatars').remove([oldAvatarPath]);
        } catch (e) {
          console.warn('Failed to remove old avatar (non-blocking):', e);
        }
      }

      // get signed url for display
      const { data: signed, error: sError } = await supabase.storage.from('avatars').createSignedUrl(fileName, 60 * 60);
      if (!sError && signed?.signedUrl) setAvatarUrl(signed.signedUrl);

      setAvatarFile(null);
      setAvatarPreviewUrl(null);

      toast({ title: 'Avatar uploaded', description: 'Profile picture updated successfully' });
    } catch (err: any) {
      toast({ title: 'Error uploading avatar', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Delete your profile photo?')) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileRow } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
      if (profileRow?.avatar_url) {
        await supabase.storage.from('avatars').remove([profileRow.avatar_url]);
      }

      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      setAvatarUrl(null);
      toast({ title: 'Avatar removed', description: 'Profile photo deleted' });
    } catch (err: any) {
      toast({ title: 'Error removing avatar', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  

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
          <h1 className="text-3xl font-bold text-primary-foreground">Your Profile</h1>
          <p className="text-primary-foreground/80">
            {role === 'advisor' || role === 'admin'
              ? 'Manage your advisor profile information'
              : 'Manage your student information'}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{role === 'advisor' || role === 'admin' ? 'Advisor Information' : 'Student Information'}</CardTitle>
            <CardDescription>
              {role === 'advisor' || role === 'admin'
                ? 'Keep your contact and department information up to date'
                : 'Keep your information up to date for accurate course recommendations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Avatar upload */}
            <div className="mb-6 flex items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="avatar preview" className="w-full h-full object-cover" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-muted-foreground font-semibold">{(profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')}</div>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <input id="avatar-file" type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                  <label htmlFor="avatar-file">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">Choose Photo</span>
                    </Button>
                  </label>
                  <Button size="sm" onClick={handleUploadAvatar} disabled={!avatarFile || loading}>Upload</Button>
                  <Button variant="ghost" size="sm" onClick={handleRemoveAvatar} disabled={!avatarUrl || loading}>Remove</Button>
                </div>
                <p className="text-xs text-muted-foreground">Accepted: PNG, JPEG, WebP — max 2MB</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {role === 'student' && (
                <>
                  <div className="space-y-2">
                    <Label>Student ID</Label>
                    <div className="px-3 py-2 rounded-md bg-muted/50 border border-muted-foreground/20 text-sm text-muted-foreground">
                      {profile.student_id || 'Not set'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Student ID cannot be changed through the profile editor. Contact an administrator if it needs updating.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="major">Major</Label>
                    <Input
                      id="major"
                      placeholder="e.g., Computer Science"
                      value={profile.major}
                      onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="catalog_year">Catalog Year</Label>
                      <Select
                        value={profile.catalog_year}
                        onValueChange={(value) => setProfile({ ...profile, catalog_year: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-2025">2024-2025</SelectItem>
                          <SelectItem value="2023-2024">2023-2024</SelectItem>
                          <SelectItem value="2022-2023">2022-2023</SelectItem>
                          <SelectItem value="2021-2022">2021-2022</SelectItem>
                          <SelectItem value="2020-2021">2020-2021</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year_in_school">Year in School</Label>
                      <Select
                        value={profile.year_in_school}
                        onValueChange={(value) => setProfile({ ...profile, year_in_school: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freshman">Freshman</SelectItem>
                          <SelectItem value="sophomore">Sophomore</SelectItem>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="graduate">Graduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {(role === 'advisor' || role === 'admin') && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., College of Engineering"
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-card mt-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions - proceed with caution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. All your data will be permanently removed.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  Delete My Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
