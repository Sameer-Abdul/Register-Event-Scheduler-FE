'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  dateFnsLocalizer, 
  Event as RBCEvent, 
  Views, 
  EventProps,
  ToolbarProps,
  View,
  DateLocalizer
} from 'react-big-calendar';
import { 
  format, 
  parse, 
  startOfWeek, 
  getDay, 
  isToday as isDateToday,
  isSameDay,
  differenceInMinutes
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { PlusCircle, RefreshCw, MapPin, Users, Clock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Event as ApiEvent, PerformanceType } from '@/types/event';
import EventDetailsModal from './EventDetailsModal';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Define the CalendarView props interface
interface CalendarViewProps {
  events?: ApiEvent[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onEventClick?: (event: ApiEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  defaultView?: View;
  className?: string;
}

// Extend the base RBC event type with our custom fields
type CalendarEvent = ApiEvent & RBCEvent & {
  title: string;
  allDay?: boolean;
  isPast?: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  resource?: any;
};

// Custom event component for better visual representation
const EventComponent: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const duration = differenceInMinutes(end, start);
  
  return (
    <div className="p-1 h-full">
      <div className={cn(
        "p-2 rounded-md text-xs h-full overflow-hidden",
        {
          'bg-blue-50 border-l-4 border-blue-500': !event.isPast,
          'bg-gray-100 border-l-4 border-gray-400': event.isPast,
          'border-l-red-500': event.performanceType === 'single',
          'border-l-green-500': event.performanceType === 'group'
        }
      )}>
        <div className="font-medium truncate">{event.title}</div>
        <div className="flex items-center mt-0.5 text-gray-600">
          <Clock className="w-3 h-3 mr-1" />
          <span>
            {format(start, 'h:mma')} - {format(end, 'h:mma')} • {duration} min
          </span>
        </div>
        {event.venue && (
          <div className="flex items-center mt-0.5 text-gray-600">
            <MapPin className="w-3 h-3 mr-1 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        )}
        <div className="flex items-center mt-0.5 text-gray-600">
          <Users className="w-3 h-3 mr-1" />
          <span className="capitalize">{event.performanceType} Event</span>
        </div>
      </div>
    </div>
  );
};

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

const CalendarView: React.FC<CalendarViewProps> = ({
  events: eventsData = [],
  loading = false,
  error = null,
  onRefresh,
  onEventClick,
  onSelectSlot,
  defaultView = 'week' as View,
  className = '',
}) => {
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState(defaultView);
  const router = useRouter();

  // Transform API data to calendar events with additional metadata
  const events: CalendarEvent[] = useMemo(() => {
    const now = new Date();
    return eventsData.map(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return {
        ...event,
        title: event.name,
        start,
        end,
        allDay: false,
        isPast: end < now,
        isToday: isSameDay(start, now),
        isSelected: selectedEvent?.id === event.id,
      };
    });
  }, [eventsData, selectedEvent]);

  // Handle event selection
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    if (onEventClick) {
      onEventClick(event);
    }
  }, [onEventClick]);

  // Handle date navigation
  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  // Handle view change
  const handleViewChange = useCallback((newView: string) => {
    setView(newView);
  }, []);

  // Handle slot selection for creating new events
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    if (onSelectSlot) {
      onSelectSlot({ start, end });
    }
  }, [onSelectSlot]);

  // Custom toolbar with navigation and view controls
  const CustomToolbar: React.FC<ToolbarProps<CalendarEvent, object>> = (toolbar) => {
    return (
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toolbar.onNavigate('TODAY')}
            className="text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toolbar.onNavigate('PREV')}
            className="h-8 w-8"
          >
            &lt;
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toolbar.onNavigate('NEXT')}
            className="h-8 w-8"
          >
            &gt;
          </Button>
          <div className="ml-2 text-sm font-medium">
            {toolbar.label}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1">
            <Button
              variant={toolbar.view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toolbar.onView('month')}
              className="text-xs"
            >
              Month
            </Button>
            <Button
              variant={toolbar.view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toolbar.onView('week')}
              className="text-xs"
            >
              Week
            </Button>
            <Button
              variant={toolbar.view === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toolbar.onView('day')}
              className="text-xs"
            >
              Day
            </Button>
            <Button
              variant={toolbar.view === 'agenda' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toolbar.onView('agenda')}
              className="text-xs"
            >
              Agenda
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              size="sm"
              onClick={() => router.push('/payment/success/create')}
              className="text-xs"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading events</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
        <div className="mt-6">
          <Button
            onClick={() => router.push('/payment/success/create')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            New Event
          </Button>
        </div>
      </div>
    );
  }

  // Main calendar view
  return (
    <div className={cn('h-[calc(100vh-200px)]', className)}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={handleSelectEvent}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        view={view}
        date={currentDate}
        defaultView={defaultView}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        selectable={!!onSelectSlot}
        onSelectSlot={onSelectSlot ? handleSelectSlot : undefined}
        components={{
          event: EventComponent,
          toolbar: CustomToolbar,
        }}
        eventPropGetter={(event) => ({
          className: cn(
            'overflow-hidden',
            event.isPast ? 'opacity-70' : 'opacity-100',
            {
              'border-l-4 border-red-500': event.performanceType === 'single',
              'border-l-4 border-green-500': event.performanceType === 'group',
            }
          ),
        })}
        dayPropGetter={(date) => ({
          className: isDateToday(date) ? 'bg-blue-50' : '',
        })}
        messages={{
          next: 'Next',
          previous: 'Prev',
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Time',
          event: 'Event',
          noEventsInRange: 'No events found in this date range.',
        }}
      />

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            if (selectedEvent.id) {
              router.push(`/payment/success/events/${selectedEvent.id}/edit`);
            }
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};
