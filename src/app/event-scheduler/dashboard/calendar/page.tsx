'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Calendar, Clock, MapPin, User, Building, Phone, Mail, Users, User as UserIcon, Phone as PhoneIcon, Mail as MailIcon, Calendar as CalendarIcon, Clock as ClockIcon, MapPin as MapPinIcon, UserCheck, Hash, Calendar as CalendarDays, Clock as ClockCircle, MapPin as MapPin2, User as User2, Building2, PhoneCall, Mail as Mail2, Users as Users2 } from 'lucide-react';

// Extend HTMLElement to include our custom properties
declare global {
  interface HTMLElement {
    _eventId?: string;
    _hoverHandler?: (e: MouseEvent) => void;
  }
}
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventApi, EventClickArg, EventContentArg, DateSelectArg } from '@fullcalendar/core';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Participant {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date | undefined;
  allDay: boolean;
  extendedProps: {
    venue: string;
    organization: string;
    organization_contact?: string;
    organization_email?: string;
    coordinator: string;
    performance_type: string;
    mode_of_event: string;
    participants: Participant[];
  };
  [key: string]: any; // For any additional properties
}

// Define EventInput type for form handling if needed
interface EventInput {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  extendedProps: {
    venue: string;
    organization: string;
    coordinator: string;
    performance_type: string;
    mode_of_event: string;
    participants: Participant[];
  };
}

interface Event {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay: boolean;
  extendedProps: {
    venue: string;
    organization: string;
    coordinator: string;
    performance_type: string;
    mode_of_event: string;
    participants: Array<{
      name?: string;
      phone?: string;
      email?: string;
      age?: number;
      gender?: string;
    }>;
  };
}

interface TooltipEvent {
  id: string;
  title: string;
  start: Date | string | null;
  end: Date | string | null;
  allDay: boolean;
  extendedProps: {
    venue: string;
    organization: string;
    organization_contact?: string;
    organization_email?: string;
    coordinator: string;
    performance_type: string;
    mode_of_event: string;
    participants: Participant[];
  };
}

// Function to get event color based on type
const getEventColor = (type: string = 'event', isBorder: boolean = false) => {
  const colors: {[key: string]: {bg: string, border: string, text: string, gradient: string}} = {
    'single': {
      bg: 'rgba(167, 139, 250, 0.2)',
      border: '#8b5cf6',
      text: '#7c3aed',
      gradient: 'from-purple-400 to-indigo-500'
    },
    'group': {
      bg: 'rgba(99, 102, 241, 0.2)',
      border: '#6366f1',
      text: '#4f46e5',
      gradient: 'from-blue-400 to-indigo-600'
    },
    'workshop': {
      bg: 'rgba(16, 185, 129, 0.2)',
      border: '#10b981',
      text: '#059669',
      gradient: 'from-emerald-400 to-green-500'
    },
    'meeting': {
      bg: 'rgba(245, 158, 11, 0.2)',
      border: '#f59e0b',
      text: '#d97706',
      gradient: 'from-amber-400 to-orange-500'
    },
    'conference': {
      bg: 'rgba(244, 63, 94, 0.2)',
      border: '#f43f5e',
      text: '#e11d48',
      gradient: 'from-rose-400 to-pink-600'
    },
    'default': {
      bg: 'rgba(156, 163, 175, 0.2)',
      border: '#9ca3af',
      text: '#6b7280',
      gradient: 'from-gray-400 to-slate-500'
    }
  };
  
  const colorSet = colors[type?.toLowerCase()] || colors['default'];
  return isBorder ? colorSet.border : colorSet.bg;
};

