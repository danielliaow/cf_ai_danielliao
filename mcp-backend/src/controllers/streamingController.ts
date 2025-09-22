import { Request, Response } from 'express';
import { StreamingService } from '../services/streamingService';
import { UserContext } from '../types/aiTools';
import { AuthenticatedRequest } from '../types';

export class StreamingController {
  /**
   * Stream AI query processing
   */
  static async streamQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { query, preferences } = req.body;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query is required and must be a string',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate user
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Setup SSE
      StreamingService.setupSSE(res);

      // Handle client disconnect
      req.on('close', () => {
        console.log('🔌 Client disconnected from stream');
        res.end();
      });

      req.on('error', (error) => {
        console.error('❌ Stream request error:', error);
        res.end();
      });

      // Create user context
      const context: UserContext = {
        query: query.trim(),
        timestamp: new Date().toISOString(),
        timezone: req.body.timezone || 'UTC',
        preferences: {
          responseStyle: preferences?.responseStyle || 'conversational',
          includeActions: preferences?.includeActions !== false,
        },
      };

      console.log('🌊 Starting streaming query for user:', req.user.email, 'Query:', query);

      // Process with streaming
      await StreamingService.processQueryWithStreaming(context, req.user.id, res);
      
    } catch (error) {
      console.error('❌ Streaming controller error:', error);
      
      // Send error event if stream is still active
      try {
        StreamingService.sendEvent(res, {
          type: 'error',
          data: { 
            error: error instanceof Error ? error.message : 'Internal server error'
          },
          timestamp: new Date().toISOString()
        });
      } catch (streamError) {
        console.error('❌ Error sending stream error event:', streamError);
      }
      
      StreamingService.endStream(res);
    }
  }

  /**
   * Health check for streaming endpoint
   */
  static async streamHealth(req: Request, res: Response): Promise<void> {
    try {
      // Setup SSE
      StreamingService.setupSSE(res);

      // Send test events
      StreamingService.sendEvent(res, {
        type: 'start',
        data: { message: 'Streaming health check started' },
        timestamp: new Date().toISOString()
      });

      // Simulate some streaming
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        StreamingService.sendEvent(res, {
          type: 'response_chunk',
          data: { chunk: `Health check message ${i}`, isComplete: false },
          timestamp: new Date().toISOString()
        });
      }

      StreamingService.sendEvent(res, {
        type: 'complete',
        data: { success: true, message: 'Streaming is working!' },
        timestamp: new Date().toISOString()
      });

      StreamingService.endStream(res);
      
    } catch (error) {
      console.error('❌ Stream health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Stream health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
}