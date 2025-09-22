import { ChatMessage, AVAILABLE_COMMANDS } from '../types/chat';
import { MCPService } from './mcpService';
import { MCPTestService } from './mcpTest';
import { TokenDebugger } from './debugTokens';
import { AIService } from './aiService';
import { StreamingService, StreamingCallbacks } from './streamingService';
import { DeepLinkingService } from './deepLinkingService';
import { UserProfileService } from './userProfileService';
import { PreferencesDebugger } from './preferencesDebugger';
import { NameDebugger } from './nameDebugger';

export class ChatService {
  private static responseCache = new Map<string, any>();
  private static cacheTimeout = 2 * 60 * 1000; // 2 minutes for chat cache
  
  static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2);
  }
  
  static getCachedResponse(query: string): any | null {
    const cached = this.responseCache.get(query.toLowerCase().trim());
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.response;
    }
    return null;
  }
  
  static setCachedResponse(query: string, response: any): void {
    this.responseCache.set(query.toLowerCase().trim(), {
      response,
      timestamp: Date.now()
    });
    
    // Clean cache periodically
    if (this.responseCache.size > 50) {
      this.cleanCache();
    }
  }
  
  static cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Process message with streaming
   */
  static async processMessageWithStreaming(
    userMessage: string, 
    callbacks: StreamingCallbacks,
    sessionId?: string
  ): Promise<void> {
    console.log('🌊 Starting streaming for:', userMessage);
    
    // Check cache for repeated queries first (excluding commands)
    if (!userMessage.startsWith('/')) {
      const cachedResponse = this.getCachedResponse(userMessage);
      if (cachedResponse) {
        console.log('📋 Using cached response for streaming query:', userMessage);
        // Simulate streaming for cached responses
        callbacks.onStart?.({ query: userMessage, cached: true });
        
        // Find the main assistant response
        const assistantResponse = cachedResponse.find((r: any) => r.type === 'assistant');
        if (assistantResponse) {
          callbacks.onResponseChunk?.({ 
            chunk: assistantResponse.content, 
            isComplete: true 
          });
        }
        
        callbacks.onComplete?.({ 
          success: true, 
          cached: true,
          responses: cachedResponse,
          toolUsed: assistantResponse?.metadata?.toolName,
          rawData: assistantResponse?.metadata?.toolData,
          reasoning: assistantResponse?.metadata?.reasoning
        });
        return;
      }
    }

    // For now, fall back to regular processing for ALL queries to fix the issue
    // TODO: Re-enable streaming once debugging is complete
    console.log('🔄 Using fallback processing for:', userMessage);
    
    callbacks.onStart?.({ query: userMessage, fallback: true });
    
    try {
      const responses = await this.processMessage(userMessage, sessionId);
      console.log('✅ Got responses:', responses.length);
      
      if (responses.length > 0) {
        // Send the main assistant response as streaming chunks
        const assistantResponse = responses.find(r => r.type === 'assistant');
        if (assistantResponse) {
          // Simulate streaming by sending the complete response
          callbacks.onResponseChunk?.({ 
            chunk: assistantResponse.content, 
            isComplete: true 
          });
        }
        
        callbacks.onComplete?.({ 
          success: true, 
          responses,
          toolUsed: assistantResponse?.metadata?.toolName,
          rawData: assistantResponse?.metadata?.toolData,
          reasoning: assistantResponse?.metadata?.reasoning
        });
      } else {
        callbacks.onError?.('No response generated');
      }
      
    } catch (error) {
      console.error('❌ Fallback processing error:', error);
      callbacks.onError?.(error instanceof Error ? error.message : 'Processing failed');
    }
  }

  static createMessage(
    type: ChatMessage['type'], 
    content: string, 
    metadata?: ChatMessage['metadata']
  ): ChatMessage {
    return {
      id: this.generateId(),
      type,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  static async processMessage(userMessage: string, sessionId?: string): Promise<ChatMessage[]> {
    // Check cache for repeated queries first (excluding commands)
    if (!userMessage.startsWith('/')) {
      const cachedResponse = this.getCachedResponse(userMessage);
      if (cachedResponse) {
        console.log('📋 Using cached response for query:', userMessage);
        return cachedResponse;
      }
    }
    
    const responses: ChatMessage[] = [];
    
    // Check if it's a command
   
    if (userMessage.startsWith('/')) {
      const command = userMessage.trim().toLowerCase();
      
      switch (command) {
        case '/help':
          responses.push(this.createMessage('assistant', await this.getHelpMessage()));
          break;
          
        case '/calendar':
          responses.push(this.createMessage('system', 'Fetching your calendar events...', { loading: true }));
          const calendarResult = await MCPService.getTodaysEvents();
          responses.push(this.processCalendarResponse(calendarResult));
          break;
          
        case '/emails':
          responses.push(this.createMessage('system', 'Fetching your latest emails...', { loading: true }));
          const emailResult = await MCPService.getEmails();
          responses.push(this.processEmailResponse(emailResult));
          break;
          
        case '/status':
          responses.push(this.createMessage('system', 'Checking backend status...', { loading: true }));
          const statusResult = await MCPService.getAuthStatus();
          responses.push(this.processStatusResponse(statusResult));
          break;
          
        case '/test':
          responses.push(this.createMessage('system', 'Testing MCP backend connection...', { loading: true }));
          const testResult = await MCPTestService.testConnection();
          responses.push(this.createMessage(
            'assistant',
            `🔍 **Connection Test**\n\n${testResult.success ? '✅' : '❌'} ${testResult.message}`,
            { 
              error: !testResult.success,
              toolName: 'connectionTest',
              toolData: testResult.details
            }
          ));
          break;
          
        case '/debug':
          responses.push(this.createMessage('system', 'Running token debug...', { loading: true }));
          const debugResult = await TokenDebugger.testBackendAuth();
          responses.push(this.createMessage(
            'assistant',
            `🔧 **Token Debug**\n\n${debugResult.success ? '✅' : '❌'} ${debugResult.message}\n\nCheck console for detailed logs.`,
            { 
              error: !debugResult.success,
              toolName: 'tokenDebug',
              toolData: debugResult.details
            }
          ));
          break;
          
        case '/debug-preferences':
          responses.push(this.createMessage('system', 'Running preferences debug...', { loading: true }));
          try {
            console.log('🔍 Starting preferences debug...');
            await PreferencesDebugger.debugPreferencesFlow();
            
            const status = await PreferencesDebugger.quickStatus();
            
            let statusReport = '🔍 **Preferences Debug Report**\n\n';
            statusReport += `**Backend Preferences:** ${status.backendPreferences ? '✅ Found' : '❌ Missing'}\n`;
            statusReport += `**Local Profile:** ${status.localProfile ? '✅ Cached' : '❌ Empty'}\n`;
            statusReport += `**Onboarding:** ${status.onboardingCompleted ? '✅ Completed' : '❌ Incomplete'}\n`;
            statusReport += `**Personalized Greeting:** ${status.personalizedGreeting ? '✅ Working' : '❌ Not working'}\n\n`;
            
            if (!status.backendPreferences) {
              statusReport += '**Issues Found:**\n';
              statusReport += '• No preferences found in backend\n';
              statusReport += '• Please complete onboarding in Settings > Preferences\n\n';
            }
            
            statusReport += '**Next Steps:**\n';
            statusReport += '• Check browser console for detailed debug logs\n';
            statusReport += '• Try `/fix-preferences` to auto-repair common issues\n';
            statusReport += '• Use `/preferences hobbies` to test specific queries\n';
            
            responses.push(this.createMessage(
              'assistant',
              statusReport,
              { toolName: 'preferencesDebug', toolData: status }
            ));
          } catch (error) {
            responses.push(this.createMessage(
              'assistant',
              `❌ **Debug Failed:** ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck browser console for details.`,
              { error: true, toolName: 'preferencesDebug' }
            ));
          }
          break;
          
        case '/fix-preferences':
          responses.push(this.createMessage('system', 'Auto-fixing preference issues...', { loading: true }));
          try {
            await PreferencesDebugger.autoFix();
            const statusAfterFix = await PreferencesDebugger.quickStatus();
            
            let fixReport = '🔧 **Preferences Auto-Fix Complete**\n\n';
            fixReport += '**Status After Fix:**\n';
            fixReport += `• Backend Preferences: ${statusAfterFix.backendPreferences ? '✅' : '❌'}\n`;
            fixReport += `• Local Profile: ${statusAfterFix.localProfile ? '✅' : '❌'}\n`;
            fixReport += `• Personalization: ${statusAfterFix.personalizedGreeting ? '✅' : '❌'}\n\n`;
            
            if (statusAfterFix.backendPreferences && statusAfterFix.localProfile) {
              fixReport += '✅ **System Fixed!** Try asking "What are my hobbies?" now.';
            } else {
              fixReport += '⚠️ **Still Issues:** Please complete your preferences in Settings.';
            }
            
            responses.push(this.createMessage(
              'assistant',
              fixReport,
              { toolName: 'preferencesFix', toolData: statusAfterFix }
            ));
          } catch (error) {
            responses.push(this.createMessage(
              'assistant',
              `❌ **Auto-fix Failed:** ${error instanceof Error ? error.message : 'Unknown error'}`,
              { error: true, toolName: 'preferencesFix' }
            ));
          }
          break;
          
        case '/debug-name':
          responses.push(this.createMessage('system', 'Debugging name detection...', { loading: true }));
          try {
            console.log('🔍 Starting name debug...');
            await NameDebugger.debugNameDetection();
            
            const nameStatus = await NameDebugger.getNameStatus();
            
            let report = '🔍 **Name Detection Debug Report**\n\n';
            report += `**Backend Name:** ${nameStatus.backendName ? `✅ "${nameStatus.backendName}"` : '❌ Not found'}\n`;
            report += `**Local Profile Name:** ${nameStatus.localName ? `✅ "${nameStatus.localName}"` : '❌ Not found'}\n`;
            report += `**Greeting Uses Name:** ${nameStatus.greetingHasName ? '✅ Yes' : '❌ No'}\n`;
            report += `**Name Query Works:** ${nameStatus.nameQueryWorks ? '✅ Yes' : '❌ No'}\n\n`;
            
            if (!nameStatus.backendName && !nameStatus.localName) {
              report += '**Issue Found:** No name in profile\n';
              report += '**Solution:** Please set your name in Settings > Preferences\n\n';
            } else if (nameStatus.backendName && !nameStatus.greetingHasName) {
              report += '**Issue Found:** Name exists but not used in responses\n';
              report += '**Solution:** Check response generation logic\n\n';
            } else if (nameStatus.localName) {
              report += '**Status:** Name setup looks good! ✅\n\n';
            }
            
            report += '**Next Steps:**\n';
            report += '• Check browser console for detailed logs\n';
            report += '• Try `/test-name YourName` to test with a sample name\n';
            report += '• Use `/preferences` to see all your profile data\n';
            
            responses.push(this.createMessage(
              'assistant',
              report,
              { toolName: 'nameDebug', toolData: nameStatus }
            ));
          } catch (error) {
            responses.push(this.createMessage(
              'assistant',
              `❌ **Name Debug Failed:** ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck browser console for details.`,
              { error: true, toolName: 'nameDebug' }
            ));
          }
          break;
          
        case '/test-name':
          const testName = userMessage.slice(10).trim();
          if (!testName) {
            responses.push(this.createMessage('assistant', 'Please specify a name to test with. Example: /test-name Alex', { error: true }));
            break;
          }
          
          responses.push(this.createMessage('system', `Testing name setting with "${testName}"...`, { loading: true }));
          try {
            await NameDebugger.testNameSetting(testName);
            
            // Test the results
            const greeting = await UserProfileService.getPersonalizedGreeting();
            const nameQuery = await UserProfileService.handlePreferenceQuery('What is my name?');
            
            let testReport = `🧪 **Name Test Results for "${testName}"**\n\n`;
            testReport += `**Updated Greeting:**\n"${greeting}"\n\n`;
            testReport += `**Name Query Response:**\n"${nameQuery}"\n\n`;
            
            if (greeting.includes(testName)) {
              testReport += '✅ **Success!** Name is now being used in greetings.\n';
            } else {
              testReport += '❌ **Issue:** Name not appearing in greetings.\n';
            }
            
            if (nameQuery && nameQuery.includes(testName)) {
              testReport += '✅ **Success!** Name queries are working.\n';
            } else {
              testReport += '❌ **Issue:** Name queries not working properly.\n';
            }
            
            responses.push(this.createMessage(
              'assistant',
              testReport,
              { toolName: 'nameTest', toolData: { testName, greeting, nameQuery } }
            ));
          } catch (error) {
            responses.push(this.createMessage(
              'assistant',
              `❌ **Name Test Failed:** ${error instanceof Error ? error.message : 'Unknown error'}`,
              { error: true, toolName: 'nameTest' }
            ));
          }
          break;
          
        case '/connect':
          responses.push(this.createMessage('system', 'Checking Google Workspace connection...', { loading: true }));
          const connectStatusResult = await MCPService.getAuthStatus();
          console.log(connectStatusResult,'meoww')
          
          if (connectStatusResult.success && connectStatusResult.data.googleWorkspace.connected) {
            responses.push(this.createMessage(
              'assistant',
              `🔗 **Google Workspace Connection**\n\n✅ Already connected and ready!\n\nYou can use \`/calendar\`, \`/emails\`, and \`/drive-search\` commands.`,
              { toolName: 'googleConnect' }
            ));
          } else {
            responses.push(this.createMessage(
              'assistant',
              `🔗 **Google Workspace Connection**\n\n❌ Not connected\n\nTo connect:\n1. Sign out of the app\n2. Sign in again with Google\n3. Try \`/connect\` again\n\nThe Google tokens should be automatically saved during sign-in.`,
              { error: true, toolName: 'googleConnect' }
            ));
          }
          break;

        default:
          // Check for parameterized commands
          if (command.startsWith('/files')) {
            const params = userMessage.slice(6).trim();
            const dirPath = params || 'Documents';
            responses.push(this.createMessage('system', `Listing files in ${dirPath}...`, { loading: true }));
            const fileResult = await this.handleFileCommand('listDirectory', { dirPath, includeDetails: true });
            responses.push(fileResult);
            break;
          }
          
          if (command.startsWith('/read')) {
            const filePath = userMessage.slice(5).trim();
            if (!filePath) {
              responses.push(this.createMessage('assistant', 'Please specify a file path. Example: /read Documents/myfile.txt', { error: true }));
              break;
            }
            responses.push(this.createMessage('system', `Reading file: ${filePath}...`, { loading: true }));
            const readResult = await this.handleFileCommand('readFile', { filePath });
            responses.push(readResult);
            break;
          }
          
          if (command.startsWith('/drive-search')) {
            const query = userMessage.slice(13).trim();
            if (!query) {
              responses.push(this.createMessage('assistant', 'Please specify search terms. Example: /drive-search project reports', { error: true }));
              break;
            }
            responses.push(this.createMessage('system', `Searching Google Drive for: ${query}...`, { loading: true }));
            const searchResult = await this.handleDriveCommand('searchGoogleDrive', { query, maxResults: 10, includeContent: false });
            responses.push(searchResult);
            break;
          }
          
          if (command.startsWith('/drive-get')) {
            const fileId = userMessage.slice(10).trim();
            if (!fileId) {
              responses.push(this.createMessage('assistant', 'Please specify a Google Drive file ID. Example: /drive-get 1ABC...XYZ', { error: true }));
              break;
            }
            responses.push(this.createMessage('system', `Getting Google Drive file...`, { loading: true }));
            const getResult = await this.handleDriveCommand('getGoogleDriveFile', { fileId, includeMetadata: true });
            responses.push(getResult);
            break;
          }
          
          if (command.startsWith('/analyze')) {
            const filePath = userMessage.slice(8).trim();
            if (!filePath) {
              responses.push(this.createMessage('assistant', 'Please specify a file path. Example: /analyze Documents/report.pdf', { error: true }));
              break;
            }
            responses.push(this.createMessage('system', `Analyzing document: ${filePath}...`, { loading: true }));
            const analyzeResult = await this.handleDocumentCommand('processDocument', {
              input: { type: 'file_path', value: filePath },
              operations: ['extract_text', 'summarize', 'extract_keywords', 'analyze_sentiment']
            });
            responses.push(analyzeResult);
            break;
          }
          
          if (command.startsWith('/create-doc')) {
            const params = userMessage.slice(11).trim().split(' ');
            const title = params[0]?.replace(/"/g, '') || 'Untitled Document';
            const style = params[1] || 'formal';
            responses.push(this.createMessage('system', `Creating document: ${title}...`, { loading: true }));
            const createResult = await this.handleDocumentCommand('createDocument', {
              type: 'text',
              title,
              destination: { type: 'local_file', path: 'Documents' },
              aiGeneration: {
                enabled: true,
                prompt: `Create a ${title}`,
                style
              }
            });
            responses.push(createResult);
            break;
          }
          
          if (command.startsWith('/preferences') || command.startsWith('/profile')) {
            // Handle preference queries
            const query = userMessage.slice(command.indexOf(' ') + 1).trim() || 'show my preferences';
            responses.push(this.createMessage('system', 'Retrieving your preferences...', { loading: true }));
            const preferenceResponse = await UserProfileService.handlePreferenceQuery(query);
            
            if (preferenceResponse) {
              responses.push(this.createMessage(
                'assistant',
                preferenceResponse,
                { toolName: 'userProfile' }
              ));
            } else {
              responses.push(this.createMessage(
                'assistant',
                'I can help you with your preferences! Try asking:\n• "What are my hobbies?"\n• "What is my profession?"\n• "Show my communication style"\n• "What are my interests?"',
                { toolName: 'userProfile' }
              ));
            }
            break;
          }
          
          if (command.startsWith('/generate')) {
            const prompt = userMessage.slice(9).trim().replace(/"/g, '');
            if (!prompt) {
              responses.push(this.createMessage('assistant', 'Please specify what to generate. Example: /generate "Blog post about AI trends"', { error: true }));
              break;
            }
            responses.push(this.createMessage('system', `Generating content...`, { loading: true }));
            const generateResult = await this.handleDocumentCommand('generateContentWithAI', {
              prompt,
              contentType: 'article',
              style: 'formal',
              length: 'medium'
            });
            responses.push(generateResult);
            break;
          }
          responses.push(this.createMessage(
            'assistant', 
            `Unknown command: ${command}. Type /help to see available commands.`,
            { error: true }
          ));
      }
    } else {
      // Handle regular chat messages - Check for deep linking first
      console.log('🤖 Processing natural language query:', userMessage);
      // responses.push(this.createMessage('system', 'Processing your request...', { loading: true }));
      
      try {
        // Check if this is a deep link query first
        console.log('🔗 Checking for deep link actions...');
        // Process query with backend AI (which will handle deeplink detection)
        // Check if AI is available for regular processing
        console.log('🔍 Checking AI availability...');
        const aiAvailable = await AIService.checkAIAvailability();
        console.log('🔍 AI Available:', aiAvailable);

        if (aiAvailable) {
          // Use AI to process natural language query
          console.log('🧠 Sending query to AI service...');
          // Get user preferences for response style
          const communicationStyle = await UserProfileService.getCommunicationStyle();
          const responseStyle = communicationStyle?.response_length === 'short' ? 'brief' :
                              communicationStyle?.response_length === 'long' ? 'detailed' : 'conversational';

          const aiResponse = await AIService.processQuery({
            query: userMessage,
            sessionId,
            preferences: {
              responseStyle,
              includeActions: true
            }
          });

          console.log('🧠 AI Response:', aiResponse);

          if (aiResponse.success && aiResponse.data) {
            // Check if AI detected a deeplink action
            if (aiResponse.data.deeplinkAction) {
              console.log('🔗 AI detected deeplink action:', aiResponse.data.deeplinkAction);

              // Execute the deeplink action
              const deeplinkResult = await this.executeDeeplinkAction(aiResponse.data.deeplinkAction);

              if (deeplinkResult.success) {
                responses.push(this.createMessage(
                  'assistant',
                  `🔗 **App Action**\n\n${aiResponse.data.response}\n\n✅ Opened ${aiResponse.data.deeplinkAction.action}`,
                  {
                    toolName: 'aiDeeplink',
                    toolData: {
                      deeplinkAction: aiResponse.data.deeplinkAction,
                      executionResult: deeplinkResult
                    }
                  }
                ));
              } else {
                responses.push(this.createMessage(
                  'assistant',
                  `🔗 **App Action**\n\n${aiResponse.data.response}\n\n❌ ${deeplinkResult.message}`,
                  {
                    error: true,
                    toolName: 'aiDeeplink',
                    toolData: {
                      deeplinkAction: aiResponse.data.deeplinkAction,
                      executionResult: deeplinkResult
                    }
                  }
                ));
              }
            } else {
              // Regular AI response without deeplink
              responses.push(this.createMessage(
                'assistant',
                aiResponse.data.response,
                {
                  toolName: aiResponse.data.toolUsed,
                  toolData: aiResponse.data.rawData
                }
              ));
              
              // Add suggested actions if available
              if (aiResponse.data.suggestedActions && aiResponse.data.suggestedActions.length > 0) {
                responses.push(this.createMessage(
                  'system',
                  `💡 **Suggestions:**\n${aiResponse.data.suggestedActions.map(action => `• ${action}`).join('\n')}`,
                  { toolName: 'suggestions' }
                ));
              }
            }
          } else {
              // AI failed, fall back to simple response
              console.log('❌ AI query failed:', aiResponse.error);
              responses.push(this.createMessage(
                'assistant',
                `Request failed please try again`
              ));
            }
        } else {
          // AI not available, use fallback
          responses.push(this.createMessage(
            'assistant',
            `Request failed please try again`
          ));
        }
      } catch (error) {
        console.error('❌ AI processing error:', error);
        console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
        // Fall back to simple response on error
        responses.push(this.createMessage(
          'assistant',
          `I received your message: "${userMessage}". I can help you with your calendar and emails using commands like /calendar or /emails. Type /help for more options.`
        ));
      }
    }
    
    // Cache non-command responses
    if (!userMessage.startsWith('/') && responses.length > 0) {
      this.setCachedResponse(userMessage, responses);
    }
    
    return responses;
  }

  private static async getHelpMessage(): Promise<string> {
    // Get user's name for personalization
    const personalInfo = await UserProfileService.getPersonalInfo();
    const greeting = personalInfo?.name ? `Hi ${personalInfo.name}!` : 'Hello!';
    
    let helpText = `${greeting} 🤖 **Available Commands:**\n\n`;
    
    AVAILABLE_COMMANDS.forEach(cmd => {
      helpText += `**${cmd.command}** - ${cmd.description}\n`;
      helpText += `Example: \`${cmd.example}\`\n\n`;
    });
    
    // Add new personalization commands
    helpText += "👤 **Personal Commands:**\n";
    helpText += "• `/preferences` or `/profile` - View or ask about your personal preferences\n";
    helpText += "• `/preferences hobbies` - See your hobbies\n";
    helpText += "• `/profile profession` - Check your work info\n";
    helpText += "• `/debug-preferences` - Debug personalization system issues\n";
    helpText += "• `/fix-preferences` - Auto-fix common preference problems\n";
    helpText += "• `/debug-name` - Debug name detection specifically\n";
    helpText += "• `/test-name YourName` - Test name setting with a sample name\n\n";
    
    helpText += "🤖 **Natural Language Queries:**\n";
    helpText += "You can ask me anything naturally! Try:\n\n";
    helpText += "**📅 Calendar & Email:**\n";
    helpText += "• \"What meetings do I have today?\"\n";
    helpText += "• \"Check my latest emails\"\n";
    helpText += "• \"Any urgent messages?\"\n\n";
    helpText += "**👤 About You:**\n";
    helpText += "• \"What are my hobbies?\"\n";
    helpText += "• \"What is my profession?\"\n";
    helpText += "• \"What technologies do I use?\"\n";
    helpText += "• \"How do I like to communicate?\"\n";
    helpText += "• \"What is my work style?\"\n";
    helpText += "• \"Show me all my preferences\"\n\n";
    
    helpText += "💡 **Tips:**\n";
    helpText += "• Commands start with `/`\n";
    helpText += "• Natural language works without `/`\n";
    helpText += "• I remember your preferences and adapt my responses\n";
    helpText += "• Make sure your Google Workspace is connected\n";
    helpText += "• Check /status if commands aren't working\n";
    
    return helpText;
  }

  private static processCalendarResponse(result: any): ChatMessage {
    if (!result.success) {
      return this.createMessage(
        'assistant',
        `❌ **Calendar Error:** ${result.error}\n\nMake sure your Google Calendar is connected and try again.`,
        { error: true, toolName: 'getTodaysEvents' }
      );
    }

    const { events, summary, date } = result.data;
    
    if (events.length === 0) {
      return this.createMessage(
        'assistant',
        `📅 **No events today** (${date})\n\nYour calendar is clear for today!`,
        { toolName: 'getTodaysEvents', toolData: result.data }
      );
    }

    let response = `📅 **Today's Calendar** (${date})\n\n`;
    response += `**Summary:** ${summary.total} events, ${summary.upcoming} upcoming\n\n`;
    
    events.slice(0, 5).forEach((event: any) => {
      const startTime = event.start.dateTime 
        ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'All day';
      
      response += `🕐 **${startTime}** - ${event.summary}\n`;
      if (event.location) response += `📍 ${event.location}\n`;
      if (event.description) response += `📝 ${event.description.substring(0, 100)}...\n`;
      response += '\n';
    });

    if (events.length > 5) {
      response += `... and ${events.length - 5} more events`;
    }

    return this.createMessage(
      'assistant',
      response,
      { toolName: 'getTodaysEvents', toolData: result.data }
    );
  }

  private static processEmailResponse(result: any): ChatMessage {
    if (!result.success) {
      return this.createMessage(
        'assistant',
        `❌ **Email Error:** ${result.error}\n\nMake sure your Gmail is connected and try again.`,
        { error: true, toolName: 'getEmails' }
      );
    }

    const { messages, summary } = result.data;
    
    if (messages.length === 0) {
      return this.createMessage(
        'assistant',
        `📧 **No recent emails found**\n\nYour inbox appears to be empty.`,
        { toolName: 'getEmails', toolData: result.data }
      );
    }

    let response = `📧 **Latest Emails**\n\n`;
    response += `**Summary:** ${summary.total} messages, ${summary.unread} unread`;
    if (summary.important > 0) response += `, ${summary.important} important`;
    if (summary.starred > 0) response += `, ${summary.starred} starred`;
    if (summary.withAttachments > 0) response += `, ${summary.withAttachments} with attachments`;
    response += '\n\n';
    
    messages.slice(0, 5).forEach((email: any) => {
      const date = new Date(email.date).toLocaleDateString();
      const unreadIcon = email.unread ? '🔵 ' : '';
      const importantIcon = email.important ? '⭐ ' : '';
      const starredIcon = email.starred ? '🌟 ' : '';
      const attachmentIcon = email.attachments && email.attachments.length > 0 ? '📎 ' : '';
      
      response += `${unreadIcon}${importantIcon}${starredIcon}${attachmentIcon}**${email.subject}**\n`;
      response += `👤 ${email.from}\n`;
      if (email.cc && email.cc.length > 0) {
        response += `CC: ${email.cc.slice(0, 2).join(', ')}${email.cc.length > 2 ? ` +${email.cc.length - 2} more` : ''}\n`;
      }
      response += `📅 ${date}\n`;
      response += `💬 ${email.snippet || email.body || 'No preview available'}\n`;
      if (email.attachments && email.attachments.length > 0) {
        response += `📎 ${email.attachments.length} attachment${email.attachments.length > 1 ? 's' : ''}\n`;
      }
      response += '\n';
    });

    if (messages.length > 5) {
      response += `... and ${messages.length - 5} more messages`;
    }

    return this.createMessage(
      'assistant',
      response,
      { toolName: 'getEmails', toolData: result.data }
    );
  }

  private static processStatusResponse(result: any): ChatMessage {
    if (!result.success) {
      return this.createMessage(
        'assistant',
        `❌ **Status Check Failed:** ${result.error}`,
        { error: true, toolName: 'status' }
      );
    }

    const { user, googleWorkspace } = result.data;
    
    let response = `🔍 **Backend Status**\n\n`;
    response += `✅ **Connected** to MCP Backend\n`;
    response += `👤 **User:** ${user.email}\n`;
    response += `🔗 **Google Workspace:** ${googleWorkspace.connected ? '✅ Connected' : '❌ Not Connected'}\n`;
    
    if (googleWorkspace.connected) {
      response += `📋 **Scopes:** ${googleWorkspace.scopes.join(', ')}\n`;
    } else {
      response += `\n⚠️ Connect your Google Workspace to use calendar and email commands.`;
    }

    return this.createMessage(
      'assistant',
      response,
      { toolName: 'status', toolData: result.data }
    );
  }

  // New handler methods for file and document operations
  private static async handleFileCommand(toolName: string, params: any): Promise<ChatMessage> {
    try {
      const result = await AIService.callMCPTool(toolName, params);
      
      if (!result.success) {
        return this.createMessage(
          'assistant',
          `❌ **File Operation Error:** ${result.error}`,
          { error: true, toolName, toolData: result }
        );
      }

      switch (toolName) {
        case 'readFile':
          return this.processFileReadResponse(result);
        case 'listDirectory':
          return this.processDirectoryListResponse(result);
        case 'writeFile':
          return this.processFileWriteResponse(result);
        default:
          return this.createMessage('assistant', JSON.stringify(result.data, null, 2), { toolName });
      }
    } catch (error) {
      return this.createMessage(
        'assistant',
        `❌ **File operation failed:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: true, toolName }
      );
    }
  }

  private static async handleDriveCommand(toolName: string, params: any): Promise<ChatMessage> {
    try {
      const result = await AIService.callMCPTool(toolName, params);
      
      if (!result.success) {
        return this.createMessage(
          'assistant',
          `❌ **Google Drive Error:** ${result.error}`,
          { error: true, toolName, toolData: result }
        );
      }

      switch (toolName) {
        case 'searchGoogleDrive':
          return this.processDriveSearchResponse(result);
        case 'getGoogleDriveFile':
          return this.processDriveFileResponse(result);
        case 'createGoogleDriveFile':
          return this.processDriveCreateResponse(result);
        default:
          return this.createMessage('assistant', JSON.stringify(result.data, null, 2), { toolName });
      }
    } catch (error) {
      return this.createMessage(
        'assistant',
        `❌ **Google Drive operation failed:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: true, toolName }
      );
    }
  }

  private static async handleDocumentCommand(toolName: string, params: any): Promise<ChatMessage> {
    try {
      const result = await AIService.callMCPTool(toolName, params);
      
      if (!result.success) {
        return this.createMessage(
          'assistant',
          `❌ **Document Error:** ${result.error}`,
          { error: true, toolName, toolData: result }
        );
      }

      switch (toolName) {
        case 'processDocument':
          return this.processDocumentAnalysisResponse(result);
        case 'createDocument':
          return this.processDocumentCreateResponse(result);
        case 'generateContentWithAI':
          return this.processContentGenerationResponse(result);
        default:
          return this.createMessage('assistant', JSON.stringify(result.data, null, 2), { toolName });
      }
    } catch (error) {
      return this.createMessage(
        'assistant',
        `❌ **Document operation failed:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: true, toolName }
      );
    }
  }

  // Response processors for new tools
  private static processFileReadResponse(result: any): ChatMessage {
    const { content, filePath, size, wordCount } = result.data;
    
    // Create a FileOperationResult for the card
    const fileResult = {
      success: true,
      data: {
        content,
        filePath,
        fileName: filePath.split('/').pop(),
        size,
        wordCount
      }
    };

    return this.createMessage(
      'file',
      `File successfully read: ${filePath}`,
      { 
        toolName: 'readFile', 
        toolData: fileResult,
        fileType: 'local',
        fileName: filePath.split('/').pop(),
        filePath,
        fileSize: size,
        wordCount
      }
    );
  }

  private static processDirectoryListResponse(result: any): ChatMessage {
    const { directory, items, totalCount } = result.data;
    
    let response = `📁 **Directory: ${directory}**\n\n`;
    response += `**Found ${totalCount} items:**\n\n`;

    items.slice(0, 20).forEach((item: any) => {
      const icon = item.type === 'directory' ? '📁' : '📄';
      const sizeInfo = item.size ? ` (${Math.round(item.size / 1024)}KB)` : '';
      response += `${icon} **${item.name}**${sizeInfo}\n`;
    });

    if (items.length > 20) {
      response += `\n... and ${items.length - 20} more items`;
    }

    return this.createMessage(
      'assistant',
      response,
      { toolName: 'listDirectory', toolData: result.data }
    );
  }

  private static processFileWriteResponse(result: any): ChatMessage {
    const { filePath, size, contentLength } = result.data;
    
    // Create a FileOperationResult for the card
    const fileResult = {
      success: true,
      data: {
        filePath,
        fileName: filePath.split('/').pop(),
        size,
        metadata: { contentLength }
      }
    };

    return this.createMessage(
      'file',
      `File successfully written: ${filePath}`,
      { 
        toolName: 'writeFile', 
        toolData: fileResult,
        fileType: 'local',
        fileName: filePath.split('/').pop(),
        filePath,
        fileSize: size
      }
    );
  }

  private static processDriveSearchResponse(result: any): ChatMessage {
    // Check if result has the expected structure
    if (!result?.data) {
      console.error('❌ Drive search result missing data field:', result);
      return this.createMessage(
        'assistant',
        '❌ **Google Drive Error:** Invalid response format',
        { 
          error: true, 
          toolName: 'searchGoogleDrive', 
          toolData: { success: false, error: 'Invalid response format' }
        }
      );
    }

    const { files, totalCount, query } = result.data;
    
    if (!Array.isArray(files)) {
      console.error('❌ Drive search result files is not an array:', files);
      return this.createMessage(
        'assistant',
        '❌ **Google Drive Error:** Invalid files data',
        { 
          error: true, 
          toolName: 'searchGoogleDrive', 
          toolData: { success: false, error: 'Invalid files data' }
        }
      );
    }
    
    // Create a DriveSearchResult for the card
    const driveResult = {
      success: true,
      data: {
        files,
        totalCount,
        query
      }
    };

    return this.createMessage(
      'assistant',
      `Found ${totalCount} files in Google Drive`,
      { 
        toolName: 'searchGoogleDrive', 
        toolData: driveResult,
        fileType: 'drive'
      }
    );
  }

  private static processDriveFileResponse(result: any): ChatMessage {
    const { id, name, content, contentType, wordCount, metadata } = result.data;
    
    let response = `☁️ **Google Drive File**\n\n`;
    response += `**Name:** ${name}\n`;
    response += `**Type:** ${contentType}\n`;
    if (wordCount) response += `**Words:** ${wordCount}\n`;
    if (metadata?.size) response += `**Size:** ${Math.round(metadata.size / 1024)}KB\n`;
    response += `\n**Content:**\n\`\`\`\n${content.slice(0, 1000)}${content.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\``;

    return this.createMessage(
      'assistant',
      response,
      { 
        toolName: 'getGoogleDriveFile', 
        toolData: result.data,
        fileType: 'drive',
        fileName: name,
        wordCount
      }
    );
  }

  private static processDriveCreateResponse(result: any): ChatMessage {
    const { id, name, webViewLink, wordCount, size } = result.data;
    
    let response = `✅ **Google Drive File Created**\n\n`;
    response += `**Name:** ${name}\n`;
    if (wordCount) response += `**Words:** ${wordCount}\n`;
    if (size) response += `**Size:** ${Math.round(size / 1024)}KB\n`;
    response += `🔗 [Open in Drive](${webViewLink})\n`;
    response += `🆔 ID: \`${id}\``;

    return this.createMessage(
      'assistant',
      response,
      { toolName: 'createGoogleDriveFile', toolData: result.data }
    );
  }

  private static processDocumentAnalysisResponse(result: any): ChatMessage {
    const { operations, statistics } = result.data;
    
    // Create a DocumentAnalysisResult for the card
    const documentResult = {
      success: true,
      data: {
        operations,
        statistics
      }
    };

    return this.createMessage(
      'document',
      'Document analysis completed',
      { 
        toolName: 'processDocument', 
        toolData: documentResult,
        operations: Object.keys(operations),
        wordCount: statistics?.wordCount,
        documentType: 'text'
      }
    );
  }

  private static processDocumentCreateResponse(result: any): ChatMessage {
    const { title, type, contentLength, wordCount, destination, statistics } = result.data;
    
    let response = `📄 **Document Created**\n\n`;
    response += `**Title:** ${title}\n`;
    response += `**Type:** ${type}\n`;
    response += `**Length:** ${contentLength} characters\n`;
    if (wordCount) response += `**Words:** ${wordCount}\n`;
    if (statistics?.estimatedReadingTime) {
      response += `**Reading time:** ${statistics.estimatedReadingTime} minutes\n`;
    }
    
    if (destination.type === 'local_file') {
      response += `**Saved to:** ${destination.path}\n`;
    } else if (destination.type === 'google_drive') {
      response += `**Uploaded to:** Google Drive\n`;
      if (destination.webViewLink) {
        response += `🔗 [Open in Drive](${destination.webViewLink})`;
      }
    }

    return this.createMessage(
      'assistant',
      response,
      { 
        toolName: 'createDocument', 
        toolData: result.data,
        documentType: type,
        wordCount
      }
    );
  }

  private static processContentGenerationResponse(result: any): ChatMessage {
    const { content, metadata } = result.data;
    
    let response = `✨ **Generated Content**\n\n`;
    if (metadata) {
      response += `**Type:** ${metadata.contentType}\n`;
      response += `**Style:** ${metadata.style}\n`;
      response += `**Words:** ${metadata.wordCount}\n`;
      if (metadata.estimatedReadingTime) {
        response += `**Reading time:** ${metadata.estimatedReadingTime}\n`;
      }
      if (metadata.keywords && metadata.keywords.length > 0) {
        response += `**Keywords:** ${metadata.keywords.join(', ')}\n`;
      }
      response += `\n`;
    }
    
    response += `**Content:**\n${content}`;

    return this.createMessage(
      'assistant',
      response,
      {
        toolName: 'generateContentWithAI',
        toolData: result.data,
        wordCount: metadata?.wordCount
      }
    );
  }

  /**
   * Execute a deeplink action received from the backend AI
   */
  private static async executeDeeplinkAction(action: any): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('🚀 Executing deeplink action:', action);

      // Map AI-detected actions to actual deeplink execution
      const appMapping: Record<string, string> = {
        'amazon': 'Amazon Search',
        'spotify': 'Spotify Play',
        'youtube': 'YouTube Search',
        'maps': 'Open Maps',
        'twitter': 'Open Twitter/X',
        'whatsapp': 'Open WhatsApp',
        'uber': 'Book Uber'
      };

      const mappedActionName = appMapping[action.appName];
      if (!mappedActionName) {
        return {
          success: false,
          message: `App "${action.appName}" not supported`
        };
      }

      // Build query string based on extracted data
      let queryString = action.appName;
      if (action.data?.searchTerm) {
        queryString = `${action.data.searchTerm} on ${action.appName}`;
      } else if (action.data?.location) {
        queryString = `navigate to ${action.data.location}`;
      } else if (action.data?.destination) {
        queryString = `uber to ${action.data.destination}`;
      }

      console.log('🎯 Mapped to deeplink query:', queryString);

      // Use the existing DeepLinkingService to execute the action
      const result = await DeepLinkingService.processDeepLinkQuery(queryString);

      return {
        success: result.success,
        message: result.message
      };

    } catch (error) {
      console.error('❌ Error executing deeplink action:', error);
      return {
        success: false,
        message: 'Failed to execute app action'
      };
    }
  }
}