export default function CalendarPage() {
  // State hooks
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; event: TooltipEvent | null }>({ 
    x: 0, 
    y: 0, 
    event: null 
  });
  const [isHovering, setIsHovering] = useState(false);

  // Refs
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Router
  const router = useRouter();

  // Single useEffect for styles
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = `
      .fc-event {
        transition: all 0.2s ease-in-out !important;
      }
      .fc-event.single-event:hover {
        background-color: rgba(139, 92, 246, 0.4) !important;
      }
      .fc-event.group-event:hover {
        background-color: rgba(59, 130, 246, 0.4) !important;
      }
      .fc-event.workshop-event:hover {
        background-color: rgba(16, 185, 129, 0.4) !important;
      }
      .fc-event.meeting-event:hover {
        background-color: rgba(245, 158, 11, 0.4) !important;
      }
      .fc-event.conference-event:hover {
        background-color: rgba(244, 63, 94, 0.4) !important;
      }
      .fc-event.default-event:hover {
        background-color: rgba(156, 163, 175, 0.4) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('Fetching events...');
        const response = await fetch('/api/events');
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to fetch events: ${error}`);
        }

        const result = await response.json();
        console.log('API Response:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load events');
        }

        const eventsData = result.data || [];
        console.log('Raw events data from API:', JSON.stringify(eventsData, null, 2));
        
        // Transform the events data to match FullCalendar's expected format
        const formattedEvents = eventsData.map((event: any) => {
          console.log('Processing event:', event.id, 'Participants:', event.participants);
          
          // Parse date and time, handling timezone correctly
          const parseDateTime = (dateStr: string, timeStr?: string) => {
            if (!dateStr) return new Date();
            
            // If dateStr is already a full ISO string with time, use it directly
            if (dateStr.includes('T')) {
              return new Date(dateStr);
            }
            
            // Otherwise, combine date and time parts
            const datePart = dateStr.split('T')[0];
            const timePart = timeStr ? timeStr.split('.')[0] : '00:00:00';
            
            // Create a date string in local timezone
            const dateTimeStr = `${datePart}T${timePart}`;
            
            // Create date object
            const date = new Date(dateTimeStr);
            
            // If the date is invalid, return current date as fallback
            if (isNaN(date.getTime())) {
              console.warn(`Invalid date: ${dateTimeStr}`);
              return new Date();
            }
            
            return date;
          };
          
          // Parse start and end times
          const startDate = parseDateTime(event.date, event.start_time);
          let endDate = event.end_time ? parseDateTime(event.date, event.end_time) : new Date(startDate.getTime() + 3600000); // Default to 1 hour duration if no end time
          
          // If end time is before start time on the same day, adjust to next day
          if (endDate <= startDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
          }
          
          // Format the event title to include time and venue
          const formatTime = (date: Date) => {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          };
          
          const title = `${event.name}\n${formatTime(startDate)} - ${formatTime(endDate)}${event.venue ? `\n${event.venue}` : ''}`;
          
          // Determine event type for styling
          const eventType = event.performance_type?.toLowerCase() || 'default';
          const eventColors = getEventColor(eventType);
          
          return {
            id: event.id.toString(),
            title: title,
            start: startDate,
            end: endDate,
            allDay: false,
            extendedProps: {
              venue: event.venue || 'No venue specified',
              organization: event.organization_name || 'No organization',
              organization_contact: event.organization_contact,
              organization_email: event.organization_email,
              coordinator: event.event_coordinator || 'No coordinator',
              performance_type: event.performance_type || 'Not specified',
              mode_of_event: event.mode_of_event || 'Not specified',
              participants: event.participants || []
            },
            className: `${eventType}-event`,
            backgroundColor: eventColors,
            borderColor: getEventColor(eventType, true),
            textColor: '#1f2937', // dark gray text
            style: {
              '--hover-bg-color': getEventColor(eventType, false),
              '--bg-color': eventColors
            } as React.CSSProperties,
            display: 'block',
            editable: true,
            startEditable: true,
            durationEditable: true
          };
        });
        
        console.log('Formatted events:', JSON.stringify(formattedEvents, null, 2));
        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load calendar events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleEventMouseEnter = useCallback((e: any) => {
    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const event = e.event || (e.el?.fcSeg?.eventRange?.def || null);
    if (!event) return;

    // Get the event element's position
    const el = e.el || document.querySelector(`[data-event-id="${event.id}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    
    // Set tooltip position and content
    setTooltip(prev => ({
      ...prev,
      x: rect.left + (rect.width / 2) + window.scrollX,
      y: rect.top + window.scrollY,
      event: {
        id: event.id,
        title: event.title,
        start: event.start ? (typeof event.start === 'string' ? new Date(event.start) : event.start) : null,
        end: event.end ? (typeof event.end === 'string' ? new Date(event.end) : event.end) : null,
        allDay: event.allDay || false,
        extendedProps: {
          venue: event.extendedProps?.venue || 'Not specified',
          organization: event.extendedProps?.organization || 'Not specified',
          coordinator: event.extendedProps?.coordinator || 'Not specified',
          performance_type: event.extendedProps?.performance_type || 'event',
          mode_of_event: event.extendedProps?.mode_of_event || 'in-person',
          participants: event.extendedProps?.participants || []
        }
      }
    }));
    
    // Only set hovering to true after a small delay to prevent flickering
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
    }, 50);
  }, []);

  const handleEventMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    setIsHovering(false);
    
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHovering) {
        setTooltip(prev => ({
          ...prev,
          event: null
        }));
      }
    }, 300);
  }, [isHovering]);

  const handleTooltipMouseEnter = () => {
    setIsHovering(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsHovering(false);
    setTooltip({ x: 0, y: 0, event: null });
  };

  const handleEventClick = (clickInfo: any) => {
    const eventId = clickInfo.event.id;
    router.push(`/event-scheduler/dashboard/events/${eventId}`);
  };

  const handleDateSelect = (selectInfo: any) => {
    // Navigate to create event with pre-filled date
    const start = selectInfo.startStr;
    const end = selectInfo.endStr;
    router.push(`/event-scheduler/dashboard/create-event?start=${start}&end=${end}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-r from-indigo-50 to-blue-50 p-4 md:p-8 relative">
      {/* Tooltip */}
      {tooltip.event && (
        <div
          ref={tooltipRef}
          className="fixed z-9999 bg-white text-gray-800 text-sm p-4 rounded-lg shadow-xl pointer-events-auto transition-all duration-200 border border-gray-200 max-h-[80vh] overflow-hidden flex flex-col"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            opacity: isHovering ? 1 : 0,
            pointerEvents: isHovering ? 'auto' : 'none',
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
            width: '320px',
            maxHeight: '80vh',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-base text-indigo-700 border-b pb-2 mb-2">
              <CalendarDays className="h-4 w-4" />
              <span>{tooltip.event.title || 'Untitled Event'}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">Date</div>
                  <div>{tooltip.event.start ? format(new Date(tooltip.event.start), 'MMM d, yyyy') : 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">Time</div>
                  <div>
                    {tooltip.event.start ? format(new Date(tooltip.event.start), 'h:mm a') : 'N/A'}
                    {tooltip.event.end && ` - ${format(new Date(tooltip.event.end), 'h:mm a')}`}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">Venue</div>
                  <div>{tooltip.event.extendedProps.venue || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <UserCheck className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">Coordinator</div>
                  <div>{tooltip.event.extendedProps.coordinator || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">Organization</div>
                  <div>{tooltip.event.extendedProps.organization || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">Contact</div>
                  <div>{tooltip.event.extendedProps.organization_contact || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <div className="text-gray-500 text-xs">Email</div>
                  <div>{tooltip.event.extendedProps.organization_email || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            {tooltip.event.extendedProps.participants?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 font-medium text-gray-700 mb-2">
                  <Users className="h-4 w-4" />
                  <span>Participants ({tooltip.event.extendedProps.participants.length})</span>
                </div>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {tooltip.event.extendedProps.participants.map((p: any, index: number) => (
                    <div key={index} className="text-xs bg-indigo-50/50 p-3 rounded-lg hover:bg-indigo-100/50 transition-colors border border-indigo-100">
                      <div className="flex items-center gap-2 font-medium text-indigo-900 mb-1">
                        <User2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{p.name || 'Unnamed Participant'}</span>
                      </div>
                      <div className="pl-5 space-y-1">
                        {p.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail2 className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="text-xs">{p.email}</span>
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <PhoneCall className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="text-xs">{p.phone}</span>
                          </div>
                        )}
                        {(p.age || p.gender) && (
                          <div className="flex items-center gap-3 text-gray-500 text-xs pt-1">
                            {p.age && <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {p.age} years</span>}
                            {p.gender && <span className="flex items-center gap-1"><User2 className="h-3 w-3" /> {p.gender}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-purple-600 mb-6">
              Event Calendar
            </h1>
            <p className="text-indigo-600 mt-1">Manage and track all your events in one place</p>
          </div>
          <Button
            onClick={() => router.push('/event-scheduler/dashboard/create-event')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Event
          </Button>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="p-6">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              events={events}
              eventClick={handleEventClick}
              select={handleDateSelect}
              eventMouseEnter={handleEventMouseEnter}
              eventMouseLeave={handleEventMouseLeave}
              eventDidMount={(arg) => {
                const el = arg.el;
                if (!el) return;
                
                el.classList.add('calendar-event');
                el.style.cursor = 'pointer';
                el.setAttribute('data-event-id', arg.event.id);
                
                // Store the event ID on the element for reference
                el._eventId = arg.event.id;
                
                // Use a single handler for both mouseenter and mouseleave
                const handleHover = (e: MouseEvent) => {
                  if (e.type === 'mouseenter') {
                    e.stopPropagation();
                    handleEventMouseEnter({ event: arg.event, el });
                  } else if (e.type === 'mouseleave') {
                    handleEventMouseLeave();
                  }
                };
                
                el.addEventListener('mouseenter', handleHover);
                el.addEventListener('mouseleave', handleHover);
                
                // Store the handler for cleanup
                el._hoverHandler = handleHover;
              }}
              eventWillUnmount={(arg) => {
                const el = arg.el;
                if (!el || !el._hoverHandler) return;
                
                // Clean up event listeners
                el.removeEventListener('mouseenter', el._hoverHandler);
                el.removeEventListener('mouseleave', el._hoverHandler);
                delete el._hoverHandler;
                delete el._eventId;
              }}
              height="auto"
              fixedWeekCount={false}
              firstDay={1}
              dayMaxEventRows={3}
              moreLinkContent={({ num }: { num: number }) => `+${num} more`}
              dayHeaderClassNames="text-sm font-semibold text-gray-600 py-3 border-b border-gray-100"
              dayCellClassNames="hover:bg-gray-50/50 transition-colors duration-200 border-r border-b border-gray-50"
              eventClassNames={(arg: EventContentArg) => {
                const type = arg.event.extendedProps.performance_type?.toLowerCase() || 'default';
                const isActive = tooltip.event?.id === arg.event.id && isHovering;
                const colors = {
                  'single': `bg-purple-50 border-l-4 border-purple-500 ${isActive ? 'bg-purple-100' : 'hover:bg-purple-100'}`,
                  'group': `bg-blue-50 border-l-4 border-blue-500 ${isActive ? 'bg-blue-100' : 'hover:bg-blue-100'}`,
                  'workshop': `bg-emerald-50 border-l-4 border-emerald-500 ${isActive ? 'bg-emerald-100' : 'hover:bg-emerald-100'}`,
                  'meeting': `bg-amber-50 border-l-4 border-amber-500 ${isActive ? 'bg-amber-100' : 'hover:bg-amber-100'}`,
                  'conference': `bg-rose-50 border-l-4 border-rose-500 ${isActive ? 'bg-rose-100' : 'hover:bg-rose-100'}`,
                  'default': `bg-gray-50 border-l-4 border-gray-400 ${isActive ? 'bg-gray-100' : 'hover:bg-gray-100'}`
                };
                return [
                  'group m-1 p-2 rounded-r-md',
                  'text-sm font-medium',
                  'shadow-sm',
                  'transition-all duration-200',
                  'cursor-pointer',
                  'relative',
                  'z-10',
                  isActive ? 'shadow-md' : 'hover:shadow-md',
                  colors[type as keyof typeof colors] || colors['default']
                ].join(' ');
              }}
              eventContent={(arg: EventContentArg) => {
                const event = arg.event;
                const startDate = event.start ? (typeof event.start === 'string' ? new Date(event.start) : event.start) : null;
                const timeText = startDate ? format(startDate, 'h:mm a') : '';
                
                return (
                  <div className="w-full h-full p-1">
                    <div className="text-sm font-semibold truncate">
                      {event.title}
                    </div>
                    {timeText && (
                      <div className="text-xs text-gray-600">
                        {timeText}
                      </div>
                    )}
                  </div>
                );
              }}
              dayCellContent={(args: { isToday: boolean; dayNumberText: string }) => (
                <div className={`flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full ${
                  args.isToday ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white' : 'text-gray-700'
                }`}>
                  {args.dayNumberText.replace('\n', '')}
                </div>
              )}
            />
          </div>
        </div>
      </div>
      
      {/* Add a subtle gradient overlay at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-linear-to-t from-white to-transparent pointer-events-none"></div>
    </div>
  );
}

// Event content rendering is now handled by the eventContent prop in FullCalendar
