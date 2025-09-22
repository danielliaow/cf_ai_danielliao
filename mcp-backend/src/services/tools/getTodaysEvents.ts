import { google } from 'googleapis';
import { MCPTool, MCPToolResponse, CalendarEvent } from '../../types';
import { GoogleAuthService } from '../googleAuth';

export const getTodaysEventsToolDefinition: MCPTool = {
  name: 'getTodaysEvents',
  description: 'Fetch today\'s calendar events from Google Calendar',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const auth = await GoogleAuthService.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: today.toISOString(),
        timeMax: tomorrow.toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      const formattedEvents: CalendarEvent[] = events.map(event => ({
        id: event.id!,
        summary: event.summary || 'No Title',
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
          timeZone: event.end?.timeZone || undefined,
        },
        location: event.location || undefined,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || undefined,
        })),
      }));

      // Generate summary
      const summary = {
        total: formattedEvents.length,
        upcoming: formattedEvents.filter(event => {
          const eventStart = new Date(event.start.dateTime || event.start.date!);
          return eventStart > new Date();
        }).length,
        byTime: formattedEvents.reduce((acc, event) => {
          const eventStart = new Date(event.start.dateTime || event.start.date!);
          const hour = eventStart.getHours();
          
          if (hour < 12) acc.morning++;
          else if (hour < 17) acc.afternoon++;
          else acc.evening++;
          
          return acc;
        }, { morning: 0, afternoon: 0, evening: 0 }),
      };

      return {
        success: true,
        data: {
          events: formattedEvents,
          summary,
          date: today.toISOString().split('T')[0],
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar events',
        timestamp: new Date().toISOString(),
      };
    }
  },
};