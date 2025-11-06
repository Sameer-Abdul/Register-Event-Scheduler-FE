'use client';

import { useState, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import { useQuery } from '@tanstack/react-query';
import { Event as EventType } from '@/types/event';
import EventDetailsModal from '@/components/events/EventDetailsModal';

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

export default function CalendarPage() {
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Calendar</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage your scheduled events
        </p>
      </div>
      
      <div className="h-[calc(100%-4rem)] rounded-lg bg-white p-4 shadow">
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
              opacity: 0.8,
              color: 'white',
              border: '0px',
              display: 'block',
            },
          })}
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
