import { supabase } from '../lib/supabase';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

export interface StreamEvent {
  id: string;
  timestamp: Date;
  type: 'plan_generation' | 'tool_execution' | 'step_progress' | 'completion' | 'error' | 'tool_started' | 'tool_completed';
  title: string;
  description?: string;
  progress?: number;
  data?: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolName?: string;
  stepId?: string;
  duration?: number;
  rawData?: string; // Full untruncated data
}

export interface ContinuousStreamCallbacks {
  onEvent?: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onResponse?: (naturalResponse: string, fullResponse?: string) => void;
  onToolStart?: (toolName: string, params: any) => void;
  onToolProgress?: (toolName: string, progress: number, data?: any) => void;
  onToolComplete?: (toolName: string, result: any, duration?: number) => void;
}

class ContinuousStreamingService {
  private activeStreams: Map<string, AbortController> = new Map();
  private eventHistory: Map<string, StreamEvent[]> = new Map();

  private getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Authorization': `Bearer ${session?.access_token}`,
    };
  };

  private generateEventId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  private parseStreamEvent = (eventData: any): StreamEvent => {
    const now = new Date();
    const baseEvent: StreamEvent = {
      id: this.generateEventId(),
      timestamp: now,
      type: eventData.type || 'step_progress',
      title: eventData.title || eventData.message || 'Processing...',
      description: eventData.description || eventData.message,
      status: eventData.status || 'in_progress',
      data: eventData,
      rawData: JSON.stringify(eventData, null, 2), // Store full data without truncation
    };

    // Enhanced event parsing based on type
    switch (eventData.type) {
      case 'plan_generation_started':
        return {
          ...baseEvent,
          type: 'plan_generation',
          title: '🧠 Analyzing request and generating plan',
          status: 'in_progress',
        };

      case 'plan_overview':
        return {
          ...baseEvent,
          type: 'plan_generation',
          title: '📋 Implementation plan generated',
          description: eventData.overview,
          status: 'completed',
        };

      case 'step_generated':
        return {
          ...baseEvent,
          type: 'step_progress',
          title: `➕ Step added: ${eventData.step?.title}`,
          description: eventData.step?.description,
          stepId: eventData.step?.id,
          status: 'pending',
        };

      case 'tool_selection':
        return {
          ...baseEvent,
          type: 'tool_execution',
          title: `🔧 Selected tool: ${eventData.toolName}`,
          toolName: eventData.toolName,
          status: 'pending',
        };

      case 'tool_started':
        return {
          ...baseEvent,
          type: 'tool_execution',
          title: `⚡ Executing ${eventData.toolName}`,
          toolName: eventData.toolName,
          status: 'in_progress',
        };

      case 'tool_progress':
        return {
          ...baseEvent,
          type: 'tool_execution',
          title: `🔄 ${eventData.toolName} progress`,
          toolName: eventData.toolName,
          progress: eventData.progress || 0,
          status: 'in_progress',
        };

      case 'tool_completed':
        return {
          ...baseEvent,
          type: 'tool_execution',
          title: `✅ ${eventData.toolName} completed`,
          toolName: eventData.toolName,
          duration: eventData.duration,
          status: 'completed',
        };

      case 'step_started':
        return {
          ...baseEvent,
          type: 'step_progress',
          title: `▶️ ${eventData.step?.title || 'Step started'}`,
          stepId: eventData.stepId,
          status: 'in_progress',
        };

      case 'step_completed':
        return {
          ...baseEvent,
          type: 'step_progress',
          title: `✅ ${eventData.step?.title || 'Step completed'}`,
          stepId: eventData.stepId,
          status: 'completed',
        };

      case 'step_failed':
        return {
          ...baseEvent,
          type: 'step_progress',
          title: `❌ ${eventData.step?.title || 'Step failed'}`,
          stepId: eventData.stepId,
          status: 'failed',
        };

      case 'execution_completed':
        return {
          ...baseEvent,
          type: 'completion',
          title: '🎉 Implementation completed successfully',
          status: 'completed',
        };

      case 'execution_completed_with_errors':
        return {
          ...baseEvent,
          type: 'completion',
          title: '⚠️ Implementation completed with some errors',
          status: 'completed',
        };

      case 'response_generated':
        return {
          ...baseEvent,
          type: 'response_generated',
          title: '📝 Response generated',
          description: 'Natural language response created',
          status: 'completed',
          data: {
            ...eventData,
            naturalResponse: eventData.naturalResponse,
            fullResponse: eventData.fullResponse
          }
        };

      case 'stream_completed':
        return {
          ...baseEvent,
          type: 'stream_completed',
          title: '✅ Stream completed successfully',
          description: 'Processing stream has finished',
          status: 'completed',
        };

      case 'error':
        return {
          ...baseEvent,
          type: 'error',
          title: `❌ Error: ${eventData.error || 'Unknown error'}`,
          status: 'failed',
        };

      default:
        return baseEvent;
    }
  };

  async startContinuousProcessing(
    query: string,
    context: any,
    callbacks: ContinuousStreamCallbacks,
    sessionId?: string
  ): Promise<string> {
    const streamId = this.generateEventId();
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);
    this.eventHistory.set(streamId, []);

    try {
      const headers = await this.getAuthHeaders();
      const { data: { user } } = await supabase.auth.getUser();

      // Start the continuous processing stream
      const response = await fetch(`${MCP_BASE_URL}/ai/continuous-query`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          context,
          userId: user?.id,
          sessionId,
          streamId,
          preferences: {
            responseStyle: 'detailed',
            includeActions: true,
            streamTools: true,
            streamProgress: true,
            noTruncation: true, // Prevent message truncation
          }
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body stream available');
      }

      // Process the stream
      try {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('🔚 Stream naturally completed');
            if (callbacks.onComplete) callbacks.onComplete();
            break;
          }

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line

          for (const line of lines) {
            if (line.trim() === '') continue;

            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const event = this.parseStreamEvent(data);
                
                // Store event in history
                const events = this.eventHistory.get(streamId) || [];
                events.push(event);
                this.eventHistory.set(streamId, events);

                // Trigger callbacks
                if (callbacks.onEvent) callbacks.onEvent(event);

                // Specific callbacks based on event type
                if (event.type === 'response_generated' && callbacks.onResponse) {
                  const naturalResponse = event.data?.naturalResponse;
                  const fullResponse = event.data?.fullResponse;
                  if (naturalResponse) {
                    callbacks.onResponse(naturalResponse, fullResponse);
                  }
                }

                // Handle stream completion
                if (event.type === 'stream_completed') {
                  console.log('🏁 Stream completed event received');
                  if (callbacks.onComplete) {
                    callbacks.onComplete();
                  }
                  // End the stream processing
                  return streamId;
                }

                if (event.type === 'tool_execution') {
                  switch (event.status) {
                    case 'in_progress':
                      if (event.progress !== undefined && callbacks.onToolProgress) {
                        callbacks.onToolProgress(event.toolName!, event.progress, event.data);
                      } else if (callbacks.onToolStart) {
                        callbacks.onToolStart(event.toolName!, event.data);
                      }
                      break;
                    case 'completed':
                      if (callbacks.onToolComplete) {
                        callbacks.onToolComplete(event.toolName!, event.data, event.duration);
                      }
                      break;
                  }
                }

              } catch (parseError) {
                console.warn('Failed to parse stream data:', parseError, line);
              }
            } else if (line.startsWith('event: ')) {
              // Handle Server-Sent Events
              const eventType = line.slice(7);
              console.log('📡 SSE Event:', eventType);
            } else if (line.startsWith('id: ')) {
              // Handle event ID
              const eventId = line.slice(4);
              console.log('🆔 Event ID:', eventId);
            }
          }
        }

      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('❌ Continuous streaming error:', error);
      if (callbacks.onError && error instanceof Error) {
        callbacks.onError(error);
      }
      throw error;
    } finally {
      this.activeStreams.delete(streamId);
    }

    return streamId;
  }

  stopStream(streamId: string): void {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      console.log('🛑 Stream stopped:', streamId);
    }
  }

  getStreamHistory(streamId: string): StreamEvent[] {
    return this.eventHistory.get(streamId) || [];
  }

  clearStreamHistory(streamId: string): void {
    this.eventHistory.delete(streamId);
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  stopAllStreams(): void {
    for (const [streamId, controller] of this.activeStreams.entries()) {
      controller.abort();
    }
    this.activeStreams.clear();
    console.log('🛑 All streams stopped');
  }

  // Enhanced query method that doesn't send as messages but streams to processing tab
  async processQueryContinuously(
    query: string,
    context: any = {},
    callbacks: ContinuousStreamCallbacks,
    sessionId?: string
  ): Promise<string> {
    // Add initial event
    const initialEvent: StreamEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'plan_generation',
      title: '🚀 Starting continuous processing',
      description: `Processing query: "${query}"`,
      status: 'in_progress',
      data: { query, context },
      rawData: JSON.stringify({ query, context }, null, 2),
    };

    if (callbacks.onEvent) callbacks.onEvent(initialEvent);

    return this.startContinuousProcessing(query, context, callbacks, sessionId);
  }
}

export default new ContinuousStreamingService();