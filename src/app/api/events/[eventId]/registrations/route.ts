import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getEventRegistrations, registerForEvent } from '@/lib/eventDb';
import { EventRegistration } from '@/types/event';

// GET /api/events/[eventId]/registrations - Get all registrations for an event
export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const registrations = await getEventRegistrations(eventId);
    return NextResponse.json({ success: true, data: registrations });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/registrations - Register for an event
export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const registrationData: Omit<
      EventRegistration, 
      'registration_id' | 'event_id' | 'registration_date' | 'created_at' | 'updated_at'
    > = await request.json();

    // Basic validation
    if (!registrationData.attendee_name || !registrationData.attendee_email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Add tenant_id from session if available
    const tenantId = session.user.tenantId as string | undefined;
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const registration = await registerForEvent(eventId, {
      ...registrationData,
      tenant_id: tenantId,
      status: 'REGISTERED',
      payment_status: 'PENDING'
    });

    return NextResponse.json(
      { success: true, data: registration },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering for event:', error);
    
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { success: false, error: 'You are already registered for this event' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
