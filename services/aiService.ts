import { supabase } from '../lib/supabase';
import { UserProfileService } from './userProfileService';
import { UserContextService, CompleteUserContext } from './userContextService';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

interface AIQueryRequest {
  query: string;
  sessionId?: string;
  preferences?: {
    responseStyle?: 'brief' | 'detailed' | 'conversational';
    includeActions?: boolean;
  };
  // Enhanced with complete user context
  completeUserContext?: CompleteUserContext;
}

interface DeeplinkAction {
  type: 'app_open';
  appName: string;
  action: string;
  data?: {
    searchTerm?: string;
    phoneNumber?: string;
    location?: string;
    destination?: string;
  };
}

interface AIQueryResponse {
  success: boolean;
  data?: {
    query: string;
    response: string;
    toolUsed?: string;
    reasoning?: string;
    suggestedActions?: string[];
    rawData?: any;
    deeplinkAction?: DeeplinkAction;
  };
  error?: string;
  timestamp: string;
}

interface AvailableToolsResponse {
  success: boolean;
  data?: {
    tools: Array<{
      name: string;
      description: string;
      category: string;
      examples: string[];
      dataAccess: 'read' | 'write' | 'both';
    }>;
    totalCount: number;
    categories: string[];
  };
  error?: string;
  timestamp: string;
}

export class AIService {
  /**
   * Process a natural language query using AI with complete user context (always fresh)
   */
  static async processQuery(request: AIQueryRequest): Promise<AIQueryResponse> {
    try {
      console.log('🚀 Processing AI query with complete user context...');
      
      // STEP 1: Always fetch fresh, complete user context
      const completeContext = await UserContextService.getCompleteUserContext();
      
      if (completeContext) {
        console.log('✅ Complete user context loaded:');
        console.log(UserContextService.getContextSummary(completeContext));
      } else {
        console.log('⚠️ No complete user context available');
      }

      // STEP 2: Check if this is a preference-related query first (with full context)
      // const preferenceResponse = await UserProfileService.handlePreferenceQuery(request.query);
      // if (preferenceResponse) {
      //   // Even preference queries get the user's name from context if available
      //   let enhancedResponse = preferenceResponse;
      //   if (completeContext) {
      //     const displayName = await UserContextService.getUserDisplayName();
      //     if (displayName !== 'friend' && !enhancedResponse.includes(displayName)) {
      //       // Add personalized touch if not already present
      //       enhancedResponse = enhancedResponse.replace(/^(Hey[^!]*!)/, `Hey ${displayName}!`);
      //     }
      //   }

      //   return {
      //     success: true,
      //     data: {
      //       query: request.query,
      //       response: enhancedResponse,
      //       toolUsed: 'userProfile',
      //       reasoning: 'Retrieved information from user preferences with complete context'
      //     },
      //     timestamp: new Date().toISOString()
      //   };
      // }

      // STEP 3: Prepare session and authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // STEP 4: Build enhanced request with complete user context
      const enhancedRequest = {
        ...request,
        completeUserContext: completeContext,
        // Legacy support - still include old personalization for backend compatibility
        personalization: completeContext ? {
          userPreferences: completeContext.profile,
          currentContext: completeContext.context,
          googleAccount: completeContext.googleAccount
        } : undefined,
        // Add style instructions
        styleInstructions: completeContext?.profile 
          ? await UserProfileService.getConversationStyleInstructions()
          : undefined
      };

      console.log('📤 Sending enhanced request to backend with complete context');
      console.log('🔍 Complete context summary:', completeContext ? {
        hasGoogleAccount: !!completeContext.googleAccount,
        googleName: completeContext.googleAccount?.name,
        googleEmail: completeContext.googleAccount?.email,
        hasProfile: !!completeContext.profile,
        profileName: completeContext.profile?.personalInfo?.name
      } : 'No complete context');

      // STEP 5: Send to backend AI service
      const response = await fetch(`${MCP_BASE_URL}/ai/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-User-Context': completeContext ? 'complete' : 'limited',
        },
        body: JSON.stringify(enhancedRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ AI response received with complete user context');

      // STEP 6: Update conversation context with topics if successful
      if (result.success && result.data) {
        await this.updateConversationTopics(request.query, result.data.response);
      }

      return result;
    } catch (error) {
      console.error('❌ AI query error:', error);
      throw error;
    }
  }

  /**
   * Get list of available AI tools
   */
  static async getAvailableTools(): Promise<AvailableToolsResponse> {
    try {
      const response = await fetch(`${MCP_BASE_URL}/ai/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting available tools:', error);
      throw error;
    }
  }

  /**
   * Get tools by category
   */
  static async getToolsByCategory(category: string): Promise<any> {
    try {
      const response = await fetch(`${MCP_BASE_URL}/ai/tools/category/${category}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting tools by category:', error);
      throw error;
    }
  }

  /**
   * Helper method to format AI responses for display
   */
  static formatAIResponse(response: AIQueryResponse): string {
    if (!response.success || !response.data) {
      return response.error || 'Sorry, I couldn\'t process your request.';
    }

    let formatted = response.data.response;

    // Add reasoning if available and user might find it helpful
    if (response.data.reasoning && response.data.toolUsed) {
      formatted += `\n\n*Used ${response.data.toolUsed} to get this information*`;
    }

    return formatted;
  }

  /**
   * Get suggested follow-up questions based on the response
   */
  static getSuggestedQuestions(response: AIQueryResponse): string[] {
    if (!response.success || !response.data?.suggestedActions) {
      return [];
    }

    return response.data.suggestedActions.map(action => 
      action.replace(/^(Would you like to|Do you want to|Should I)/, '').trim()
    );
  }

  /**
   * Check if AI service is available
   */
  static async checkAIAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${MCP_BASE_URL}/ai/tools`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.status !== 503; // 503 means AI service not available
    } catch (error) {
      return false;
    }
  }

  /**
   * Call a specific MCP tool directly
   */
  static async callMCPTool(toolName: string, params: any = {}): Promise<any> {
    try {
      // Get the current session to include access token if needed
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${MCP_BASE_URL}/mcp/tools/${toolName}/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error response body:`, errorText);
        
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error calling MCP tool ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update conversation topics for better context tracking
   */
  private static async updateConversationTopics(query: string, response: string): Promise<void> {
    try {
      // Extract topics from query and response
      const topics = this.extractTopics(query + ' ' + response);
      await UserProfileService.updateConversationContext(topics);
    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  }

  /**
   * Simple topic extraction from text
   */
  private static extractTopics(text: string): string[] {
    const keywords = text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 10); // Keep top 10 keywords

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Check if word is a stop word
   */
  private static isStopWord(word: string): boolean {
    const stopWords = ['that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time'];
    return stopWords.includes(word);
  }

  /**
   * Get personalized greeting
   */
  static async getPersonalizedGreeting(): Promise<string> {
    return await UserProfileService.getPersonalizedGreeting();
  }
}