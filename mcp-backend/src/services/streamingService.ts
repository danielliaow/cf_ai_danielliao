import { Response } from 'express';
import { AIService } from './aiService';
import { UserContext, AIResponse } from '../types/aiTools';

export interface StreamEvent {
  type: 'start' | 'tool_selection' | 'tool_execution' | 'response_chunk' | 'complete' | 'error';
  data: any;
  timestamp: string;
}

export class StreamingService {
  /**
   * Set up Server-Sent Events headers
   */
  static setupSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.flushHeaders();
  }

  /**
   * Send a streaming event
   */
  static sendEvent(res: Response, event: StreamEvent): boolean {
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      return res.write(data);
    } catch (error) {
      console.error('❌ Error sending stream event:', error);
      return false;
    }
  }

  /**
   * End the stream
   */
  static endStream(res: Response): void {
    res.end();
  }

  /**
   * Process AI query with streaming
   */
  static async processQueryWithStreaming(
    context: UserContext, 
    userId: string, 
    res: Response
  ): Promise<void> {
    try {
      // Send start event
      this.sendEvent(res, {
        type: 'start',
        data: { query: context.query },
        timestamp: new Date().toISOString()
      });

      const aiService = new AIService();

      // Step 1: Tool selection with streaming
      this.sendEvent(res, {
        type: 'tool_selection',
        data: { status: 'analyzing', message: 'Analyzing your request...' },
        timestamp: new Date().toISOString()
      });

      const toolSelection = await aiService.selectTool(context);
      
      if (!toolSelection) {
        this.sendEvent(res, {
          type: 'error',
          data: { error: 'No suitable tool found' },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Handle direct Gemini output
      if (toolSelection && toolSelection.tool === null && toolSelection.geminiOutput) {
        await this.streamTextResponse(res, toolSelection.geminiOutput);
        
        this.sendEvent(res, {
          type: 'complete',
          data: { 
            success: true,
            reasoning: toolSelection.reasoning,
            suggestedActions: []
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.sendEvent(res, {
        type: 'tool_selection',
        data: { 
          status: 'selected', 
          tool: toolSelection.tool, 
          confidence: toolSelection.confidence,
          reasoning: toolSelection.reasoning 
        },
        timestamp: new Date().toISOString()
      });

      // Step 2: Tool execution with streaming
      this.sendEvent(res, {
        type: 'tool_execution',
        data: { 
          status: 'executing', 
          tool: toolSelection.tool, 
          message: this.getToolExecutionMessage(toolSelection.tool)
        },
        timestamp: new Date().toISOString()
      });

      const toolResult = await aiService.executeTool(toolSelection, userId);

      this.sendEvent(res, {
        type: 'tool_execution',
        data: { 
          status: 'completed', 
          tool: toolSelection.tool,
          success: toolResult.success
        },
        timestamp: new Date().toISOString()
      });

      if (!toolResult.success) {
        this.sendEvent(res, {
          type: 'error',
          data: { error: toolResult.error || 'Tool execution failed' },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Step 3: Generate and stream natural language response
      this.sendEvent(res, {
        type: 'response_chunk',
        data: { status: 'generating', message: 'Generating response...' },
        timestamp: new Date().toISOString()
      });

      const naturalResponse = await aiService.generateResponse(context, toolSelection, toolResult);
      await this.streamTextResponse(res, naturalResponse);

      // Step 4: Generate suggested actions
      const suggestedActions = await aiService.generateSuggestedActions(context, toolResult);

      this.sendEvent(res, {
        type: 'complete',
        data: { 
          success: true,
          toolUsed: toolSelection.tool,
          rawData: toolResult.data,
          reasoning: toolSelection.reasoning,
          suggestedActions
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Streaming error:', error);
      this.sendEvent(res, {
        type: 'error',
        data: { 
          error: error instanceof Error ? error.message : 'Unknown streaming error'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Stream text response character by character with typing effect
   */
  private static async streamTextResponse(res: Response, text: string): Promise<void> {
    const words = text.split(' ');
    let currentChunk = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      currentChunk += (i > 0 ? ' ' : '') + word;

      // Send chunk every 1-3 words for natural typing effect
      if (i % this.getRandomChunkSize() === 0 || i === words.length - 1) {
        this.sendEvent(res, {
          type: 'response_chunk',
          data: { 
            chunk: currentChunk,
            isComplete: i === words.length - 1
          },
          timestamp: new Date().toISOString()
        });

        currentChunk = '';
        
        // Add natural typing delay (faster for shorter words)
        const delay = Math.min(150 + Math.random() * 100, 250);
        await this.delay(delay);
      }
    }
  }

  /**
   * Get random chunk size for more natural streaming
   */
  private static getRandomChunkSize(): number {
    return Math.floor(Math.random() * 3) + 1; // 1-3 words
  }

  /**
   * Get appropriate tool execution message
   */
  private static getToolExecutionMessage(toolName: string): string {
    const messages: Record<string, string> = {
      'getTodaysEvents': 'Fetching your calendar events...',
      'getEmails': 'Searching through your emails...',
      'getLastTenMails': 'Retrieving recent messages...',
    };
    return messages[toolName] || `Executing ${toolName}...`;
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}