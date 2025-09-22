import { supabase } from '../lib/supabase';
import {
  Session,
  SessionWithStats,
  Message,
  SessionCreateRequest,
  SessionUpdateRequest,
  MessageCreateRequest,
  SessionResponse,
  MessageResponse,
  ConversationContext
} from '../types/session';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

export class SessionService {
  
  /**
   * Create a new conversation session
   */
  static async createSession(request: SessionCreateRequest = {}): Promise<Session> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SessionResponse = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create session');
      }

      return result.data as Session;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get all sessions for the current user
   */
  static async getUserSessions(limit: number = 20): Promise<SessionWithStats[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/sessions?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SessionResponse = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch sessions');
      }

      return result.data as SessionWithStats[];
    } catch (error) {
      console.error('❌ Error fetching sessions:', error);
      throw error;
    }
  }

  /**
   * Get a specific session
   */
  static async getSession(sessionId: string): Promise<Session> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SessionResponse = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch session');
      }

      return result.data as Session;
    } catch (error) {
      console.error('❌ Error fetching session:', error);
      throw error;
    }
  }

  /**
   * Update session metadata
   */
  static async updateSession(sessionId: string, updates: SessionUpdateRequest): Promise<Session> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SessionResponse = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update session');
      }

      return result.data as Session;
    } catch (error) {
      console.error('❌ Error updating session:', error);
      throw error;
    }
  }

  /**
   * Get conversation messages for a session
   */
  static async getSessionMessages(sessionId: string, limit?: number): Promise<Message[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const url = limit 
        ? `${MCP_BASE_URL}/sessions/${sessionId}/messages?limit=${limit}`
        : `${MCP_BASE_URL}/sessions/${sessionId}/messages`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: MessageResponse = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch messages');
      }

      return result.data.messages;
    } catch (error) {
      console.error('❌ Error fetching session messages:', error);
      throw error;
    }
  }

  /**
   * Add a message to a session
   */
  static async addMessage(sessionId: string, role: Message['role'], content: string, metadata?: Record<string, any>): Promise<Message> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const messageRequest: MessageCreateRequest = {
        session_id: sessionId,
        role,
        content,
        metadata
      };

      const response = await fetch(`${MCP_BASE_URL}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to add message');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Error adding message:', error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Archive a session
   */
  static async archiveSession(sessionId: string): Promise<Session> {
    return this.updateSession(sessionId, { is_active: false });
  }

  /**
   * Get conversation context for a session
   */
  static async getConversationContext(sessionId: string, messageCount: number = 10): Promise<ConversationContext> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/sessions/${sessionId}/context?messages=${messageCount}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch context');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Error fetching conversation context:', error);
      throw error;
    }
  }
}