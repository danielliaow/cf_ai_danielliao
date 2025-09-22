// Frontend Session Management Types

export interface Session {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionWithStats extends Session {
  message_count: number;
  last_message_at: string;
  last_message_preview: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SessionCreateRequest {
  title?: string;
  description?: string;
}

export interface SessionUpdateRequest {
  title?: string;
  description?: string;
  is_active?: boolean;
}

export interface MessageCreateRequest {
  session_id: string;
  role: Message['role'];
  content: string;
  metadata?: Record<string, any>;
}

export interface SessionResponse {
  success: boolean;
  data?: Session | SessionWithStats | SessionWithStats[];
  error?: string;
  timestamp: string;
}

export interface MessageResponse {
  success: boolean;
  data?: {
    session_id: string;
    messages: Message[];
    count: number;
  };
  error?: string;
  timestamp: string;
}

export interface ConversationContext {
  session_id: string;
  messages: Message[];
  tool_calls: any[];
  summary?: string;
}