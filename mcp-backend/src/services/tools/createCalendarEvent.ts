import { google } from 'googleapis';
import { MCPTool, MCPToolResponse } from '../../types';
import { GoogleAuthService } from '../googleAuth';

interface CreateCalendarEventParams {
  title: string;
  start_time: string; // ISO format
  end_time: string;   // ISO format
  attendees?: string[]; // Array of email addresses
  description?: string;
  location?: string;
}

export const createCalendarEventToolDefinition: MCPTool = {
  name: 'createCalendarEvent',
  description: 'Create a new Google Calendar event with specified details',
  
  async execute(userId: string, params: CreateCalendarEventParams): Promise<MCPToolResponse> {
    try {
      console.log('📅 Creating calendar event:', params);

      // Validate required parameters
      if (!params.title || !params.start_time || !params.end_time) {
        return {
          success: false,
          error: 'Missing required parameters: title, start_time, and end_time are required',
          timestamp: new Date().toISOString(),
        };
      }

      // Validate date formats
      const startDate = new Date(params.start_time);
      const endDate = new Date(params.end_time);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          success: false,
          error: 'Invalid date format. Please use ISO format (e.g., 2024-01-15T15:00:00.000Z)',
          timestamp: new Date().toISOString(),
        };
      }

      if (startDate >= endDate) {
        return {
          success: false,
          error: 'Start time must be before end time',
          timestamp: new Date().toISOString(),
        };
      }

      const auth = await GoogleAuthService.getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth });

      // Prepare event data
      const eventData: any = {
        summary: params.title,
        description: params.description || '',
        start: {
          dateTime: params.start_time,
          timeZone: 'UTC', // You might want to make this configurable
        },
        end: {
          dateTime: params.end_time,
          timeZone: 'UTC',
        },
      };

      // Add location if provided
      if (params.location) {
        eventData.location = params.location;
      }

      // Add attendees if provided
      if (params.attendees && params.attendees.length > 0) {
        eventData.attendees = params.attendees.map(email => ({ email }));
      }

      console.log('📅 Event data prepared:', eventData);

      // Create the event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
        sendNotifications: true, // Send notifications to attendees
        sendUpdates: 'all',
      });

      const createdEvent = response.data;

      console.log('✅ Calendar event created successfully:', createdEvent.id);

      return {
        success: true,
        data: {
          event_id: createdEvent.id,
          title: createdEvent.summary,
          start_time: createdEvent.start?.dateTime || createdEvent.start?.date,
          end_time: createdEvent.end?.dateTime || createdEvent.end?.date,
          html_link: createdEvent.htmlLink,
          attendees: createdEvent.attendees?.map(attendee => ({
            email: attendee.email,
            response_status: attendee.responseStatus,
          })) || [],
          location: createdEvent.location || null,
          description: createdEvent.description || null,
          created: createdEvent.created,
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      
      let errorMessage = 'Failed to create calendar event';
      if (error && typeof error === 'object' && 'response' in error) {
        const errorWithResponse = error as any;
        if (errorWithResponse.response?.status === 403) {
          errorMessage = 'Permission denied. Make sure you have calendar write permissions.';
        } else if (errorWithResponse.response?.status === 404) {
          errorMessage = 'Calendar not found. Make sure your Google Calendar is accessible.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  },
};