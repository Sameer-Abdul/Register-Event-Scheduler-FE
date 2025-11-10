import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }

    // In a real app, you'd verify the user is an admin here
    // For now, we'll just check if they're authenticated
    
    // Fetch all assignments with user information
    const result = await query(
      `SELECT a.*, 
              r.first_name || ' ' || r.last_name as user_name,
              r.email as user_email
       FROM assignments a
       JOIN register r ON a.register_id = r.id
       ORDER BY a.submission_date DESC`,
      []
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
