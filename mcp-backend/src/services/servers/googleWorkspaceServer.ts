import { MCPTool } from '../../types';
import { AIToolMetadata } from '../../types/aiTools';
import { getTodaysEventsToolDefinition } from '../tools/getTodaysEvents';
import { getLastTenMailsToolDefinition } from '../tools/getLastTenMails';
import { createCalendarEventToolDefinition } from '../tools/createCalendarEvent';

export async function createGoogleWorkspaceServer() {
  const tools: MCPTool[] = [
    getTodaysEventsToolDefinition,
    getLastTenMailsToolDefinition,
    createCalendarEventToolDefinition,
  ];

  const metadata: Record<string, AIToolMetadata> = {
    getTodaysEvents: {
      name: 'getTodaysEvents',
      description: 'Retrieves calendar events for the current day, including meeting times, titles, locations, and attendees',
      category: 'calendar',
      parameters: [
        {
          name: 'date',
          type: 'string',
          description: 'Specific date to get events for (YYYY-MM-DD format). If not provided, uses current date.',
          required: false,
          examples: ['2024-01-15', 'today']
        }
      ],
      examples: [
        {
          query: "What's on my calendar today?",
          expectedParams: {},
          description: "Get all events for today"
        },
        {
          query: "Do I have any meetings this morning?",
          expectedParams: {},
          description: "Get today's events (user will filter mentally for morning)"
        },
        {
          query: "What meetings do I have after lunch?",
          expectedParams: {},
          description: "Get today's events (AI will help filter in response)"
        },
        {
          query: "Show me my schedule for today",
          expectedParams: {},
          description: "Get full day schedule"
        }
      ],
      timeContext: 'current',
      dataAccess: 'read'
    },

    getLastTenMails: {
      name: 'getLastTenMails',
      description: 'Retrieves the 10 most recent emails from Gmail inbox, including sender, subject, date, and snippet',
      category: 'email',
      parameters: [
        {
          name: 'maxResults',
          type: 'number',
          description: 'Maximum number of emails to retrieve (default: 10, max: 50)',
          required: false,
          examples: ['5', '20']
        },
        {
          name: 'query',
          type: 'string',
          description: 'Gmail search query to filter emails (e.g., "from:john@example.com", "subject:urgent")',
          required: false,
          examples: ['from:boss@company.com', 'subject:meeting', 'is:unread']
        }
      ],
      examples: [
        {
          query: "Check my emails",
          expectedParams: {},
          description: "Get latest 10 emails"
        },
        {
          query: "Do I have any new messages?",
          expectedParams: {},
          description: "Get recent emails to check for new ones"
        },
        {
          query: "Show me emails from my manager",
          expectedParams: { query: "from:manager@company.com" },
          description: "Filter emails by sender"
        },
        {
          query: "Any urgent emails?",
          expectedParams: { query: "subject:urgent OR subject:important" },
          description: "Filter for urgent emails"
        }
      ],
      timeContext: 'current',
      dataAccess: 'read'
    },

    createCalendarEvent: {
      name: 'createCalendarEvent',
      description: 'Create a new Google Calendar event with specified details including title, time, attendees, and description',
      category: 'calendar',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Event title/summary',
          required: true,
          examples: ['Team Meeting', 'Lunch with John', 'Project Review']
        },
        {
          name: 'start_time',
          type: 'string',
          description: 'Event start time in ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)',
          required: true,
          examples: ['2024-01-15T15:00:00.000Z', '2024-01-15T10:30:00.000Z']
        },
        {
          name: 'end_time',
          type: 'string',
          description: 'Event end time in ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)',
          required: true,
          examples: ['2024-01-15T16:00:00.000Z', '2024-01-15T11:30:00.000Z']
        },
        {
          name: 'attendees',
          type: 'array',
          description: 'Array of email addresses for attendees',
          required: false,
          examples: ['["john@company.com", "jane@company.com"]', '["team@company.com"]']
        },
        {
          name: 'description',
          type: 'string',
          description: 'Event description or agenda',
          required: false,
          examples: ['Discuss Q1 goals', 'Weekly team sync', 'Project planning session']
        },
        {
          name: 'location',
          type: 'string',
          description: 'Event location (physical or virtual)',
          required: false,
          examples: ['Conference Room A', 'https://zoom.us/j/123456789', 'Coffee Shop']
        }
      ],
      examples: [
        {
          query: "Schedule a meeting with John tomorrow at 3 PM",
          expectedParams: {
            title: "Meeting with John",
            start_time: "2024-01-16T15:00:00.000Z",
            end_time: "2024-01-16T16:00:00.000Z",
            attendees: ["john@company.com"]
          },
          description: "Create a 1-hour meeting"
        },
        {
          query: "Book lunch with the team next Friday at noon",
          expectedParams: {
            title: "Team Lunch",
            start_time: "2024-01-19T12:00:00.000Z",
            end_time: "2024-01-19T13:00:00.000Z",
            description: "Team lunch meeting"
          },
          description: "Create a team lunch event"
        },
        {
          query: "Create a 2-hour project review meeting",
          expectedParams: {
            title: "Project Review Meeting",
            start_time: "2024-01-15T14:00:00.000Z",
            end_time: "2024-01-15T16:00:00.000Z",
            description: "Review current project status and next steps"
          },
          description: "Create a long meeting with description"
        }
      ],
      timeContext: 'future',
      dataAccess: 'write'
    }
  };

  return { tools, metadata };
}