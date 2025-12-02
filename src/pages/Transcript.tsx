import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, ExternalLink, Trash2 } from 'lucide-react';
import { TranscriptUpload } from '@/components/TranscriptUpload';

const Transcript = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transcripts, setTranscripts] = useState<any[]>([]);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      setTranscripts(data || []);
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

  const handleUploadComplete = (fileUrl: string, fileName: string) => {
    toast({
      title: "Upload Successful",
      description: `${fileName} uploaded successfully!`
    });
    loadTranscripts(); // Reload the transcript list
  };

  const handleUploadError = (error: string) => {
    toast({
      title: "Upload Failed",
      description: error,
      variant: "destructive"
    });
  };

  const handleDeleteTranscript = async (transcript: any) => {
    if (!window.confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1. Attempt to remove the file from Supabase Storage
      if (transcript.file_url) {
        const { error: storageError } = await supabase.storage
          .from('transcripts')
          .remove([transcript.file_url]);

        if (storageError) {
          console.warn('Storage deletion warning:', storageError);
          // Continue anyway to ensure we clean up the database record
        }
      }

      // 2. Delete the record from the database
      const { error: dbError, count } = await supabase
        .from('transcripts')
        .delete({ count: 'exact' })
        .eq('id', transcript.id)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // CRITICAL FIX: If count is 0, the DB refused to delete (likely RLS policy missing)
      if (count === 0) {
        throw new Error("Permission denied: Unable to delete transcript record from database.");
      }

      toast({
        title: "Transcript Deleted",
        description: "Your transcript has been removed successfully."
      });

      // 3. Update UI immediately
      setTranscripts(prev => prev.filter(t => t.id !== transcript.id));
      
      // Reload to ensure state is fresh
      loadTranscripts();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete transcript",
        variant: "destructive"
      });
    }
  };

  const handleViewTranscript = async (transcript: any) => {
    const path = transcript.file_url; // now stores storage object path
    if (!path) {
      toast({ title: 'Error', description: 'File path missing', variant: 'destructive' });
      return;
    }
    try {
      // Generate short-lived signed URL (1 hour)
      const { data, error } = await supabase.storage
        .from('transcripts')
        .createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error('No signed URL');
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Unable to generate signed URL', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary border-b border-primary/20 shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="gap-2 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">Transcript</h1>
                <p className="text-sm text-primary-foreground/80">Upload and manage your academic transcript</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Only allow upload if no transcript exists */}
        {transcripts.length === 0 ? (
          <TranscriptUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        ) : (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium">Transcript Uploaded</p>
              <p className="text-sm mt-1">
                You have already uploaded a transcript. Please delete the existing one if you wish to upload a new file.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Existing Transcripts List */}
        {transcripts.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Transcripts</CardTitle>
              <CardDescription>Previously uploaded transcript files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transcripts.map(transcript => (
                  <div key={transcript.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">Transcript</div>
                      <div className="text-sm text-muted-foreground">
                        Uploaded {new Date(transcript.uploaded_at).toLocaleDateString()}
                      </div>
                      {transcript.file_url && (
                        <div className="text-xs text-muted-foreground mt-1">
                          File ready
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTranscript(transcript)}
                        className="gap-2"
                        disabled={!transcript.file_url}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTranscript(transcript)}
                        className="gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Transcript;
