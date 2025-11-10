import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { createAssignment, getRegisterDetails } from '@/lib/assignmentDb';
import { Readable } from 'stream';
import formidable, { File as FormidableFile, Files, Fields } from 'formidable';
import { IncomingMessage } from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';

// File size limit: 50MB in bytes
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

// Configure route to handle large file uploads
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

// Configure for file uploads
export const maxBodySize = '50mb';
export const responseLimit = '50mb';

// Helper function to parse form data with better error handling
const parseForm = async (req: Request): Promise<{ fields: Record<string, string>; files: { file: File } }> => {
  try {
    console.log('Starting to parse form data...');
    
    // Get content type and check if it's multipart/form-data
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error(`Expected multipart/form-data but got ${contentType}`);
    }
    
    // Get content length to verify file size
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_FILE_SIZE) {
      throw new Error(`File size (${contentLength} bytes) exceeds maximum allowed size (${MAX_FILE_SIZE} bytes)`);
    }
    
    console.log(`Content-Length: ${contentLength} bytes`);
    
    // Parse the form data using the built-in FormData API
    const formData = await req.formData();
    
    // Get the file from the form data
    const file = formData.get('file');
    
    // Validate file exists
    if (!file || !(file instanceof File)) {
      throw new Error('No file found in the form data or invalid file format');
    }
    
    // Validate file size again (in case the content-length header was manipulated)
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size (${file.size} bytes) exceeds maximum allowed size (${MAX_FILE_SIZE} bytes)`);
    }
    
    // Validate file type
    if (!file.type || !ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`File type '${file.type}' is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
    }

    // Process form fields
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key !== 'file' && typeof value === 'string') {
        fields[key] = value;
      }
    }

    console.log('Successfully parsed form data', { 
      fields, 
      file: { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      } 
    });
    
    return { fields, files: { file } };
    
  } catch (error) {
    console.error('Error in parseForm:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    throw error;
  }
};

export async function POST(request: Request) {
  console.log('=== START: POST /api/assignments ===');
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    // Get user session
    console.log('Getting user session...');
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log('Session data:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id
      });
      
      if (!session?.user?.email) {
        console.log('No session found or invalid session data');
        return NextResponse.json(
          { error: 'Unauthorized - No valid session' },
          { status: 401 }
        );
      }
    } catch (sessionError) {
      console.error('Error getting session:', sessionError);
      return NextResponse.json(
        { error: 'Error validating session', details: sessionError instanceof Error ? sessionError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Parse form data
    console.log('Parsing form data...');
    let formData;
    try {
      formData = await parseForm(request);
      console.log('Form data parsed successfully', { 
        file: formData.files?.file ? { 
          name: formData.files.file.name, 
          size: formData.files.file.size, 
          type: formData.files.file.type 
        } : 'No file',
        fields: formData.fields
      });
    } catch (error) {
      console.error('Error parsing form data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: 'Error parsing form data',
          message: 'Failed to process the uploaded file.',
          details: errorMessage,
          code: 'PARSE_ERROR'
        },
        { status: 400 }
      );
    }
    
    const file = formData.files?.file;

    // Validate file exists
    if (!file) {
      console.log('No file found in request');
      return NextResponse.json(
        { 
          success: false,
          error: 'No File',
          message: 'No file was provided in the request.'
        },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      console.log(`File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE} bytes)`);
      return NextResponse.json(
        { 
          success: false,
          error: 'File Too Large',
          message: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`,
          details: {
            fileSize: file.size,
            maxSize: MAX_FILE_SIZE,
            fileType: file.type
          }
        },
        { status: 413 }
      );
    }

    // Check file type
    if (!file.type) {
      console.log('File type could not be determined');
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid File Type',
          message: 'The file type could not be determined.',
          details: {
            fileName: file.name,
            fileSize: file.size
          }
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.log(`Invalid file type: ${file.type}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Unsupported File Type',
          message: `Files of type '${file.type}' are not supported.`,
          details: {
            allowedTypes: ALLOWED_FILE_TYPES,
            providedType: file.type,
            fileName: file.name
          }
        },
        { status: 400 }
      );
    }
    
    // Read file content
    console.log('Reading file content...');
    let fileContent: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      fileContent = Buffer.from(arrayBuffer);
      console.log(`Successfully read ${fileContent.length} bytes from file '${file.name}'`);
    } catch (error) {
      console.error('Error reading file:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: 'File Read Error',
          message: 'Failed to read the uploaded file.',
          details: error instanceof Error ? error.message : 'Unknown error during file reading'
        },
        { status: 500 }
      );
    }

    // Get user registration details
    try {
      console.log('Fetching user registration details...');
      const register = await getRegisterDetails(session.user.email);
      
      if (!register) {
        console.log('User registration not found for email:', session.user.email);
        return NextResponse.json(
          { 
            success: false,
            error: 'Not Found',
            message: 'User registration not found.',
            details: `No registration found for email: ${session.user.email}`
          },
          { status: 404 }
        );
      }
      
      // Log register details for debugging
      console.log('Register details:', {
        id: register.id,
        first_name: register.first_name,
        last_name: register.last_name
      });

      // Save to database
      console.log('Preparing to save to database...', {
        registerId: register.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        hasFileContent: !!fileContent
      });
      
      let assignment;
      try {
        assignment = await createAssignment({
          register_id: register.id,
          file_name: file.name,
          file_data: fileContent,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream'
        });
        
        console.log('Assignment created successfully:', {
          assignmentId: assignment.id,
          fileName: assignment.file_name,
          fileSize: assignment.file_size,
          fileType: assignment.file_type,
          submissionDate: assignment.submission_date
        });
        
        return NextResponse.json(
          { 
            success: true,
            message: 'File uploaded successfully',
            data: {
              id: assignment.id,
              fileName: assignment.file_name,
              fileSize: assignment.file_size,
              fileType: assignment.file_type,
              submissionDate: assignment.submission_date
            }
          },
          { status: 201 }
        );
        
      } catch (dbError) {
        console.error('Error saving to database:', {
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
          stack: dbError instanceof Error ? dbError.stack : undefined,
          name: dbError instanceof Error ? dbError.name : 'UnknownError'
        });
        
        return NextResponse.json(
          { 
            success: false,
            error: 'Database Error',
            message: 'Failed to save the file to the database.',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
      
    } catch (error) {
      console.error('Error getting user registration:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Server Error',
          message: 'Failed to process your request.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // This code should be unreachable as we return from the try-catch block
    return NextResponse.json(
      { 
        success: false,
        error: 'Unexpected error occurred',
        message: 'An unexpected error occurred while processing your request.'
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error in /api/assignments:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process file upload',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'API route for assignments' });
}
