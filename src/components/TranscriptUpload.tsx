import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, X, AlertCircle } from 'lucide-react';

interface TranscriptUploadProps {
  onUploadComplete?: (fileUrl: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
  maxSizeInMB?: number;
}

export const TranscriptUpload: React.FC<TranscriptUploadProps> = ({
  onUploadComplete,
  onUploadError,
  maxSizeInMB = 10
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file only';
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `File size must be less than ${maxSizeInMB}MB`;
    }

    // Check if filename is reasonable
    if (file.name.length > 100) {
      return 'Filename is too long (max 100 characters)';
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to upload transcripts');
      }

      // Create unique filename
      const fileExtension = file.name.split('.').pop();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${user.id}/${timestamp}_transcript.${fileExtension}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('transcripts')
        .upload(fileName, file, {
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total!) * 100);
            setUploadProgress(percent);
          }
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('transcripts')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get file URL');
      }

      // Save transcript record to database
      const { error: dbError } = await supabase
        .from('transcripts')
        .upsert({
          user_id: user.id,
          file_url: urlData.publicUrl,
          uploaded_at: new Date().toISOString()
        });

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Success
      setUploadedFile(file.name);
      setUploadProgress(100);
      onUploadComplete?.(urlData.publicUrl, file.name);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Transcript
        </CardTitle>
        <CardDescription>
          Upload your official transcript (PDF only, max {maxSizeInMB}MB)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {uploadedFile ? (
          // Success state
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <p className="font-medium text-green-800 mb-2">Upload successful!</p>
            <p className="text-sm text-muted-foreground mb-4">{uploadedFile}</p>
            <Button variant="outline" onClick={resetUpload}>
              Upload Another File
            </Button>
          </div>
        ) : (
          <>
            {/* Upload area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/10'
                  : isUploading
                  ? 'border-muted bg-muted/20'
                  : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <Upload className="w-10 h-10 mx-auto text-primary animate-pulse" />
                  <div>
                    <p className="font-medium">Uploading transcript...</p>
                    <Progress value={uploadProgress} className="w-full mt-2" />
                    <p className="text-sm text-muted-foreground mt-1">
                      {uploadProgress}% complete
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Drop your transcript here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={isUploading}
            />

            {/* Error display */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* File requirements */}
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Requirements:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>PDF format only</li>
                <li>Maximum file size: {maxSizeInMB}MB</li>
                <li>Official transcript from your institution</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};