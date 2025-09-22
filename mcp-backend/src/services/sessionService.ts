import { supabase } from './supabase';
import { 
  Session, 
  Message, 
  ToolCall, 
  ConversationContext, 
  SessionCreateRequest, 
  SessionUpdateRequest, 
  MessageCreateRequest,
  SessionWithStats
} from '../types/session';
import { TitleGenerator } from '../utils/titleGenerator';

export class SessionService {
  
  /**
   * Create a new conversation session
   */
  static async createSession(userId: string, request: SessionCreateRequest): Promise<Session> {
    // Generate a smart title: use provided title, or generate a creative one
    const title = request.title || TitleGenerator.generateRandomTitle();
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        title,
        description: request.description,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    console.log('✅ Created new session:', data.id, 'with title:', title);
    return data;
  }

  /**
   * Get all sessions for a user with statistics
   */
  static async getUserSessions(userId: string, limit: number = 20): Promise<SessionWithStats[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        messages!inner(created_at, content)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching user sessions:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    // Process the data to include statistics
    const sessionsWithStats: SessionWithStats[] = (data || []).map(session => {
      const messages = (session as any).messages || [];
      
      return {
        id: session.id,
        user_id: session.user_id,
        title: session.title,
        description: session.description,
        is_active: session.is_active,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: messages.length,
        last_message_at: messages.length > 0 ? messages[messages.length - 1].created_at : session.created_at,
        last_message_preview: messages.length > 0 
          ? this.truncateText(messages[messages.length - 1].content, 100)
          : 'No messages yet'
      };
    });

    return sessionsWithStats;
  }

  /**
   * Get a specific session by ID
   */
  static async getSession(sessionId: string, userId: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('❌ Error fetching session:', error);
      throw new Error(`Failed to fetch session: ${error.message}`);
    }

    return data;
  }

  /**
   * Update session metadata
   */
  static async updateSession(sessionId: string, userId: string, updates: SessionUpdateRequest): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return data;
  }

  /**
   * Add a message to a session
   */
  static async addMessage(message: MessageCreateRequest): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id: message.session_id,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding message:', error);
      throw new Error(`Failed to add message: ${error.message}`);
    }

    // Update session's updated_at timestamp
    await this.touchSession(message.session_id);

    return data;
  }

  /**
   * Get conversation history for a session
   */
  static async getSessionMessages(sessionId: string, userId: string, limit?: number): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select(`
        *,
        session:sessions!inner(user_id)
      `)
      .eq('session_id', sessionId)
      .eq('session.user_id', userId)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching session messages:', error);
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      session_id: item.session_id,
      role: item.role,
      content: item.content,
      metadata: item.metadata,
      created_at: item.created_at
    }));
  }

  /**
   * Get recent messages for context (last N messages)
   */
  static async getRecentMessages(sessionId: string, userId: string, count: number = 10): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        session:sessions!inner(user_id)
      `)
      .eq('session_id', sessionId)
      .eq('session.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(count);

    if (error) {
      console.error('❌ Error fetching recent messages:', error);
      throw new Error(`Failed to fetch recent messages: ${error.message}`);
    }

    // Reverse to get chronological order
    return (data || []).reverse().map(item => ({
      id: item.id,
      session_id: item.session_id,
      role: item.role,
      content: item.content,
      metadata: item.metadata,
      created_at: item.created_at
    }));
  }

  /**
   * Log a tool call
   */
  static async logToolCall(toolCall: Omit<ToolCall, 'id' | 'created_at'>): Promise<ToolCall> {
    const { data, error } = await supabase
      .from('tool_calls')
      .insert({
        session_id: toolCall.session_id,
        message_id: toolCall.message_id,
        tool_name: toolCall.tool_name,
        parameters: toolCall.parameters,
        result: toolCall.result,
        success: toolCall.success,
        execution_time_ms: toolCall.execution_time_ms,
        error_message: toolCall.error_message
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error logging tool call:', error);
      throw new Error(`Failed to log tool call: ${error.message}`);
    }

    return data;
  }

  /**
   * Get conversation context including recent messages and tool calls
   */
  static async getConversationContext(sessionId: string, userId: string, messageCount: number = 10): Promise<ConversationContext> {
    const [messages, toolCalls] = await Promise.all([
      this.getRecentMessages(sessionId, userId, messageCount),
      this.getSessionToolCalls(sessionId, userId, messageCount)
    ]);

    return {
      session_id: sessionId,
      messages,
      tool_calls: toolCalls,
      summary: this.generateContextSummary(messages)
    };
  }

  /**
   * Get tool calls for a session
   */
  static async getSessionToolCalls(sessionId: string, userId: string, limit?: number): Promise<ToolCall[]> {
    let query = supabase
      .from('tool_calls')
      .select(`
        *,
        session:sessions!inner(user_id)
      `)
      .eq('session_id', sessionId)
      .eq('session.user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching tool calls:', error);
      throw new Error(`Failed to fetch tool calls: ${error.message}`);
    }

    return (data || []).map(item => ({
      id: item.id,
      session_id: item.session_id,
      message_id: item.message_id,
      tool_name: item.tool_name,
      parameters: item.parameters,
      result: item.result,
      success: item.success,
      execution_time_ms: item.execution_time_ms,
      error_message: item.error_message,
      created_at: item.created_at
    }));
  }

  /**
   * Auto-generate session title from first message
   */
  static async updateSessionTitle(sessionId: string, userId: string, firstMessage: string): Promise<void> {
    const title = TitleGenerator.generateSmartTitle(firstMessage);
    
    console.log('🏷️ Updating session title to:', title);
    await this.updateSession(sessionId, userId, { title });
  }

  /**
   * Delete a session and all its data
   */
  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }

    console.log('✅ Deleted session:', sessionId);
  }

  /**
   * Archive a session (set is_active = false)
   */
  static async archiveSession(sessionId: string, userId: string): Promise<Session> {
    return this.updateSession(sessionId, userId, { is_active: false });
  }

  // Helper methods
  
  private static async touchSession(sessionId: string): Promise<void> {
    // Update the session's updated_at timestamp
    await supabase
      .from('sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }


  private static generateContextSummary(messages: Message[]): string {
    if (messages.length === 0) return 'Empty conversation';
    
    const userMessages = messages.filter(m => m.role === 'user');
    const topics = userMessages.map(m => m.content.substring(0, 50)).join(', ');
    
    return `Conversation about: ${topics}`;
  }
}