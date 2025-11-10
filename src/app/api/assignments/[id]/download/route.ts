import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch the assignment
    const result = await query(
      'SELECT file_name, file_data, file_type FROM assignments WHERE id = $1',
      [params.id]
    );

    if (result.rows.length === 0) {
      return new NextResponse('Assignment not found', { status: 404 });
    }

    const { file_name, file_data, file_type } = result.rows[0];

    // Create a response with the file data
    const response = new NextResponse(file_data, {
      headers: {
        'Content-Type': file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file_name}"`,
      },
    });

    return response;
  } catch (error) {
    console.error('Error downloading assignment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
