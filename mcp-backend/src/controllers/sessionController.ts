import { Request, Response } from 'express';
import { SessionService } from '../services/sessionService';
import { SessionCreateRequest, SessionUpdateRequest, MessageCreateRequest } from '../types/session';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class SessionController {
  
  /**
   * Create a new conversation session
   * POST /sessions
   */
  static async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const createRequest: SessionCreateRequest = req.body;
      
      console.log(`💬 Creating new session for ${req.user.email}`);
      
      const session = await SessionService.createSession(req.user.id, createRequest);

      res.status(201).json({
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in createSession:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get all sessions for the authenticated user
   * GET /sessions
   */
  static async getUserSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      
      console.log(`📋 Fetching sessions for ${req.user.email}`);
      
      const sessions = await SessionService.getUserSessions(req.user.id, limit);

      res.json({
        success: true,
        data: {
          sessions,
          count: sessions.length
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in getUserSessions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get a specific session
   * GET /sessions/:sessionId
   */
  static async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sessionId } = req.params;
      
      const session = await SessionService.getSession(sessionId, req.user.id);

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in getSession:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update session metadata
   * PUT /sessions/:sessionId
   */
  static async updateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sessionId } = req.params;
      const updateRequest: SessionUpdateRequest = req.body;

      console.log(`✏️ Updating session ${sessionId} for ${req.user.email}`);
      
      const session = await SessionService.updateSession(sessionId, req.user.id, updateRequest);

      res.json({
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in updateSession:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get conversation history for a session
   * GET /sessions/:sessionId/messages
   */
  static async getSessionMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sessionId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      console.log(`💬 Fetching messages for session ${sessionId}`);
      
      const messages = await SessionService.getSessionMessages(sessionId, req.user.id, limit);

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          messages,
          count: messages.length
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in getSessionMessages:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Add a message to a session
   * POST /sessions/:sessionId/messages
   */
  static async addMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sessionId } = req.params;
      const { role, content, metadata } = req.body;

      if (!role || !content) {
        res.status(400).json({
          success: false,
          error: 'Role and content are required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const messageRequest: MessageCreateRequest = {
        session_id: sessionId,
        role,
        content,
        metadata
      };

      console.log(`💬 Adding ${role} message to session ${sessionId}`);
      
      const message = await SessionService.addMessage(messageRequest);

      // If this is the first user message, update session title based on message content
      if (role === 'user') {
        const messages = await SessionService.getSessionMessages(sessionId, req.user.id);
        const userMessages = messages.filter(m => m.role === 'user');
        if (userMessages.length === 1) { // This was the first user message
          await SessionService.updateSessionTitle(sessionId, req.user.id, content);
        }
      }

      res.status(201).json({
        success: true,
        data: message,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in addMessage:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add message',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get conversation context (recent messages + tool calls)
   * GET /sessions/:sessionId/context
   */
  static async getConversationContext(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sessionId } = req.params;
      const messageCount = parseInt(req.query.messages as string) || 10;

      console.log(`🧠 Fetching context for session ${sessionId} (${messageCount} messages)`);
      
      const context = await SessionService.getConversationContext(sessionId, req.user.id, messageCount);

      res.json({
        success: true,
        data: context,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in getConversationContext:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch conversation context',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete a session
   * DELETE /sessions/:sessionId
   */
  static async deleteSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sessionId } = req.params;

      console.log(`🗑️ Deleting session ${sessionId} for ${req.user.email}`);
      
      await SessionService.deleteSession(sessionId, req.user.id);

      res.json({
        success: true,
        data: { deleted: true, session_id: sessionId },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in deleteSession:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Archive a session
   * POST /sessions/:sessionId/archive
   */
  static async archiveSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { sessionId } = req.params;

      console.log(`📦 Archiving session ${sessionId} for ${req.user.email}`);
      
      const session = await SessionService.archiveSession(sessionId, req.user.id);

      res.json({
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in archiveSession:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive session',
        timestamp: new Date().toISOString(),
      });
    }
  }
}