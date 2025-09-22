import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  metadata?: Record<string, any>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface MCPToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: string;
  snippet: string;
  body?: string;
  unread: boolean;
  important?: boolean;
  starred?: boolean;
  labels?: string[];
  attachments?: Array<{
    name: string;
    mimeType: string;
    size?: number;
  }>;
  sizeEstimate?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  execute: (userId: string, params?: any) => Promise<MCPToolResponse>;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}