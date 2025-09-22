import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AIToolMetadata, AIToolSelection, AIResponse, UserContext, DeeplinkAction } from '../types/aiTools';
import { MCPToolRegistry } from './mcpToolRegistry';
import { SessionService } from './sessionService';
import { supabase } from './supabase';

export type AIModelType = 'gemini' | 'gpt-4';

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private openai: OpenAI | null = null;
  private model: any;
  private modelType: AIModelType;
  private toolRegistry: MCPToolRegistry;
  private responseCache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private static promptCache: Map<string, {result: string, timestamp: number}> = new Map();
  private static contextCache: Map<string, {data: any, timestamp: number}> = new Map();

  constructor(modelType: AIModelType = 'gemini') {
    this.modelType = modelType;
    
    if (modelType === 'gemini') {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required for Gemini model');
      }
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } else if (modelType === 'gpt-4') {
      const openaiKey = process.env.OPENAI_API_KEY;
    const openaiModel = process.env.OPENAI_API_MODEL; // <- could be a base or finetuned model ID
    if (!openaiKey || !openaiModel) {
      throw new Error('OPENAI_API_KEY and OPENAI_API_MODEL are required');
    }
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.model = openaiModel; // store for use in completions
  }
    
    this.toolRegistry = MCPToolRegistry.getInstance();
  }

  /**
   * Unified method to generate content with either model
   */
  private async generateContent(prompt: string): Promise<string> {
    try {
      // Check prompt cache for identical prompts
      const promptHash = this.hashPrompt(prompt);
      const cached = AIService.promptCache.get(promptHash);
      if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) { // 2 min cache for prompts
        return cached.result;
      }

      let result: string;
      
      if (this.modelType === 'gemini' && this.model) {
        const response = await Promise.race([
          this.model.generateContent(prompt),
          this.timeout(15000) // 15 second timeout
        ]);
        result = (await response.response).text().trim();
      } else if (this.modelType === 'gpt-4' && this.openai) {
        const completion = await Promise.race([
          this.openai.chat.completions.create({
            model: 'gpt-4o-mini', // Use mini for faster responses
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5, // Lower temperature for faster, more consistent responses
            max_tokens: 3000, // Reduced for faster generation
          }),
          this.timeout(12000) // 12 second timeout
        ]);
        result = completion.choices[0]?.message?.content?.trim() || '';
      } else {
        throw new Error(`Invalid model configuration: ${this.modelType}`);
      }

      // Cache the result
      AIService.promptCache.set(promptHash, {
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error(`❌ Error generating content with ${this.modelType}:`, error);
      throw error;
    }
  }

  private hashPrompt(prompt: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), ms)
    );
  }

  /**
   * Enrich context with complete user data (preferred method)
   */
  private enrichContextWithCompleteUserData(context: UserContext): UserContext {
    const completeContext = context.completeUserContext;
    if (!completeContext) return context;

    // Build enhanced context with complete user data
    const enhancedContext: UserContext = {
      ...context,
      preferences: {
        ...context.preferences,
        // Map user personalization data to existing preferences structure
        responseStyle: completeContext.profile?.communicationStyle?.detail_level === 'brief' ? 'brief' :
                      completeContext.profile?.communicationStyle?.detail_level === 'detailed' ? 'detailed' : 'conversational',
        includeActions: completeContext.profile?.assistantBehavior?.suggest_related_topics || false,
        isVoiceMode: context.preferences?.isVoiceMode || false,
        cleanForSpeech: context.preferences?.cleanForSpeech || false,
        isVoiceQuery: context.preferences?.isVoiceQuery || false,
      },
      // Enhanced personalization data
      personalization: {
        userPreferences: completeContext.profile,
        googleAccount: completeContext.googleAccount,
        currentContext: {
          timeOfDay: completeContext.context.time_of_day,
          dayOfWeek: completeContext.context.day_of_week,
          timezone: completeContext.context.timezone,
          timestamp: completeContext.context.fetched_at,
        },
        onboardingCompleted: completeContext.profile?.metadata?.onboarding_completed || false,
      }
    };


    return enhancedContext;
  }

  /**
   * Enrich user context with personalization preferences (legacy method)
   */
  private async enrichContextWithPreferences(context: UserContext, userId: string): Promise<UserContext> {
    try {
      
      
      // Fetch user preferences from database
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences, onboarding_completed')
        .eq('user_id', userId)
        .single();

      if (error || !data?.preferences) {
        return context; // Return original context if no preferences found
      }

      const preferences = data.preferences;

      // Create enriched context with preferences
      const enrichedContext: UserContext = {
        ...context,
        preferences: {
          ...context.preferences,
          // Map user personalization data to existing preferences structure
          responseStyle: this.mapDetailLevelToResponseStyle(preferences.communicationStyle?.detail_level),
          includeActions: preferences.assistantBehavior?.suggest_related_topics || false,
          isVoiceMode: context.preferences?.isVoiceMode || false,
          cleanForSpeech: context.preferences?.cleanForSpeech || false,
          isVoiceQuery: context.preferences?.isVoiceQuery || false,
        },
        // Add personalization data for AI prompt generation
        personalization: {
          userPreferences: preferences,
          onboardingCompleted: data.onboarding_completed,
          currentContext: {
            timeOfDay: new Date().getHours() < 12 ? 'morning' : 
                      new Date().getHours() < 17 ? 'afternoon' : 'evening',
            dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            timestamp: new Date().toISOString(),
            timezone: context.timezone || 'UTC',
          }
        }
      };

      return enrichedContext;
    } catch (error) {
      console.error('❌ Error enriching context with preferences:', error);
      return context; // Fallback to original context on error
    }
  }

  /**
   * Map detail level preference to response style
   */
  private mapDetailLevelToResponseStyle(detailLevel?: string): 'brief' | 'detailed' | 'conversational' {
    switch (detailLevel) {
      case 'brief': return 'brief';
      case 'detailed': 
      case 'comprehensive': return 'detailed';
      default: return 'conversational';
    }
  }

  /**
   * Main AI reasoning pipeline
   */
  async processQuery(context: UserContext, userId: string): Promise<AIResponse> {
    try {

      // Step 0: Enhanced context enrichment with complete user data
      let enrichedContext = context;

      // Check if we have complete user context from client
      if (context.completeUserContext) {
        enrichedContext = this.enrichContextWithCompleteUserData(context);
      } else {
        // Fallback to legacy preference fetching
        enrichedContext = await this.enrichContextWithPreferences(context, userId);
      }

      // Step 0.5: Check for deeplink intent FIRST (before tool selection)
      const deeplinkIntent = await this.detectDeeplinkIntent(enrichedContext.query);
      if (deeplinkIntent.isDeepLinkIntent && deeplinkIntent.confidence >= 0.7) {
        return {
          success: true,
          naturalResponse: deeplinkIntent.response,
          toolUsed: 'deeplink',
          reasoning: deeplinkIntent.reasoning,
          suggestedActions: [],
          rawData: null,
          deeplinkAction: deeplinkIntent.action // New field for frontend
        };
      }

      // Step 1: Analyze query and select tool
      const toolSelection = await this.selectTool(enrichedContext, userId);
      if (!toolSelection) {
        return {
          success: false,
          naturalResponse: "I'm not sure how to help with that request. PLease try again",
          error: 'No suitable tool found'
        };
      }

      if(toolSelection && toolSelection.tool === null && toolSelection.geminiOutput){
        return {
          success: true,
          naturalResponse: toolSelection.geminiOutput,
          reasoning: toolSelection.reasoning,
          rawData: null,
          suggestedActions: []
        };
      }
      
      // Step 2: Execute the selected tool (handle null tools for conversational responses)
      let toolResult;
      if (toolSelection.tool === null) {
        // Handle conversational responses without tools
        toolResult = {
          success: true,
          data: null,
          toolUsed: null
        };
      } else {
        toolResult = await this.executeTool(toolSelection, userId);
      }
      
      // Step 2.5: Check if we need tool chaining
      let chainedResult = null;
      if (toolResult.success && this.shouldChainTool(toolSelection, toolResult, enrichedContext)) {
        chainedResult = await this.performToolChaining(toolSelection, toolResult, userId, enrichedContext);
      }
      
      // Step 3: Generate natural language response
      const finalResult = chainedResult || toolResult;
      const naturalResponse = await this.generateResponse(enrichedContext, toolSelection, finalResult, userId);
      
      return {
        success: true,
        toolUsed: toolSelection.tool,
        rawData: finalResult.data,
        naturalResponse,
        reasoning: toolSelection.reasoning,
        suggestedActions: await this.generateSuggestedActions(context, finalResult),
        chainedTools: chainedResult ? ['searchWeb', 'crawlPage'] : undefined
      };

    } catch (error) {
      console.error('❌ AI processing error:', error);
      return {
        success: false,
        naturalResponse: 'Sorry, I encountered an error while processing your request. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze user query and select the best tool with conversation context
   */
  public async selectTool(context: UserContext, userId?: string): Promise<AIToolSelection | null> {
    const availableTools = this.toolRegistry.getAllToolMetadata();
    


    // Get conversation context if sessionId is provided
    let conversationContext = '';
    if (context.sessionId && userId) {
      try {
        const contextData = await SessionService.getConversationContext(context.sessionId, userId, 5);
        if (contextData.messages.length > 0) {
          conversationContext = '\n\nConversation History (last 5 messages):\n' + 
            contextData.messages.map((msg, index) => `${msg.role}: ${msg.content}`).join('\n');
          
          // Add tool usage context if available
          if (contextData.tool_calls.length > 0) {
            conversationContext += '\n\nRecent Tool Usage:\n' +
              contextData.tool_calls.map((call: any) => `- Used ${call.tool_name} ${call.created_at ? new Date(call.created_at).toLocaleTimeString() : ''}`).join('\n');
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch conversation context:', error);
      }
    }
    const prompt = `
    You are an intelligent assistant with advanced capabilities including file management, document processing, Google Drive integration, and productivity tools.
    
    Available Tools:
    ${this.formatToolsForPrompt(availableTools)}
    
    User Query: "${context.query}"
    Timestamp: ${context.timestamp}${conversationContext}
    Enriched Context Preferences: ${JSON.stringify(context)}
    
    Your task:
    1. Decide if the query should be handled by a tool or directly answered by Gemini.
    2. If a tool is best, pick the correct one and extract the required parameters.
    3. For real-time data (weather, news, stock prices, movie times, etc.) ALWAYS use searchWeb first.
    4. If the user mentions or asks about a specific website/URL, use crawlPage to get current content.
    5. For file operations, document processing, or Google Drive actions, use the appropriate tools.
    6. If no tool matches but Gemini can generate a useful answer, provide that as "geminiOutput".
       - When generating Gemini output, also integrate **enriched user context** (preferences, personalization, metadata, assistant behavior, etc.) if it has any relation to the query.
       - Example: If user asks "what do you know about me", check personalization, preferences, and context data to construct the response.
    7. Always classify the response into a category.
    8. Indicate if Gemini's output can safely be shown to the user with a boolean flag.
    
    Respond in **valid JSON**:
    {
      "tool": "toolName or null",
      "confidence": 0-100,
      "parameters": { "only include parameters explicitly mentioned by user" },
      "reasoning": "why this choice was made",
      "geminiOutput": "text or null",
      "category": "general | calendar | email | files | documents | drive | search | analysis | creation",
      "canUseGemini": true/false
    }
    
    Guidelines:
    - **Context Awareness**: Use conversation history to understand follow-up questions, pronouns ("it", "that", "those"), and references ("the email", "my files", "that document").
    - **Follow-up Handling**:
      * "Create a doc from it" after retrieving emails → use createDocument with email data
      * "Summarize it" after finding files → use processDocument or generate summary
      * "Save it to drive" after generating content → use createGoogleDriveFile
      * "Tell me more about that" after search results → use crawlPage on relevant URLs
      * "What about tomorrow?" after today's calendar → use getTodaysEvents with tomorrow's date
    - **Tool Selection**:
      * File System Tools: readFile, writeFile, listDirectory for local operations
      * Google Drive Tools: searchGoogleDrive, getGoogleDriveFile, createGoogleDriveFile for Drive operations
      * Document Tools: processDocument for analysis, createDocument/generateContentWithAI for creation
      * Calendar/Email: getTodaysEvents, getEmails with advanced Gmail search syntax
      * Web Tools: searchWeb for real-time data, crawlPage for specific URLs
    - **Chaining Recognition**: Recognize when user wants multiple operations (e.g., "get my emails and create a summary document")
    - **Reference Resolution**: When user says "that file", "the document", "my emails", look at recent context to identify what they're referring to
    - **Time References**: "today", "tomorrow", "this week", "yesterday" - calculate appropriate dates based on timestamp
    - **Pronoun Mapping**: "it" usually refers to the most recently mentioned item in conversation history
    - **Enriched Context Integration** (only for geminiOutput):
      * Use personalization and preferences when relevant to the query.
      * If user asks about themselves, reflect details from metadata, personal info, assistant behavior, or current context.
      * Make sure the order in which you consider preferences is Religion/race,interests second  and hobbies third
      * Respect privacyPreferences — never reveal or infer beyond what is explicitly allowed.
    - If context is insufficient or unclear, ask for clarification through geminiOutput rather than guessing
    `

    try {
      let text = await this.generateContent(prompt);

      // Sanitize for safety
      if (text.startsWith("```")) {
        text = text.replace(/```(json)?/g, "").trim();
      }
    
      
      
      const selection = JSON.parse(text);
      
      // // Validate selection
      // if (selection.tool && !availableTools.find(t => t.name === selection.tool)) {
      //   console.warn('⚠️ AI selected invalid tool:', selection.tool);
      //   return null;
      // }
      
      // return selection.tool ? selection : null;
      return selection
      
    } catch (error) {
      console.error('❌ Error in tool selection:', error);
      return null;
    }
  }

  /**
   * Execute the selected MCP tool with caching
   */
  public async executeTool(selection: AIToolSelection, userId: string): Promise<any> {
    const tool = this.toolRegistry.getTool(selection.tool);
    if (!tool) {
      throw new Error(`Tool ${selection.tool} not found`);
    }

    // Create cache key
    const cacheKey = `${selection.tool}_${userId}_${JSON.stringify(selection.parameters)}`;
    
    // Check cache for non-real-time tools
    const cachedData = this.responseCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return cachedData.result;
    }

    
    const result = await tool.execute(userId, selection.parameters);
    
    // Cache the result
    this.responseCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    // Clean old cache entries periodically
    if (this.responseCache.size > 100) {
      this.cleanCache();
    }
    
    return result;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    
    // Clean response cache
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.responseCache.delete(key);
      }
    }
    
    // Clean prompt cache
    for (const [key, value] of AIService.promptCache.entries()) {
      if (now - value.timestamp > 2 * 60 * 1000) {
        AIService.promptCache.delete(key);
      }
    }
    
    // Clean context cache
    for (const [key, value] of AIService.contextCache.entries()) {
      if (now - value.timestamp > 10 * 60 * 1000) { // 10 min for context
        AIService.contextCache.delete(key);
      }
    }
  }

  /**
   * Build comprehensive personalization prompt with complete user context
   */
  private buildPersonalizationPrompt(context: UserContext): string {
    let prompt = '';

    // Check if we have complete user context
    if (context.completeUserContext) {
      const completeContext = context.completeUserContext;
      
      prompt += '\n=== COMPLETE USER CONTEXT ===\n\n';
      
      // Google Account Information
      prompt += '🔐 **GOOGLE ACCOUNT:**\n';
      if (completeContext.googleAccount?.name) {
        prompt += `- Name: ${completeContext.googleAccount.name}\n`;
      }
      if (completeContext.googleAccount?.email) {
        prompt += `- Email: ${completeContext.googleAccount.email}\n`;
      }
      prompt += `- User ID: ${completeContext.session?.user_id}\n`;
      
      // Current Context
      prompt += '\n⏰ **CURRENT CONTEXT:**\n';
      prompt += `- Current time: ${completeContext.context?.current_time}\n`;
      prompt += `- Day: ${completeContext.context?.day_of_week}\n`;
      prompt += `- Time of day: ${completeContext.context?.time_of_day}\n`;
      prompt += `- Timezone: ${completeContext.context?.timezone}\n`;
      
      // Profile Information (if available)
      if (completeContext.profile) {
        prompt += '\n👤 **USER PROFILE:**\n';
        
        // Personal Info
        const personal = completeContext.profile.personalInfo;
        if (personal?.name && personal.name !== completeContext.googleAccount?.name) {
          prompt += `- Preferred name: ${personal.name}\n`;
        }
        if (personal?.profession) {
          prompt += `- Profession: ${personal.profession}`;
          if (personal.industry) prompt += ` (${personal.industry})`;
          if (personal.experience_level) prompt += ` - ${personal.experience_level} level`;
          prompt += '\n';
        }
        if (personal?.hobbies && personal.hobbies.length > 0) {
          prompt += `- Hobbies: ${personal.hobbies.join(', ')}\n`;
        }
        if (personal?.religion && personal.religion !== 'prefer_not_to_say') {
          prompt += `- Faith/Worldview: ${personal.religion}\n`;
        }

        // Communication Style
        const commStyle = completeContext.profile.communicationStyle;
        if (commStyle) {
          prompt += '\n💬 **COMMUNICATION PREFERENCES:**\n';
          prompt += `- Tone: ${commStyle.tone}\n`;
          prompt += `- Detail level: ${commStyle.detail_level}\n`;
          prompt += `- Response length: ${commStyle.response_length}\n`;
          prompt += `- Explanation style: ${commStyle.explanation_style}\n`;
          if (commStyle.use_analogies) prompt += '- LOVES analogies and metaphors\n';
          if (commStyle.include_examples) prompt += '- Always include practical examples\n';
        }
        
        // Interests
        const content = completeContext.profile.contentPreferences;
        if (content?.primary_interests && content.primary_interests.length > 0) {
          prompt += '\n🎯 **INTERESTS:**\n';
          prompt += `- Primary interests: ${content.primary_interests.join(', ')}\n`;
          if (content.current_affairs_interests?.length) {
            prompt += `- Current affairs: ${content.current_affairs_interests.join(', ')}\n`;
          }
          if (content.learning_style) {
            prompt += `- Learning style: ${content.learning_style}\n`;
          }
        }
        
        // Work Preferences
        const work = completeContext.profile.workPreferences;
        if (work && Object.values(work).some(v => v)) {
          prompt += '\n💼 **WORK STYLE:**\n';
          if (work.work_schedule) prompt += `- Most productive: ${work.work_schedule}\n`;
          if (work.productivity_style) prompt += `- Work style: ${work.productivity_style}\n`;
          if (work.meeting_preferences) prompt += `- Meeting style: ${work.meeting_preferences}\n`;
        }
        
        // Technology
        const domain = completeContext.profile.domainPreferences;
        if (domain?.tech_stack?.length) {
          prompt += '\n💻 **TECHNOLOGY:**\n';
          prompt += `- Tech stack: ${domain.tech_stack.join(', ')}\n`;
          if (domain.coding_style) prompt += `- Coding style: ${domain.coding_style}\n`;
        }
        
        // Assistant Behavior
        const behavior = completeContext.profile.assistantBehavior;
        if (behavior) {
          prompt += '\n🤖 **ASSISTANT BEHAVIOR:**\n';
          if (behavior.personality) prompt += `- Personality: ${behavior.personality}\n`;
          if (behavior.proactivity_level) prompt += `- Proactivity: ${behavior.proactivity_level}\n`;
          if (behavior.follow_up_questions) prompt += '- Ask follow-up questions\n';
          if (behavior.suggest_related_topics) prompt += '- Suggest related topics\n';
        }
        
        prompt += `\n- Profile last updated: ${completeContext.profile.metadata?.updated_at ? new Date(completeContext.profile.metadata.updated_at).toLocaleDateString() : 'Unknown'}\n`;
        prompt += `- Onboarding completed: ${completeContext.profile.metadata?.onboarding_completed ? 'Yes' : 'No'}\n`;
      } else {
        prompt += '\n⚠️ **NO PROFILE DATA** - User has not completed preferences setup\n';
      }
      
      prompt += '\n=== END COMPLETE CONTEXT ===\n';
      
    } else if (context.personalization?.userPreferences) {
      // Fallback to legacy personalization (abbreviated)
      const prefs = context.personalization.userPreferences;
      
      prompt += '\n**PERSONALIZATION CONTEXT**:\n';
      if (prefs.personalInfo?.name) {
        prompt += `- User's name: ${prefs.personalInfo.name}\n`;
      }
      if (prefs.communicationStyle?.tone) {
        prompt += `- Preferred tone: ${prefs.communicationStyle.tone}\n`;
      }
      if (prefs.personalInfo?.hobbies?.length) {
        prompt += `- Hobbies: ${prefs.personalInfo.hobbies.join(', ')}\n`;
      }
    }
    
    if (prompt) {
      prompt += '\n**CRITICAL**: Use this context to provide personalized, relevant responses. ';
      prompt += 'Address the user by their preferred name when appropriate, reference their interests and work when relevant, ';
      prompt += 'and adapt your communication style to their exact preferences. Be human-like and genuinely helpful.\n\n';
    }
    
    return prompt;
  }

  /**
   * Get tone instruction based on user preferences
   */
  private getToneInstruction(context: UserContext): string {
    const tone = context.personalization?.userPreferences?.communicationStyle?.tone || 'friendly';
    
    switch (tone) {
      case 'professional':
        return 'Write in a professional, business-appropriate tone';
      case 'casual':
        return 'Use a relaxed, informal, conversational tone';
      case 'friendly':
        return 'Be warm, supportive, and approachable';
      case 'formal':
        return 'Use structured, precise, and academic language';
      case 'enthusiastic':
        return 'Be energetic, encouraging, and positive';
      case 'balanced':
        return 'Adapt your tone to match the context and topic';
      default:
        return 'Write in a friendly, conversational tone';
    }
  }

  /**
   * Generate natural language response from tool result with conversation context
   */
  public async generateResponse(context: UserContext, selection: AIToolSelection, toolResult: any, userId?: string): Promise<string> {
    if (!toolResult.success) {
      return `I couldn't retrieve the information you requested. ${toolResult.error || 'Please try again later.'}`;
    } 
    // Get conversation context if sessionId is provided
    let conversationContext = '';
    if (context.sessionId && userId) {
      try {
        const contextData = await SessionService.getConversationContext(context.sessionId, userId, 3);
        if (contextData.messages.length > 0) {
          conversationContext = '\n\nConversation History (last 3 messages):\n' + 
            contextData.messages.map(msg => `${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`).join('\n');
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch conversation context for response generation:', error);
      }
    }

    // Build personalization context
    const personalizationPrompt = this.buildPersonalizationPrompt(context);

    const prompt = `
    You are a warm, intelligent personal assistant that not only provides accurate information but also interacts with empathy, personality, and awareness of the user’s preferences and context. Your goal is to make the response feel alive, natural, and tailored to the individual.
    
    Original Query: "${context.query}"
    Tool Used: ${selection.tool}
    Raw Data: ${JSON.stringify(toolResult.data, null, 2)}${conversationContext}
    
    ${toolResult.data.auto_crawled ? 
    `🔍 **SPECIAL INSTRUCTION**: This query involved automatically visiting and scraping ${toolResult.data.total_sites_crawled} websites to provide comprehensive information. Synthesize ALL the crawled content into a cohesive response.` : ''}
    
    ${personalizationPrompt}
    
    Instructions:
    - Start with a tone that feels natural and aligned with the user’s preferences (friendly, professional, casual, supportive, etc.)
    - Infuse subtle emotional intelligence (acknowledge if something sounds exciting, challenging, or disappointing)
    - Use personalization context when relevant (preferences, personal info, work style, time of day, etc.)
      * Example: If evening → "Since it’s evening, here’s a quick summary so you can wrap up your day."
      * If user has work preferences → shape response style accordingly
    - Maintain continuity with conversation history: refer back to what was said earlier when useful
    - Focus on what the user specifically asked for, but link it to their broader context when relevant
    - **Handle chained operations**: If multiple tools were used, explain clearly what was done in sequence
    - **Multi-site web scraping**: 
      * Combine insights from ALL crawled sites into a cohesive summary
      * Mention that you "visited and analyzed multiple websites" to ensure thoroughness
      * Note any conflicting or differing information across sources
    - **Document creation**: If a document was created, mention where it was saved (local/Drive) and share any links
    - **Tool chaining**: Clearly narrate the workflow (e.g., "I first searched the web, then visited several sites, and finally created a document with the findings")
    - **Data-specific guidelines**:
      * Calendar → list events with times, add light context ("looks like a busy morning ahead")
      * Email → summarize key messages, highlight urgent or important ones
      * File/Drive → mention type, size, location, and relevance to the request
    - For research/voice queries, give detailed but easy-to-digest explanations
    - ${context.preferences?.isVoiceMode || context.preferences?.isVoiceQuery 
        ? 'Structure for listening: clear transitions, conversational flow, and natural pauses.' 
        : 'Use clean markdown with lists, bullet points, and sections for readability.'}
    - If the data is empty or minimal, acknowledge it in a supportive way ("I couldn’t find anything new, but I can keep an eye on it for you.")
    - Reference previous interactions when relevant ("As you mentioned yesterday..." or "This builds on what we did earlier.")
    - Show subtle personality cues: encouragement, reassurance, or humor when appropriate
    
    Examples:
    - Calendar: "You’ve got 3 meetings today. The next one is your team standup at 10 AM. That should set the tone for the morning."
    - Email: "You’ve received 5 new emails. The most recent is from John about the project deadline — might be worth checking soon."
    - Chained operations: "I pulled in your latest emails, summarized them, and created a document in Google Drive called 'Daily Summary'. It’s ready for you to review."
    - Document creation: "I created a document called 'Meeting Notes'. You’ll find it both locally and in your Drive for easy access."
    
    Generate a natural, emotionally intelligent response:
    `;

    try {
      return await this.generateContent(prompt);
    } catch (error) {
      console.error('❌ Error generating response:', error);
      return 'I found the information you requested, but had trouble formatting the response. Please check the raw data above.';
    }
  }

  /**
   * Generate suggested follow-up actions
   */
  public async generateSuggestedActions(context: UserContext, toolResult: any): Promise<string[]> {
    // Simple rule-based suggestions for now
    const suggestions: string[] = [];
    
    if (context.query.toLowerCase().includes('calendar') || context.query.toLowerCase().includes('meeting')) {
      suggestions.push('Would you like to see your schedule for tomorrow?');
      suggestions.push('Do you want to check for any conflicts?');
    }
    
    if (context.query.toLowerCase().includes('email')) {
      suggestions.push('Would you like me to check for any urgent emails?');
      suggestions.push('Do you want to see emails from specific people?');
    }
    
    return suggestions.slice(0, 2); // Limit to 2 suggestions
  }

  /**
   * Determine if we should chain to another tool based on the first tool's result
   */
  private shouldChainTool(selection: AIToolSelection, toolResult: any, context: UserContext): boolean {
    if (!toolResult.success || !toolResult.data) return false;
    
    const query = context.query.toLowerCase();
    
    // 1. Enhanced web search auto-chaining - automatically crawl multiple sites for comprehensive data
    if (selection.tool === 'searchWeb' && toolResult.data.results) {
      const results = toolResult.data.results;
      
      // Auto-crawl for these scenarios (make it more aggressive)
      const shouldAutoCrawl = 
        // Research and information gathering queries
        query.includes('research') ||
        query.includes('information about') ||
        query.includes('tell me about') ||
        query.includes('what is') ||
        query.includes('explain') ||
        query.includes('summarize') ||
        query.includes('analyze') ||
        query.includes('content of') ||
        query.includes('details') ||
        query.includes('learn about') ||
        query.includes('find out about') ||
        // Current events and news
        query.includes('news') ||
        query.includes('latest') ||
        query.includes('recent') ||
        query.includes('update') ||
        // Comparison and analysis
        query.includes('compare') ||
        query.includes('versus') ||
        query.includes('vs') ||
        // Any query that seems to want comprehensive information
        query.includes('comprehensive') ||
        query.includes('detailed') ||
        query.includes('complete') ||
        // Voice mode queries tend to be more conversational
        Boolean(context.preferences?.isVoiceQuery);
      
      // Auto-crawl if we have results and it's an information-seeking query
      return shouldAutoCrawl && results.length > 0;
    }
    
    // 2. If we retrieved emails/calendar/drive data and user wants to create a document
    const dataRetrievalTools = ['getEmails', 'getLastTenMails', 'getTodaysEvents', 'searchGoogleDrive', 'getGoogleDriveFile'];
    if (dataRetrievalTools.includes(selection.tool || '') && toolResult.data) {
      const wantsDocument = query.includes('create') && (query.includes('doc') || query.includes('document') || query.includes('summary') || query.includes('report'));
      return wantsDocument;
    }
    
    // 3. If we generated content and user wants to save it
    if (selection.tool === 'generateContentWithAI' && toolResult.data) {
      const wantsToSave = query.includes('save') || query.includes('create doc') || query.includes('write to');
      return wantsToSave;
    }
    
    // 4. If we processed a document and user wants to create a summary
    if (selection.tool === 'processDocument' && toolResult.data) {
      const wantsSummaryDoc = query.includes('summarize') && (query.includes('create') || query.includes('save'));
      return wantsSummaryDoc;
    }
    
    return false;
  }
  
  /**
   * Perform tool chaining - automatically use a second tool based on first tool's results
   */
  private async performToolChaining(
    firstSelection: AIToolSelection, 
    firstResult: any, 
    userId: string, 
    context: UserContext
  ): Promise<any> {
    try {
      
      const query = context.query.toLowerCase();
      
      // 1. Enhanced SearchWeb -> Multi-CrawlPage chaining
      if (firstSelection.tool === 'searchWeb' && firstResult.data.results) {
        
        const crawlTool = this.toolRegistry.getTool('crawlPage');
        if (crawlTool) {
          const results = firstResult.data.results;
          const crawledContent: any[] = [];
          
          // Determine how many sites to crawl based on query complexity
          const isComprehensiveQuery = query.includes('comprehensive') || 
                                      query.includes('detailed') || 
                                      query.includes('research') ||
                                      query.includes('compare') ||
                                      Boolean(context.preferences?.isVoiceQuery);
          
          const maxSitesToCrawl = isComprehensiveQuery ? 
            Math.min(results.length, 5) :  // Crawl up to 5 sites for comprehensive queries
            Math.min(results.length, 3);   // Crawl up to 3 sites for regular queries
          
          
          // Crawl multiple sites concurrently for speed
          const crawlPromises = results.slice(0, maxSitesToCrawl).map(async (result: any, index: number) => {
            if (!result.url) return null;
            
            try {
              const crawlResult = await crawlTool.execute(userId, {
                url: result.url,
                extract_content: true,
                max_length: 2000 // Slightly smaller per site to fit more content
              });

              if (crawlResult.success) {
                return {
                  search_result: result,
                  content: crawlResult.data,
                  crawl_index: index + 1
                };
              }
              return null;
            } catch (error) {
              console.warn(`⚠️ Failed to crawl ${result.url}:`, error);
              return null;
            }
          });

          // Wait for all crawls to complete (with timeout)
          const crawlResults = await Promise.allSettled(crawlPromises);
          
          crawlResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              crawledContent.push(result.value);
            }
          });


          if (crawledContent.length > 0) {
            return {
              success: true,
              data: {
                search_results: firstResult.data,
                crawled_sites: crawledContent,
                total_sites_crawled: crawledContent.length,
                chained_tools: ['searchWeb', 'crawlPage'],
                auto_crawled: true,
                comprehensive_data: true
              }
            };
          }
        }
      }
      
      // 2. Data Retrieval -> Document Creation chaining
      const dataRetrievalTools = ['getEmails', 'getLastTenMails', 'getTodaysEvents', 'searchGoogleDrive', 'getGoogleDriveFile'];
      if (dataRetrievalTools.includes(firstSelection.tool || '') && firstResult.data) {
        
        // Generate content based on the retrieved data
        let content = '';
        let title = '';
        
        if (firstSelection.tool?.includes('Email')) {
          const emails = firstResult.data.emails || [];
          title = `Email Summary - ${new Date().toLocaleDateString()}`;
          content = `# Email Summary - ${new Date().toLocaleDateString()}\n\n`;
          content += `**Total Emails:** ${emails.length}\n\n`;
          
          emails.forEach((email: any, index: number) => {
            content += `## ${index + 1}. ${email.subject || 'No Subject'}\n`;
            content += `**From:** ${email.sender || 'Unknown'}\n`;
            content += `**Date:** ${email.date || 'Unknown'}\n`;
            content += `**Summary:** ${email.snippet || email.content?.substring(0, 200) || 'No content'}...\n\n`;
          });
        } else if (firstSelection.tool === 'getTodaysEvents') {
          const events = firstResult.data.events || [];
          title = `Calendar Summary - ${new Date().toLocaleDateString()}`;
          content = `# Calendar Summary - ${new Date().toLocaleDateString()}\n\n`;
          content += `**Total Events:** ${events.length}\n\n`;
          
          events.forEach((event: any, index: number) => {
            content += `## ${index + 1}. ${event.summary || 'No Title'}\n`;
            content += `**Time:** ${event.start?.dateTime || event.start?.date || 'Unknown'}\n`;
            if (event.description) content += `**Description:** ${event.description}\n`;
            content += `\n`;
          });
        } else if (firstSelection.tool?.includes('Drive')) {
          const files = firstResult.data.files || [firstResult.data];
          title = `Drive Files Summary - ${new Date().toLocaleDateString()}`;
          content = `# Google Drive Files Summary\n\n`;
          
          files.forEach((file: any, index: number) => {
            content += `## ${index + 1}. ${file.name || file.title || 'Untitled'}\n`;
            content += `**Type:** ${file.mimeType || file.type || 'Unknown'}\n`;
            if (file.size) content += `**Size:** ${Math.round(file.size / 1024)} KB\n`;
            if (file.content) content += `**Content Preview:** ${file.content.substring(0, 300)}...\n`;
            content += `\n`;
          });
        }
        
        // Create the document
        const createDocTool = this.toolRegistry.getTool('createDocument');
        if (createDocTool && content) {
          const docResult = await createDocTool.execute(userId, {
            title,
            content,
            type: 'markdown',
            destination: 'google_drive' // Save to Drive by default
          });
          
          if (docResult.success) {
            return {
              success: true,
              data: {
                original_data: firstResult.data,
                created_document: docResult.data,
                chained_tools: [firstSelection.tool, 'createDocument']
              }
            };
          }
        }
      }
      
      // 3. Generated Content -> Save Document chaining  
      if (firstSelection.tool === 'generateContentWithAI' && firstResult.data) {
        
        const createDocTool = this.toolRegistry.getTool('createDocument');
        if (createDocTool) {
          const title = `Generated Content - ${new Date().toLocaleDateString()}`;
          const content = firstResult.data.content || firstResult.data.text || '';
          
          const docResult = await createDocTool.execute(userId, {
            title,
            content,
            type: 'markdown',
            destination: 'both' // Save both locally and to Drive
          });
          
          if (docResult.success) {
            return {
              success: true,
              data: {
                generated_content: firstResult.data,
                saved_document: docResult.data,
                chained_tools: ['generateContentWithAI', 'createDocument']
              }
            };
          }
        }
      }
      
      // 4. Document Processing -> Summary Document chaining
      if (firstSelection.tool === 'processDocument' && firstResult.data) {
        
        const createDocTool = this.toolRegistry.getTool('createDocument');
        if (createDocTool && firstResult.data.summary) {
          const title = `Document Summary - ${new Date().toLocaleDateString()}`;
          const content = `# Document Summary\n\n**Original:** ${firstResult.data.fileName || 'Unknown'}\n\n**Summary:**\n${firstResult.data.summary}\n\n**Key Points:**\n${firstResult.data.keyPoints?.map((point: string) => `- ${point}`).join('\n') || 'None extracted'}`;
          
          const docResult = await createDocTool.execute(userId, {
            title,
            content,
            type: 'markdown',
            destination: 'both'
          });
          
          if (docResult.success) {
            return {
              success: true,
              data: {
                processed_document: firstResult.data,
                summary_document: docResult.data,
                chained_tools: ['processDocument', 'createDocument']
              }
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error in tool chaining:', error);
      return null;
    }
  }

  /**
   * Format available tools for the AI prompt
   */
  private formatToolsForPrompt(tools: AIToolMetadata[]): string {
    return tools.map(tool => `
Tool: ${tool.name}
Description: ${tool.description}
Category: ${tool.category}
Parameters: ${tool.parameters.map(p => `${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`).join(', ')}
Examples: ${tool.examples.map(e => `"${e.query}"`).join(', ')}
`).join('\n');
  }

  /**
   * Analyze task complexity for continuous AI controller
   */
  async analyzeTaskComplexity(query: string): Promise<{ complexity: 'simple' | 'moderate' | 'complex', reasoning: string }> {
    try {
      // Simple heuristic-based analysis
      const lowerQuery = query.toLowerCase();
      
      // Complex indicators
      const complexIndicators = [
        'analyze', 'research', 'compare', 'create document', 'generate report',
        'comprehensive', 'detailed analysis', 'multi-step', 'complex', 'strategy'
      ];
      
      // Simple indicators  
      const simpleIndicators = [
        'what is', 'tell me', 'show me', 'list', 'find', 'get', 'check'
      ];
      
      const complexCount = complexIndicators.filter(indicator => lowerQuery.includes(indicator)).length;
      const simpleCount = simpleIndicators.filter(indicator => lowerQuery.includes(indicator)).length;
      
      if (complexCount >= 2 || lowerQuery.length > 100) {
        return {
          complexity: 'complex',
          reasoning: 'Query contains multiple complex indicators or is very detailed'
        };
      } else if (complexCount > 0 || (lowerQuery.length > 50 && simpleCount === 0)) {
        return {
          complexity: 'moderate',
          reasoning: 'Query contains some complex elements or moderate detail'
        };
      } else {
        return {
          complexity: 'simple',
          reasoning: 'Query is straightforward and direct'
        };
      }
    } catch (error) {
      console.error('Error analyzing task complexity:', error);
      return {
        complexity: 'moderate',
        reasoning: 'Error in analysis, defaulting to moderate complexity'
      };
    }
  }

  /**
   * Detect if the user's query intends to open an app or perform a device action
   */
  private async detectDeeplinkIntent(query: string): Promise<{
    isDeepLinkIntent: boolean;
    confidence: number;
    reasoning: string;
    response: string;
    action?: DeeplinkAction;
  }> {
    try {
      const availableActions = [
        { name: 'Amazon Search', description: 'Search for products on Amazon', appName: 'amazon' },
        { name: 'Spotify Play', description: 'Play music on Spotify', appName: 'spotify' },
        { name: 'YouTube Search', description: 'Search for videos on YouTube', appName: 'youtube' },
        { name: 'Open Maps', description: 'Navigate to a location using maps', appName: 'maps' },
        { name: 'Twitter/X', description: 'Open Twitter/X app', appName: 'twitter' },
        { name: 'WhatsApp', description: 'Open WhatsApp or send messages', appName: 'whatsapp' },
        { name: 'Book Uber', description: 'Book a ride with Uber', appName: 'uber' },
      ];

      const systemPrompt = `You are an intent detection system that determines if a user wants to open an app or perform a device action.

Available App Actions:
${availableActions.map(action => `- ${action.name}: ${action.description}`).join('\n')}

Analyze the user's query and determine:
1. Is this a request to open an app or perform a device action? (true/false)
2. Confidence level (0.0 to 1.0) - be strict, only high confidence for clear app actions
3. Which action matches best (if any)
4. Extract relevant data (search terms, locations, etc.)

IMPORTANT GUIDELINES:
- Only return true for CLEAR app action requests (>0.7 confidence)
- Questions about apps, mentions without intent, or informational queries should be false
- "I love Spotify" = false (just mentioning, not requesting action)
- "Play music on Spotify" = true (clear action request)
- "Tell me about Amazon" = false (informational)
- "Search for shoes on Amazon" = true (clear action)

Respond ONLY with valid JSON:
{
  "isDeepLinkIntent": boolean,
  "confidence": number,
  "reasoning": "brief explanation",
  "response": "natural response message for user",
  "matchedAction": "action name or null",
  "extractedData": {
    "searchTerm": "string or null",
    "phoneNumber": "string or null",
    "location": "string or null",
    "destination": "string or null"
  }
}`;

      const response = await this.generateContent(`${systemPrompt}\n\nUser Query: "${query}"`);

      let result;
      try {
        result = JSON.parse(response);
      } catch (parseError) {
        console.error('❌ Failed to parse deeplink intent response:', parseError);
        return {
          isDeepLinkIntent: false,
          confidence: 0,
          reasoning: 'Failed to parse AI response',
          response: 'I can help you with various questions and tasks. What would you like to know?'
        };
      }

      // Validate response structure
      if (typeof result.isDeepLinkIntent !== 'boolean' || typeof result.confidence !== 'number') {
        return {
          isDeepLinkIntent: false,
          confidence: 0,
          reasoning: 'Invalid AI response format',
          response: 'I can help you with various questions and tasks. What would you like to know?'
        };
      }

      // Create deeplink action if detected
      let deeplinkAction: DeeplinkAction | undefined;
      if (result.isDeepLinkIntent && result.matchedAction && result.confidence >= 0.7) {
        const matchedApp = availableActions.find(action => action.name === result.matchedAction);
        if (matchedApp) {
          deeplinkAction = {
            type: 'app_open',
            appName: matchedApp.appName,
            action: result.matchedAction,
            data: {
              searchTerm: result.extractedData?.searchTerm || null,
              phoneNumber: result.extractedData?.phoneNumber || null,
              location: result.extractedData?.location || null,
              destination: result.extractedData?.destination || null,
            }
          };
        }
      }

      console.log('🔗 Deeplink intent detection:', {
        query: query.substring(0, 50),
        isDeepLinkIntent: result.isDeepLinkIntent,
        confidence: result.confidence,
        action: deeplinkAction?.action
      });

      return {
        isDeepLinkIntent: result.isDeepLinkIntent,
        confidence: Math.max(0, Math.min(1, result.confidence)),
        reasoning: result.reasoning || 'AI intent analysis',
        response: result.response || 'I can help you with that!',
        action: deeplinkAction
      };

    } catch (error) {
      console.error('❌ Error in deeplink intent detection:', error);
      return {
        isDeepLinkIntent: false,
        confidence: 0,
        reasoning: 'Error in intent detection',
        response: 'I can help you with various questions and tasks. What would you like to know?'
      };
    }
  }
}