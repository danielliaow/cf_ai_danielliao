import { Request, Response } from 'express';
import { AIService } from '../services/aiService';
import { ImplementationPlanService } from '../services/implementationPlanService';
import { SessionService } from '../services/sessionService';

interface ProcessingStream {
  streamId: string;
  userId: string;
  query: string;
  startTime: Date;
  status: 'active' | 'completed' | 'error';
  response?: Response;
}

export class ContinuousAIController {
  private static activeStreams: Map<string, ProcessingStream> = new Map();

  static async continuousQuery(req: Request, res: Response) {
    const { query, context, userId, sessionId, streamId, preferences } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Store active stream
      const stream: ProcessingStream = {
        streamId: streamId || `stream-${Date.now()}`,
        userId,
        query,
        startTime: new Date(),
        status: 'active',
        response: res,
      };
      
      ContinuousAIController.activeStreams.set(stream.streamId, stream);

      // Send initial event
      res.write(`data: ${JSON.stringify({
        type: 'stream_started',
        streamId: stream.streamId,
        message: 'Continuous processing started',
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Start processing with continuous streaming
      await ContinuousAIController.processWithContinuousStream(
        query,
        context,
        userId,
        sessionId,
        preferences,
        (data: any) => {
          try {
            // Send event without truncation
            const eventData = {
              ...data,
              streamId: stream.streamId,
              timestamp: new Date().toISOString(),
              // Preserve full data without truncation
              fullData: preferences?.noTruncation ? data : undefined,
            };
            
            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
          } catch (writeError) {
            console.error('Error writing to stream:', writeError);
          }
        }
      );

      // Mark as completed
      stream.status = 'completed';
      res.write(`data: ${JSON.stringify({
        type: 'stream_completed',
        streamId: stream.streamId,
        message: 'Processing completed',
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Close the response stream
      res.end();

    } catch (error) {
      console.error('Error in continuous query:', error);
      
      const stream = ContinuousAIController.activeStreams.get(streamId);
      if (stream) {
        stream.status = 'error';
        res.write(`data: ${JSON.stringify({
          type: 'error',
          streamId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
      
      // Close the response stream on error too
      res.end();
    } finally {
      // Clean up
      if (streamId) {
        ContinuousAIController.activeStreams.delete(streamId);
      }
    }
  }

  private static async processWithContinuousStream(
    query: string,
    context: any,
    userId: string,
    sessionId: string | undefined,
    preferences: any,
    callback: (data: any) => void
  ): Promise<void> {
    try {
      // Step 1: Analyze complexity
      callback({
        type: 'complexity_analysis_started',
        title: 'Analyzing task complexity',
        status: 'in_progress'
      });

      const aiService = new AIService();
      const complexityAnalysis = await aiService.analyzeTaskComplexity(query);

      callback({
        type: 'complexity_analysis_completed',
        title: 'Task complexity analyzed',
        data: complexityAnalysis,
        status: 'completed'
      });

      if (complexityAnalysis.complexity === 'complex') {
        // Use implementation plan for complex tasks
        callback({
          type: 'implementation_plan_selected',
          title: 'Using implementation plan approach',
          reasoning: complexityAnalysis.reasoning,
          status: 'completed'
        });

        // Generate and execute implementation plan with streaming
        await ImplementationPlanService.generateAndStreamPlan(
          query,
          context,
          userId,
          callback
        );

      } else {
        // Process simple queries directly with tool streaming
        callback({
          type: 'direct_processing_selected',
          title: 'Processing directly with tools',
          status: 'completed'
        });

        await ContinuousAIController.processDirectWithToolStreaming(
          query,
          context,
          userId,
          sessionId,
          preferences,
          callback
        );
      }

    } catch (error) {
      callback({
        type: 'processing_error',
        title: 'Error during processing',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      });
    }
  }

  private static async processDirectWithToolStreaming(
    query: string,
    context: any,
    userId: string,
    sessionId: string | undefined,
    preferences: any,
    callback: (data: any) => void
  ): Promise<void> {
    try {
      const aiService = new AIService();
      
      // Step 1: Tool selection
      callback({
        type: 'tool_selection_started',
        title: 'Selecting appropriate tool',
        status: 'in_progress'
      });

      const toolSelection = await aiService.selectTool({
        query,
        timestamp: new Date().toISOString(),
        sessionId,
        preferences
      }, userId);

      if (!toolSelection) {
        callback({
          type: 'no_tool_found',
          title: 'No suitable tool found',
          status: 'failed'
        });
        return;
      }

      callback({
        type: 'tool_selected',
        title: `Selected tool: ${toolSelection.tool}`,
        toolName: toolSelection.tool,
        confidence: toolSelection.confidence,
        reasoning: toolSelection.reasoning,
        parameters: toolSelection.parameters,
        status: 'completed'
      });

      // Step 2: Tool execution with progress streaming
      callback({
        type: 'tool_execution_started',
        title: `Executing ${toolSelection.tool}`,
        toolName: toolSelection.tool,
        status: 'in_progress'
      });

      const startTime = Date.now();
      
      // Execute tool
      const toolResult = await aiService.executeTool(toolSelection, userId);
      
      const duration = Date.now() - startTime;

      callback({
        type: 'tool_execution_completed',
        title: `${toolSelection.tool} completed`,
        toolName: toolSelection.tool,
        duration,
        result: toolResult,
        success: toolResult.success,
        status: toolResult.success ? 'completed' : 'failed'
      });

      // Step 3: Response generation
      if (toolResult.success) {
        callback({
          type: 'response_generation_started',
          title: 'Generating natural language response',
          status: 'in_progress'
        });

        const naturalResponse = await aiService.generateResponse(
          { query, timestamp: new Date().toISOString(), sessionId, preferences },
          toolSelection,
          toolResult,
          userId
        );

        callback({
          type: 'response_generated',
          title: 'Response generated',
          naturalResponse,
          fullResponse: preferences?.noTruncation ? naturalResponse : undefined,
          status: 'completed'
        });

        // Save to session if sessionId provided
        if (sessionId) {
          try {
            await SessionService.addMessage({
              session_id: sessionId,
              role: 'user',
              content: query,
              metadata: {
                timestamp: new Date().toISOString()
              }
            });

            await SessionService.addMessage({
              session_id: sessionId,
              role: 'assistant',
              content: naturalResponse,
              metadata: {
                timestamp: new Date().toISOString(),
                toolUsed: toolSelection.tool,
                confidence: toolSelection.confidence,
                reasoning: toolSelection.reasoning,
                rawData: toolResult.data
              }
            });

            callback({
              type: 'session_updated',
              title: 'Conversation saved to session',
              sessionId,
              status: 'completed'
            });

          } catch (sessionError) {
            callback({
              type: 'session_save_error',
              title: 'Failed to save to session',
              error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
              status: 'failed'
            });
          }
        }
      }

    } catch (error) {
      callback({
        type: 'direct_processing_error',
        title: 'Error during direct processing',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      });
    }
  }

  static async getProcessingStatus(req: Request, res: Response) {
    try {
      const { streamId } = req.params;
      const stream = ContinuousAIController.activeStreams.get(streamId);

      if (!stream) {
        return res.status(404).json({
          success: false,
          error: 'Stream not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          streamId: stream.streamId,
          userId: stream.userId,
          query: stream.query,
          startTime: stream.startTime,
          status: stream.status,
          duration: Date.now() - stream.startTime.getTime(),
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error getting processing status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get processing status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async stopProcessing(req: Request, res: Response) {
    try {
      const { streamId } = req.params;
      const stream = ContinuousAIController.activeStreams.get(streamId);

      if (!stream) {
        return res.status(404).json({
          success: false,
          error: 'Stream not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Close the stream
      if (stream.response) {
        stream.response.write(`data: ${JSON.stringify({
          type: 'stream_stopped',
          streamId,
          message: 'Processing stopped by user',
          timestamp: new Date().toISOString()
        })}\n\n`);
        stream.response.end();
      }

      // Remove from active streams
      ContinuousAIController.activeStreams.delete(streamId);

      res.json({
        success: true,
        data: {
          streamId,
          message: 'Processing stopped',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error stopping processing:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop processing',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static getActiveStreams(): ProcessingStream[] {
    return Array.from(ContinuousAIController.activeStreams.values());
  }
}