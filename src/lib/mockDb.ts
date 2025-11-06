import { v4 as uuidv4 } from 'uuid';
import { Event, Participant } from '@/types/event';

// In-memory database for development
const db = {
  events: [] as Event[],
  participants: new Map<string, Participant[]>(),
};

// Helper function to find an event by ID
const findEventById = (id: string): Event | undefined => {
  return db.events.find(event => event.id === id);
};

// Helper function to find events by user ID (for filtering)
const findEventsByUserId = (userId: string): Event[] => {
  return db.events.filter(event => event.userId === userId);
};

// Create a new event
const createEvent = (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'userId'>, userId: string): Event => {
  const newEvent: Event = {
    ...eventData,
    id: uuidv4(),
    userId,
    participants: eventData.participants || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  db.events.push(newEvent);
  return newEvent;
};

// Update an existing event
const updateEvent = (id: string, updates: Partial<Event>): Event | null => {
  const eventIndex = db.events.findIndex(e => e.id === id);
  if (eventIndex === -1) return null;
  
  const updatedEvent = {
    ...db.events[eventIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  db.events[eventIndex] = updatedEvent;
  return updatedEvent;
};

// Delete an event
const deleteEvent = (id: string): boolean => {
  const initialLength = db.events.length;
  db.events = db.events.filter(event => event.id !== id);
  return db.events.length < initialLength;
};

// Initialize with some mock data if needed
const initializeMockData = () => {
  if (db.events.length === 0) {
    const event1: Event = {
      id: uuidv4(),
      name: 'Team Meeting',
      description: 'Weekly team sync',
      start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      end: new Date(Date.now() + 86400000 + 3600000).toISOString(), // 1 hour later
      organizationPOC: 'John Doe',
      pocMobile: '+1234567890',
      pocEmail: 'john@example.com',
      alternateNumber: '+1987654321',
      venue: 'Conference Room A',
      organizationName: 'Acme Inc',
      latitude: 40.7128,
      longitude: -74.0060,
      eventCoordinator: 'Jane Smith',
      comments: 'Bring your laptops',
      participants: [],
      performanceType: 'single',
      userId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const event2: Event = {
      id: uuidv4(),
      name: 'Product Demo',
      description: 'Showcase new features',
      start: new Date(Date.now() + 172800000).toISOString(), // 2 days later
      end: new Date(Date.now() + 172800000 + 7200000).toISOString(), // 2 hours later
      organizationPOC: 'Alice Johnson',
      pocMobile: '+1987654321',
      pocEmail: 'alice@example.com',
      alternateNumber: '+1234567890',
      venue: 'Online',
      organizationName: 'Tech Corp',
      latitude: 37.7749,
      longitude: -122.4194,
      eventCoordinator: 'Bob Wilson',
      comments: 'Join via Zoom link',
      participants: [],
      performanceType: 'group',
      userId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.events = [event1, event2];
  }
};

// Initialize mock data
initializeMockData();

export { 
  db, 
  findEventById, 
  findEventsByUserId, 
  createEvent, 
  updateEvent, 
  deleteEvent 
};

export default db;
