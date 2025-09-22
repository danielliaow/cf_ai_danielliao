import { supabase } from '../lib/supabase';

export interface StreamEvent {
  type: 'start' | 'tool_selection' | 'tool_execution' | 'response_chunk' | 'complete' | 'error';
  data: any;
  timestamp: string;
}

export interface StreamingCallbacks {
  onStart?: (data: any) => void;
  onToolSelection?: (data: any) => void;
  onToolExecution?: (data: any) => void;
  onResponseChunk?: (data: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

export class StreamingService {
  private eventSource: EventSource | null = null;
  private callbacks: StreamingCallbacks = {};

  /**
   * Start streaming AI query
   */
  async startStream(
    query: string, 
    callbacks: StreamingCallbacks,
    preferences?: {
      responseStyle?: 'brief' | 'detailed' | 'conversational';
      includeActions?: boolean;
    }
  ): Promise<void> {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      this.callbacks = callbacks;

      // Close existing stream
      if (this.eventSource) {
        this.eventSource.close();
      }

      // Prepare request body
      const requestBody = {
        query: query.trim(),
        preferences: {
          responseStyle: preferences?.responseStyle || 'conversational',
          includeActions: preferences?.includeActions !== false,
        }
      };

      // Create EventSource with POST data
      const url = `${MCP_BASE_URL}/streaming/query`;
      
      // Since EventSource doesn't support POST, we'll use fetch with a streaming response
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      // Process streaming response
      await this.processStreamingResponse(response);

    } catch (error) {
      console.error('❌ Streaming error:', error);
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Streaming failed');
    }
  }

  /**
   * Process streaming response using ReadableStream
   */
  private async processStreamingResponse(response: Response): Promise<void> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = line.slice(6); // Remove 'data: '
              if (eventData.trim()) {
                const event: StreamEvent = JSON.parse(eventData);
                this.handleStreamEvent(event);
              }
            } catch (parseError) {
              console.warn('⚠️ Failed to parse stream event:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle individual stream events
   */
  private handleStreamEvent(event: StreamEvent): void {
    console.log('🌊 Stream event:', event.type, event.data);

    switch (event.type) {
      case 'start':
        this.callbacks.onStart?.(event.data);
        break;
      
      case 'tool_selection':
        this.callbacks.onToolSelection?.(event.data);
        break;
      
      case 'tool_execution':
        this.callbacks.onToolExecution?.(event.data);
        break;
      
      case 'response_chunk':
        this.callbacks.onResponseChunk?.(event.data);
        break;
      
      case 'complete':
        this.callbacks.onComplete?.(event.data);
        break;
      
      case 'error':
        this.callbacks.onError?.(event.data.error);
        break;
      
      default:
        console.warn('⚠️ Unknown stream event type:', event.type);
    }
  }

  /**
   * Stop the current stream
   */
  stopStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.callbacks = {};
  }

  /**
   * Test streaming connection
   */
  async testStream(): Promise<boolean> {
    try {
      const response = await fetch(`${MCP_BASE_URL}/streaming/health`);
      
      if (!response.ok) {
        return false;
      }

      // Test if we can read the stream
      const reader = response.body?.getReader();
      if (!reader) {
        return false;
      }

      // Read one chunk to verify streaming works
      const { done } = await reader.read();
      reader.releaseLock();
      
      return !done;
    } catch (error) {
      console.error('❌ Stream test error:', error);
      return false;
    }
  }
}