import { NextResponse } from 'next/server';
import { db, findEventById } from '@/lib/mockDb';

// GET /api/events/[eventId]/participants/[participantId] - Get a specific participant
export async function GET(
  request: Request,
  { params }: { params: { eventId: string; participantId: string } }
) {
  try {
    const event = findEventById(params.eventId);
    
    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    const participant = event.participants?.find(p => p.id === params.participantId);
    
    if (!participant) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(participant);
  } catch (error) {
    console.error(`Error fetching participant ${params.participantId}:`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[eventId]/participants/[participantId] - Update a participant
export async function PUT(
  request: Request,
  { params }: { params: { eventId: string; participantId: string } }
) {
  try {
    const eventIndex = db.events.findIndex(e => e.id === params.eventId);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    const participantIndex = db.events[eventIndex].participants?.findIndex(
      p => p.id === params.participantId
    );
    
    if (participantIndex === -1 || participantIndex === undefined) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      );
    }
    
    const updates = await request.json();
    
    const updatedParticipant = {
      ...db.events[eventIndex].participants![participantIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    db.events[eventIndex].participants![participantIndex] = updatedParticipant;
    db.events[eventIndex].updatedAt = new Date().toISOString();
    
    return NextResponse.json(updatedParticipant);
  } catch (error) {
    console.error(`Error updating participant ${params.participantId}:`, error);
    return NextResponse.json(
      { message: 'Error updating participant' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/participants/[participantId] - Delete a participant
export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string; participantId: string } }
) {
  try {
    const eventIndex = db.events.findIndex(e => e.id === params.eventId);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    const participantIndex = db.events[eventIndex].participants?.findIndex(
      p => p.id === params.participantId
    );
    
    if (participantIndex === -1 || participantIndex === undefined) {
      return NextResponse.json(
        { message: 'Participant not found' },
        { status: 404 }
      );
    }
    
    // Remove the participant from the array
    db.events[eventIndex].participants!.splice(participantIndex, 1);
    db.events[eventIndex].updatedAt = new Date().toISOString();
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting participant ${params.participantId}:`, error);
    return NextResponse.json(
      { message: 'Error deleting participant' },
      { status: 500 }
    );
  }
}
