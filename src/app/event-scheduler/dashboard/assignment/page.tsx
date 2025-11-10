'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AssignmentSubmission() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/event-scheduler/login');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');

    try {
      console.log('=== Starting file upload ===');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Create a new FormData instance
      const formData = new FormData();
      
      // Append the file directly - no need to create a new File instance
      formData.append('file', file);
      
      // Add additional metadata
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);
      formData.append('fileSize', file.size.toString());
      
      // Log FormData contents for debugging
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`File: ${key} - ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`Field: ${key} = ${value}`);
        }
      }

      console.log('Sending request to /api/assignments');
      const startTime = Date.now();
      
      // Use fetch with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('Upload timed out after 5 minutes');
        controller.abort();
      }, 300000); // 5 minute timeout
      
      try {
        console.log('Creating fetch request...');
        console.log('Sending fetch request...');
        const response = await fetch('/api/assignments', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          credentials: 'same-origin',
          // Let the browser set the Content-Type with boundary
          // Don't set Content-Type header manually
        });
        
        if (!response) {
          throw new Error('No response received from server');
        }
        
        console.log('Response received, status:', response.status);
        
        clearTimeout(timeoutId);
        
        const endTime = Date.now();
        console.log(`Request completed in ${endTime - startTime}ms`);
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          let errorMessage = 'Failed to upload assignment';
          try {
            // Try to get JSON error response
            const errorData = await response.json().catch(() => ({}));
            console.error('Server error response:', errorData);
            
            errorMessage = errorData.error || errorMessage;
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`;
            }
          } catch (e) {
            // If JSON parsing fails, try to get text response
            const text = await response.text().catch(() => 'No error details available');
            console.error('Raw error response:', text);
            errorMessage = `Server error (${response.status} ${response.statusText}): ${text}`;
          }
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
        
        setUploadStatus('success');
        toast({
          title: 'Success!',
          description: 'Your assignment has been submitted successfully.',
        });
        setFile(null);
        
      } catch (error) {
        console.error('Error in fetch request:', error);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error('Upload was aborted due to timeout');
            throw new Error('Upload timed out. Please try again with a smaller file or better connection.');
          } else if (error.name === 'TypeError' && error.message.includes('network')) {
            console.error('Network error occurred:', error.message);
            throw new Error('Network error. Please check your internet connection and try again.');
          }
          console.error('Fetch error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          throw error;
        }
        console.error('Unknown error type:', error);
        throw new Error('An unknown error occurred during file upload');
      } finally {
        console.log('Clearing timeout and cleaning up...');
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('=== File upload error ===');
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      setUploadStatus('error');
      
      let errorMessage = 'Failed to upload file';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      console.log('=== Upload process completed ===');
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <FileText className="h-8 w-8 text-indigo-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Assignment Submission</h1>
        </div>
        
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              {file ? (
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                  <p className="text-sm text-gray-600">Selected file:</p>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX, XLS, XLSX, or TXT (max. 50MB)
                  </p>
                </div>
              )}
              
              <label className={`mt-4 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <span className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  {isUploading ? 'Uploading...' : file ? 'Change file' : 'Select file'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                />
              </label>
            </div>
          </div>

          {file && (
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isUploading || !file}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Uploading...
                  </>
                ) : (
                  'Submit Assignment'
                )}
              </Button>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Assignment submitted successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    Failed to submit assignment. Please try again.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Guidelines</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
            <li>Only PDF, DOC, DOCX, or TXT files are accepted</li>
            <li>Maximum file size: 10MB</li>
            <li>Make sure your file is properly named (e.g., Assignment1_JohnDoe.pdf)</li>
            <li>You can resubmit your assignment before the deadline</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
