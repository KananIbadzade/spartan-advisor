import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react';
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

  const handleViewTranscript = (transcript: any) => {
    if (transcript.file_url) {
      // Open file in new tab
      window.open(transcript.file_url, '_blank');
    } else {
      toast({
        title: "Error",
        description: "File URL not found",
        variant: "destructive"
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
        {/* Enhanced Upload Section with your new component */}
        <TranscriptUpload
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />

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
                          File available for viewing
                        </div>
                      )}
                    </div>
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
