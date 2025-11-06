import { NextResponse } from 'next/server';
import { db, findEventById } from '@/lib/mockDb';
import { v4 as uuidv4 } from 'uuid';
import { Participant } from '@/types/event';

// GET /api/events/[eventId]/participants - Get all participants for an event
export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = findEventById(params.eventId);
    
    if (!event) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(event.participants || []);
  } catch (error) {
    console.error(`Error fetching participants for event ${params.eventId}:`, error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/participants - Add a new participant to an event
export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventIndex = db.events.findIndex(e => e.id === params.eventId);
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }
    
    const participantData: Omit<Participant, 'id' | 'eventId' | 'createdAt' | 'updatedAt'> = await request.json();
    
    const newParticipant: Participant = {
      ...participantData,
      id: uuidv4(),
      eventId: params.eventId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Initialize participants array if it doesn't exist
    if (!db.events[eventIndex].participants) {
      db.events[eventIndex].participants = [];
    }
    
    db.events[eventIndex].participants!.push(newParticipant);
    db.events[eventIndex].updatedAt = new Date().toISOString();
    
    return NextResponse.json(newParticipant, { status: 201 });
  } catch (error) {
    console.error(`Error adding participant to event ${params.eventId}:`, error);
    return NextResponse.json(
      { message: 'Error adding participant' },
      { status: 500 }
    );
  }
}
