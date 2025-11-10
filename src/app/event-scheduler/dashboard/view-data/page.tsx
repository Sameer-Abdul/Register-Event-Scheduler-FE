'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Search, Edit, Trash2, ChevronDown, ChevronUp, Plus, Calendar as CalendarIcon, Clock, MapPin, User, Phone, Mail, Users, Save as SaveIcon, X as XIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Participant {
  id?: string;
  name: string;
  age: number | string;
  phone: string;
  phone_no?: string; // For backward compatibility
  email?: string;
  address: string;
  gender: string;
  prerequisite?: string;
  prerequisites_completed?: string; // Added missing field
  latitude?: string;
  longitude?: string;
  comments?: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  latitude?: string;
  longitude?: string;
  event_coordinator: string;
  performance_type: 'single' | 'group';
  participants: Participant[];
  organization_name: string;
  organization_contact: string;
  organization_email: string;
  mode_of_event: 'in-person' | 'virtual';
  comments?: string;
  zoom_join_url?: string;
  zoom_meeting_id?: string;
  zoom_password?: string;
  zoom_host_url?: string;
}

export default function ViewDataPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tooltip, setTooltip] = useState<{x: number; y: number; content: string; visible: boolean}>({x: 0, y: 0, content: '', visible: false});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch events from the API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching events with participants...');
        
        // First, get all events
        const eventsResponse = await fetch('/api/events');
        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch events');
        }
        const eventsData = await eventsResponse.json();
        const events = eventsData.data || [];
        
        console.log(`Fetched ${events.length} events`);
        
        // Debug: Check the raw events data from the API
        console.log('Raw events data from API:', events);
        
        // Then, fetch participants for each event
        const eventsWithParticipants = await Promise.all(
          events.map(async (event: any) => {
            try {
              console.log(`Fetching details for event ${event.id} (${event.name})`);
              const participantsResponse = await fetch(`/api/events?id=${event.id}`);
              if (!participantsResponse.ok) {
                console.error(`Failed to fetch participants for event ${event.id}`);
                return { 
                  ...event, 
                  participants: [],
                  // Ensure zoom_join_url is included even if there's an error
                  zoom_join_url: event.zoom_join_url,
                  zoom_meeting_id: event.zoom_meeting_id,
                  zoom_password: event.zoom_password,
                  zoom_host_url: event.zoom_host_url
                };
              }
              const eventData = await participantsResponse.json();
              
              // Debug: Log the full event data for this event
              console.log(`Event ${event.id} (${event.name}) full data:`, eventData.data);
              
              return {
                ...event,
                ...eventData.data, // Spread the full event data to ensure we have all fields
                participants: eventData.data?.participants || [],
                // Ensure zoom_join_url is explicitly included
                zoom_join_url: event.zoom_join_url || eventData.data?.zoom_join_url,
                zoom_meeting_id: event.zoom_meeting_id || eventData.data?.zoom_meeting_id,
                zoom_password: event.zoom_password || eventData.data?.zoom_password,
                zoom_host_url: event.zoom_host_url || eventData.data?.zoom_host_url,
                // Ensure mode_of_event is preserved
                mode_of_event: event.mode_of_event || eventData.data?.mode_of_event
              };
            } catch (error) {
              console.error(`Error fetching participants for event ${event.id}:`, error);
              return { 
                ...event, 
                participants: [],
                // Ensure zoom_join_url is included even if there's an error
                zoom_join_url: event.zoom_join_url,
                zoom_meeting_id: event.zoom_meeting_id,
                zoom_password: event.zoom_password,
                zoom_host_url: event.zoom_host_url
              };
            }
          })
        );
        
        console.log('Fetched events with participants:', eventsWithParticipants);
        
        // Debug: Check if zoom_join_url exists in the events
        eventsWithParticipants.forEach((event, index) => {
          console.log(`Event ${index + 1} (${event.name}):`, {
            id: event.id,
            mode_of_event: event.mode_of_event,
            has_zoom_join_url: !!event.zoom_join_url,
            zoom_join_url: event.zoom_join_url,
            zoom_meeting_id: event.zoom_meeting_id
          });
        });
        
        setEvents(eventsWithParticipants);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast({
          title: 'Error',
          description: 'Failed to load events. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [toast]);

  // Filter events based on search term
  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.venue && event.venue.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.event_coordinator && event.event_coordinator.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format time to 12-hour format
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format date for input field
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    return format(parseISO(dateString), 'yyyy-MM-dd');
  };

  // Format time for input field
  const formatTimeForInput = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // Return HH:MM format
  };

  // Toggle event expansion
  const toggleExpand = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Handle edit button click
  const handleEdit = (event: Event) => {
    setEditingEvent({...event});
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingEvent(null);
  };

  // Handle input change for editing
  const handleInputChange = (field: keyof Event, value: any) => {
    if (!editingEvent) return;
    setEditingEvent({
      ...editingEvent,
      [field]: value
    });
  };

  // Handle participant field change
  const handleParticipantChange = (index: number, field: keyof Participant, value: any) => {
    if (!editingEvent) return;
    const updatedParticipants = [...editingEvent.participants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      [field]: value
    };
    setEditingEvent({
      ...editingEvent,
      participants: updatedParticipants
    });
  };

  // Add new participant
  const addParticipant = () => {
    if (!editingEvent) return;
    const newParticipant: Participant = {
      name: '',
      age: '',
      phone: '',
      email: '',
      address: '',
      gender: '',
      prerequisite: '',
      latitude: '',
      longitude: '',
      comments: ''
    };
    setEditingEvent({
      ...editingEvent,
      participants: [...editingEvent.participants, newParticipant]
    });
  };

  // Remove participant
  const removeParticipant = (index: number) => {
    if (!editingEvent) return;
    const updatedParticipants = [...editingEvent.participants];
    updatedParticipants.splice(index, 1);
    setEditingEvent({
      ...editingEvent,
      participants: updatedParticipants
    });
  };

  // Save the edited event
  const handleSave = async () => {
    if (!editingEvent) return;
    
    setIsSaving(true);
    try {
      console.log('Saving event:', editingEvent);
      
      // Prepare the request body
      const requestBody = {
        ...editingEvent,
        // Ensure date is in the correct format if it exists
        date: editingEvent.date ? new Date(editingEvent.date).toISOString() : null,
        // Ensure participants have the correct structure
        participants: editingEvent.participants?.map(p => ({
          ...p,
          // Ensure phone_no is set if phone exists and phone_no doesn't
          phone_no: p.phone_no || p.phone,
          // Ensure prerequisites_completed is a boolean
          prerequisites_completed: Boolean(p.prerequisites_completed || p.prerequisite === 'true')
        })) || []
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`/api/events?id=${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Error response:', responseData);
        throw new Error(responseData.error || 'Failed to update event');
      }

      console.log('Update successful, response:', responseData);
      
      // Update the events list with the edited event from the server response
      setEvents(events.map(event => 
        event.id === editingEvent.id ? responseData.data : event
      ));
      
      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });
      
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle event deletion
  const handleDelete = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/events?id=${eventId}`, {
          method: 'DELETE',
        });

        if (response.status === 204) {
          // Success - no content returned
          // Remove the deleted event from the list
          setEvents(events.filter(event => event.id !== eventId));
          
          toast({
            title: 'Success',
            description: 'Event deleted successfully',
          });
        } else {
          // Handle error response
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || 'Failed to delete event');
        }
      } catch (error: any) {
        console.error('Error deleting event:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete event. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  // Tooltip content generation function
  const getTooltipContent = (event: Event) => {
    return [
      `Event Name: ${event.name || 'N/A'}`,
      `Date: ${event.date ? format(new Date(event.date), 'MMM d, yyyy') : 'N/A'}`,
      `Time: ${event.start_time ? formatTime(event.start_time) : 'N/A'}${event.end_time ? ` to ${formatTime(event.end_time)}` : ''}`,
      `Venue: ${event.venue || 'N/A'}`,
      `Coordinator: ${event.event_coordinator || 'N/A'}`,
      `Organization: ${event.organization_name || 'N/A'}`,
      `Contact: ${event.organization_contact || 'N/A'}`,
      `Email: ${event.organization_email || 'N/A'}`,
      `Participants: ${event.participants?.length || 0}`
    ].join('\n');
  };

  // Handle mouse move for custom tooltip
  const handleMouseMove = (e: React.MouseEvent, event: Event) => {
    setTooltip({
      x: e.clientX,
      y: e.clientY - 10, // Position above the cursor
      content: getTooltipContent(event),
      visible: true
    });
  };

  // Hide tooltip when mouse leaves the row
  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Event Scheduler - View Data</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/event-scheduler/dashboard/create-event" className="whitespace-nowrap">
              Create New Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Display all created events in table:</h2>
        
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search events..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No events found</p>
            <Button className="mt-4" asChild>
              <Link href="/event-scheduler/dashboard/create-event">
                Create your first event
              </Link>
            </Button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-blue-600">
                <TableRow className="hover:bg-blue-600">
                  <TableHead className="w-12 text-white font-semibold border-r border-blue-500 text-center">S.No</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Event Name</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Coordinator</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Date</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Time</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Venue</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Organization</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Contact</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Email</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Type</TableHead>
                  <TableHead className="text-white font-semibold border-r border-blue-500">Mode</TableHead>
                  <TableHead className="text-white font-semibold text-center border-r border-blue-500">Participants</TableHead>
                  <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {filteredEvents.map((event, index) => (
                  <Fragment key={`fragment-${event.id}`}>
                    <TableRow 
                      key={event.id} 
                      className={`${index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'} 
                      transition-colors duration-200 cursor-pointer`}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.style.transform = 'translateY(0)';
                      }}
                    >
                      <TableCell 
                        className="text-center text-sm text-gray-600 font-medium border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Click to view details"
                      >
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(event.id);
                            }}
                            className="text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 rounded p-1"
                            aria-label={expandedEvents[event.id] ? 'Collapse details' : 'Expand details'}
                          >
                            {expandedEvents[event.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <span className="ml-2">{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell 
                        className="font-medium border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Name"
                      >
                        <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                          {editingEvent?.id === event.id ? (
                            <Input
                              value={editingEvent.name || ''}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              className="h-8 text-sm"
                            />
                          ) : (
                            event.name
                          )}
                        </div>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Coordinator"
                      >
                        <div className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                          {editingEvent?.id === event.id ? (
                            <Input
                              value={editingEvent.event_coordinator || ''}
                              onChange={(e) => handleInputChange('event_coordinator', e.target.value)}
                              className="h-8 text-sm"
                            />
                          ) : (
                            event.event_coordinator || 'N/A'
                          )}
                        </div>
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Date"
                      >
                        {editingEvent?.id === event.id ? (
                          <Input
                            type="date"
                            value={editingEvent.date ? formatDateForInput(editingEvent.date) : ''}
                            onChange={(e) => handleInputChange('date', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {event.date ? format(new Date(event.date), 'MMM dd, yyyy') : 'N/A'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Event Time"
                      >
                        {event.start_time ? (
                          editingEvent?.id === event.id ? (
                            <div className="flex space-x-2">
                              <Input
                                type="time"
                                value={editingEvent.start_time ? formatTimeForInput(editingEvent.start_time) : ''}
                                onChange={(e) => handleInputChange('start_time', e.target.value)}
                                className="h-8 text-sm w-24"
                              />
                              <span className="flex items-center">-</span>
                              <Input
                                type="time"
                                value={editingEvent.end_time ? formatTimeForInput(editingEvent.end_time) : ''}
                                onChange={(e) => handleInputChange('end_time', e.target.value)}
                                className="h-8 text-sm w-24"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                              {formatTime(event.start_time)}
                              {event.end_time && ` - ${formatTime(event.end_time)}`}
                            </span>
                          )
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell 
                        className="max-w-[200px] truncate border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Venue"
                      >
                        {editingEvent?.id === event.id ? (
                          <Input
                            value={editingEvent.venue || ''}
                            onChange={(e) => handleInputChange('venue', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {event.venue || 'N/A'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Organization"
                      >
                        {editingEvent?.id === event.id ? (
                          <Input
                            value={editingEvent.organization_name || ''}
                            onChange={(e) => handleInputChange('organization_name', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <div className="text-sm text-gray-900 group-hover:text-gray-800 transition-colors duration-200">
                            {event.organization_name || 'N/A'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Contact"
                      >
                        {editingEvent?.id === event.id ? (
                          <Input
                            value={editingEvent.organization_contact || ''}
                            onChange={(e) => handleInputChange('organization_contact', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {event.organization_contact || 'N/A'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Email"
                      >
                        {editingEvent?.id === event.id ? (
                          <Input
                            type="email"
                            value={editingEvent.organization_email || ''}
                            onChange={(e) => handleInputChange('organization_email', e.target.value)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors duration-200">
                            {event.organization_email || 'N/A'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Type"
                      >
                        {editingEvent?.id === event.id ? (
                          <select
                            value={editingEvent.performance_type || 'single'}
                            onChange={(e) => handleInputChange('performance_type', e.target.value as 'single' | 'group')}
                            className="h-8 text-sm border rounded-md px-2 py-1 w-full"
                          >
                            <option value="single">Single</option>
                            <option value="group">Group</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {event.performance_type 
                              ? event.performance_type === 'single' ? 'Single' : 'Group'
                              : 'N/A'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell 
                        className="border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title={event.mode_of_event === 'virtual' ? 'Virtual Meeting' : 'In-Person'}
                      >
                        {event.mode_of_event === 'virtual' && event.zoom_join_url ? (
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs text-gray-500">Virtual</span>
                            <a 
                              href={event.zoom_join_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm truncate max-w-[180px] block"
                              onClick={(e) => e.stopPropagation()}
                              title={event.zoom_join_url}
                            >
                              {event.zoom_join_url.replace('https://', '')}
                            </a>
                            {event.zoom_password && (
                              <span className="text-xs text-gray-500">
                                Password: {event.zoom_password}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-700">
                            {event.mode_of_event || 'In-Person'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell 
                        className="text-center border-r border-gray-200 group-hover:bg-blue-50 transition-colors duration-200"
                        title="Number of Participants"
                      >
                        <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-linear-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium border border-blue-200 group-hover:from-blue-50 group-hover:to-blue-100 transition-all duration-200">
                          {event.participants?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 pr-2">
                          {editingEvent?.id === event.id ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 px-3 text-sm text-green-600 hover:bg-green-50 border-green-200 hover:border-green-300"
                                onClick={handleSave}
                                disabled={isSaving}
                              >
                                <SaveIcon className="h-3.5 w-3.5 mr-1.5" />
                                {isSaving ? 'Saving...' : 'Save'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 px-3 text-sm text-gray-600 hover:bg-gray-50 border-gray-200 hover:border-gray-300"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                              >
                                <XIcon className="h-3.5 w-3.5 mr-1.5" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 px-3 text-sm"
                                onClick={() => handleEdit(event)}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 px-3 text-sm text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                                onClick={() => handleDelete(event.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {(expandedEvents[event.id] || editingEvent?.id === event.id) && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={13} className="p-0 border-t border-gray-200">
                          <div className="p-6 bg-white border border-gray-100 rounded-b-lg mx-2 mb-2">
                            {editingEvent?.id === event.id ? (
                              <div className="space-y-8">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Event Information</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Event Name *</label>
                                      <Input
                                        value={editingEvent.name || ''}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Event Date *</label>
                                      <Input
                                        type="date"
                                        value={editingEvent.date ? formatDateForInput(editingEvent.date) : ''}
                                        onChange={(e) => handleInputChange('date', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Start Time *</label>
                                      <Input
                                        type="time"
                                        value={editingEvent.start_time || ''}
                                        onChange={(e) => handleInputChange('start_time', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">End Time *</label>
                                      <Input
                                        type="time"
                                        value={editingEvent.end_time || ''}
                                        onChange={(e) => handleInputChange('end_time', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Organization Information */}
                                <div className="space-y-4">
                                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Organization Information</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Organization Name *</label>
                                      <Input
                                        value={editingEvent.organization_name || ''}
                                        onChange={(e) => handleInputChange('organization_name', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Organization POC *</label>
                                      <Input
                                        value={editingEvent.organization_contact || ''}
                                        onChange={(e) => handleInputChange('organization_contact', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Contact Number *</label>
                                      <Input
                                        type="tel"
                                        value={editingEvent.organization_contact || ''}
                                        onChange={(e) => handleInputChange('organization_contact', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Email *</label>
                                      <Input
                                        type="email"
                                        value={editingEvent.organization_email || ''}
                                        onChange={(e) => handleInputChange('organization_email', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Venue and Coordinator */}
                                <div className="space-y-4">
                                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Venue & Coordinator</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Venue *</label>
                                      <Input
                                        value={editingEvent.venue || ''}
                                        onChange={(e) => handleInputChange('venue', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Latitude</label>
                                      <Input
                                        type="text"
                                        value={editingEvent.latitude || ''}
                                        onChange={(e) => handleInputChange('latitude', e.target.value)}
                                        className="h-10"
                                        placeholder="e.g., 40.7128"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Longitude</label>
                                      <Input
                                        type="text"
                                        value={editingEvent.longitude || ''}
                                        onChange={(e) => handleInputChange('longitude', e.target.value)}
                                        className="h-10"
                                        placeholder="e.g., -74.0060"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Event Coordinator *</label>
                                      <Input
                                        value={editingEvent.event_coordinator || ''}
                                        onChange={(e) => handleInputChange('event_coordinator', e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Event Type and Mode */}
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Mode of Event *</label>
                                      <div className="flex space-x-4 mt-2">
                                        <label className="inline-flex items-center">
                                          <input
                                            type="radio"
                                            className="form-radio h-4 w-4 text-blue-600"
                                            checked={editingEvent.mode_of_event === 'in-person'}
                                            onChange={() => handleInputChange('mode_of_event', 'in-person')}
                                          />
                                          <span className="ml-2 text-gray-700">In-Person</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                          <input
                                            type="radio"
                                            className="form-radio h-4 w-4 text-blue-600"
                                            checked={editingEvent.mode_of_event === 'virtual'}
                                            onChange={() => handleInputChange('mode_of_event', 'virtual')}
                                          />
                                          <span className="ml-2 text-gray-700">Virtual</span>
                                        </label>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Performance Type *</label>
                                      <div className="flex space-x-4 mt-2">
                                        <label className="inline-flex items-center">
                                          <input
                                            type="radio"
                                            className="form-radio h-4 w-4 text-blue-600"
                                            checked={editingEvent.performance_type === 'single'}
                                            onChange={() => handleInputChange('performance_type', 'single')}
                                          />
                                          <span className="ml-2 text-gray-700">Single Participant</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                          <input
                                            type="radio"
                                            className="form-radio h-4 w-4 text-blue-600"
                                            checked={editingEvent.performance_type === 'group'}
                                            onChange={() => handleInputChange('performance_type', 'group')}
                                          />
                                          <span className="ml-2 text-gray-700">Group Participants</span>
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Comments */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">Comments</label>
                                  <textarea
                                    value={editingEvent.comments || ''}
                                    onChange={(e) => handleInputChange('comments', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    rows={3}
                                    placeholder="Any additional comments or notes..."
                                  />
                                </div>

                                {/* Participant Details */}
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">Participant Details</h3>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={addParticipant}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Participant
                                    </Button>
                                  </div>

                                  {editingEvent.participants.map((participant, index) => (
                                    <div key={index} className="border rounded-lg p-4 space-y-4">
                                      <div className="flex justify-between items-center">
                                        <h4 className="font-medium">Participant {index + 1}</h4>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-500 hover:bg-red-50"
                                          onClick={() => removeParticipant(index)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Name *</label>
                                          <Input
                                            value={participant.name || ''}
                                            onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Age *</label>
                                          <Input
                                            type="number"
                                            value={participant.age || ''}
                                            onChange={(e) => handleParticipantChange(index, 'age', e.target.value)}
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Phone *</label>
                                          <Input
                                            type="tel"
                                            value={participant.phone || ''}
                                            onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Email</label>
                                          <Input
                                            type="email"
                                            value={participant.email || ''}
                                            onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Address *</label>
                                          <Input
                                            value={participant.address || ''}
                                            onChange={(e) => handleParticipantChange(index, 'address', e.target.value)}
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Gender *</label>
                                          <select
                                            value={participant.gender || ''}
                                            onChange={(e) => handleParticipantChange(index, 'gender', e.target.value)}
                                            className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                          >
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                            <option value="prefer-not-to-say">Prefer not to say</option>
                                          </select>
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Mandatory Prerequisite</label>
                                          <Input
                                            value={participant.prerequisite || ''}
                                            onChange={(e) => handleParticipantChange(index, 'prerequisite', e.target.value)}
                                            className="h-10"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Latitude</label>
                                          <Input
                                            type="text"
                                            value={participant.latitude || ''}
                                            onChange={(e) => handleParticipantChange(index, 'latitude', e.target.value)}
                                            className="h-10"
                                            placeholder="e.g., 40.7128"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium text-gray-700">Longitude</label>
                                          <Input
                                            type="text"
                                            value={participant.longitude || ''}
                                            onChange={(e) => handleParticipantChange(index, 'longitude', e.target.value)}
                                            className="h-10"
                                            placeholder="e.g., -74.0060"
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Additional Comments</label>
                                        <textarea
                                          value={participant.comments || ''}
                                          onChange={(e) => handleParticipantChange(index, 'comments', e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                          rows={2}
                                          placeholder="Any additional comments..."
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {/* Event Details Section */}
                                <div className="space-y-4">
                                  <h4 className="font-medium text-gray-700 flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                                    Event Details
                                  </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Event Name</div>
                                  <div className="text-gray-800">{event.name || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Date</div>
                                  <div className="text-gray-800">
                                    {event.date ? format(new Date(event.date), 'MMMM d, yyyy') : 'N/A'}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Time</div>
                                  <div className="text-gray-800">
                                    {event.start_time ? (
                                      <>
                                        {formatTime(event.start_time)}
                                        {event.end_time && ` - ${formatTime(event.end_time)}`}
                                      </>
                                    ) : 'N/A'}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Venue</div>
                                  <div className="text-gray-800">{event.venue || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Event Coordinator</div>
                                  <div className="text-gray-800">{event.event_coordinator || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Performance Type</div>
                                  <div className="text-gray-800 capitalize">
                                    {event.performance_type || 'N/A'}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Mode of Event</div>
                                  {event.mode_of_event === 'virtual' ? (
                                    <div className="space-y-1">
                                      <div className="text-gray-800">Virtual</div>
                                      {event.zoom_join_url && (
                                        <a 
                                          href={event.zoom_join_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                          </svg>
                                          Join Zoom Meeting
                                        </a>
                                      )}
                                      {event.zoom_password && (
                                        <div className="text-sm text-gray-600">
                                          <span className="font-medium">Password:</span> {event.zoom_password}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-gray-800">In-Person</div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Organization</div>
                                  <div className="text-gray-800">{event.organization_name || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Contact</div>
                                  <div className="text-gray-800">{event.organization_contact || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-500">Email</div>
                                  <div className="text-gray-800">{event.organization_email || 'N/A'}</div>
                                </div>
                                {event.comments && (
                                  <div className="space-y-1 md:col-span-2">
                                    <div className="font-medium text-gray-500">Additional Comments</div>
                                    <div className="text-gray-800 whitespace-pre-line">{event.comments}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Participants Section - Only show if there are participants */}
                            {event.participants?.length > 0 ? (
  <div>
    <h4 className="font-medium text-gray-700 mb-3 flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
      {event.performance_type === 'single' ? 'Participant Details' : 'Participants'}
      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
        {event.participants.length}
      </span>
    </h4>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Phone</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Email</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Age</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Gender</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Prerequisites</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {event.participants.map((p, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap">{p.name || 'N/A'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.phone || p.phone_no || 'N/A'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.email || 'N/A'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.age || 'N/A'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600 capitalize">{p.gender || 'N/A'}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  (p.prerequisites_completed || p.prerequisite)
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {(p.prerequisites_completed || p.prerequisite) ? 'Completed' : 'Pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {event.organization_name && (
                                  <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Event Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-gray-500">Event Name</div>
                                        <div className="text-gray-900">{event.name}</div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-gray-500">Date</div>
                                        <div className="text-gray-900">{event.date}</div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-gray-500">Time</div>
                                        <div className="text-gray-900">{event.start_time} - {event.end_time}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>)
})</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      {/* Custom Tooltip */}
      {tooltip.visible && (
        <div 
          ref={tooltipRef}
          className="fixed bg-blue-700 text-white text-sm px-4 py-2 rounded shadow-lg z-50 pointer-events-none whitespace-pre-line"
          style={{
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y - 20}px`,
            transform: 'translateY(-100%)',
            maxWidth: '300px',
            lineHeight: '1.5',
            border: '1px solid #1e40af',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
