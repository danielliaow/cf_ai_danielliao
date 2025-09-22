import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { AIService, AIModelType } from '../services/aiService';
import { UserContext } from '../types/aiTools';
import { supabase } from '../services/supabase';
import { MCPToolRegistry } from '../services/mcpToolRegistry';

export class AIController {
  /**
   * Helper function to get user's preferred AI model and create appropriate AIService instance
   */
  private static async createAIServiceForUser(userId: string, providedModel?: AIModelType): Promise<AIService> {
    try {
      // If model is provided in request, use it directly
      if (providedModel) {
        return new AIService(providedModel);
      }

      // Otherwise, get user preferences from Supabase
      const { data: preferencesData, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (error || !preferencesData?.preferences?.assistantBehavior?.preferred_model) {
        return new AIService('gemini');
      }

      const preferredModel = preferencesData.preferences.assistantBehavior.preferred_model as AIModelType;
      return new AIService(preferredModel);
    } catch (error) {
      return new AIService('gemini');
    }
  }

  static async initializeAI(): Promise<void> {
    try {
      // Initialize with default model - individual requests will create their own instances
      console.log('🧠 AI Service module initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Service:', error);
      // Don't throw - let the app continue without AI features
    }
  }

  static async processNaturalLanguageQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { query, sessionId, preferences, completeUserContext, model } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query is required and must be a string',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`🧠 Processing AI query for ${req.user.email}: "${query}"`);

      const context: UserContext = {
        query: query.trim(),
        timestamp: new Date().toISOString(),
        timezone: req.headers['x-timezone'] as string || 'UTC',
        sessionId,
        preferences: {
          responseStyle: preferences?.responseStyle || 'conversational',
          includeActions: preferences?.includeActions !== false,
          ...preferences
        },
        completeUserContext: completeUserContext || undefined
      };

      // Create AI service instance with provided model or user's preferred model
      const aiService = await AIController.createAIServiceForUser(req.user.id, model as AIModelType);
      const result = await aiService.processQuery(context, req.user.id);

      res.json({
        success: result.success,
        data: {
          query: context.query,
          response: result.naturalResponse,
          toolUsed: result.toolUsed,
          reasoning: result.reasoning,
          suggestedActions: result.suggestedActions,
          rawData: result.rawData, // Include for debugging/advanced users
          deeplinkAction: result.deeplinkAction, // Include deeplink actions
        },
        error: result.error,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error in AI query processing:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while processing AI query',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getAvailableTools(req: Request, res: Response): Promise<void> {
    try {
      const registry = MCPToolRegistry.getInstance();
      const tools = registry.getAllToolMetadata();

      res.json({
        success: true,
        data: {
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.category,
            examples: tool.examples.map(ex => ex.query),
            dataAccess: tool.dataAccess
          })),
          totalCount: tools.length,
          categories: [...new Set(tools.map(t => t.category))]
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error getting available tools:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available tools',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getToolsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      
      if (!category) {
        res.status(400).json({
          success: false,
          error: 'Category parameter is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const registry = MCPToolRegistry.getInstance();
      const tools = registry.getToolsByCategory(category);

      res.json({
        success: true,
        data: {
          category,
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            examples: tool.examples.map(ex => ex.query)
          })),
          count: tools.length
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Error getting tools by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tools by category',
        timestamp: new Date().toISOString(),
      });
    }
  }
}