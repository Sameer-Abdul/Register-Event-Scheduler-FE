import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Force dynamic route handling
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Simple test query first
    const testQuery = await query('SELECT NOW()');
    console.log('Database connection successful:', testQuery.rows[0]);

    // Fetch tenants
    const result = await query('SELECT tenant_id as id, name, email FROM tenant_master');
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error in /api/tenants-v2:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
