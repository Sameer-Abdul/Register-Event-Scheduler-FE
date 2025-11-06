'use client';

import { useState, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { useQuery } from '@tanstack/react-query';
import { Event as EventType } from '@/types/event';
import EventDetailsModal from '@/components/events/EventDetailsModal';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

export default function CalendarView() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);

  // Fetch events from the API
  const { data: events = [], isLoading } = useQuery<EventType[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
  });

  const handleSelectEvent = useCallback((event: Event) => {
    setSelectedEvent(event as EventType);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleNavigate = () => {
    router.push('/events/create');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your scheduled events
          </p>
        </div>
        <Button onClick={handleNavigate} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Event
        </Button>
      </div>
      
      <div className="flex-1 rounded-lg bg-white p-4 shadow">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: '#4f46e5',
              borderRadius: '4px',
              opacity: 0.9,
              color: 'white',
              border: '0px',
              display: 'block',
            },
          })}
          components={{
            event: (props) => (
              <div 
                {...props}
                className="px-2 py-1 text-sm truncate"
                title={props.title}
              >
                {props.title}
              </div>
            ),
          }}
        />
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
