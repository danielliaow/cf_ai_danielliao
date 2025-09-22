import { google } from 'googleapis';
import { MCPTool, MCPToolResponse, EmailMessage } from '../../types';
import { GoogleAuthService } from '../googleAuth';

interface GetEmailsParams {
  maxResults?: number; // Default: 20, Max: 100
  query?: string; // Gmail search query (supports full Gmail search syntax)
  includeSpamTrash?: boolean; // Include spam and trash (default: false)
  labelIds?: string[]; // Specific labels to search in
  format?: 'full' | 'metadata' | 'minimal'; // Level of detail (default: 'full')
  includeBody?: boolean; // Whether to include email body content (default: true)
  dateRange?: {
    after?: string; // Date in YYYY/MM/DD format
    before?: string; // Date in YYYY/MM/DD format
  };
}

export const getEmailsToolDefinition: MCPTool = {
  name: 'getEmails',
  description: 'Comprehensive Gmail email retrieval with advanced search, filtering, and customizable parameters',
  
  async execute(userId: string, params: GetEmailsParams = {}): Promise<MCPToolResponse> {
    try {
      console.log('📧 Fetching Gmail messages with params:', params);
      
      // Extract and validate parameters
      const maxResults = Math.min(params.maxResults || 20, 100); // Default: 20, Max: 100
      const includeSpamTrash = params.includeSpamTrash || false;
      const format = params.format || 'full';
      const includeBody = params.includeBody !== false; // Default: true
      
      // Build search query
      let searchQuery = params.query || '';
      
      // Add date range to query if provided
      if (params.dateRange?.after) {
        searchQuery += ` after:${params.dateRange.after}`;
      }
      if (params.dateRange?.before) {
        searchQuery += ` before:${params.dateRange.before}`;
      }
      
      // Default to inbox if no specific query
      if (!searchQuery.trim() && !params.labelIds?.length) {
        searchQuery = 'in:inbox';
      }
      
      console.log(`🔍 Search query: "${searchQuery}", Max results: ${maxResults}, Format: ${format}`);
      
      const auth = await GoogleAuthService.getAuthenticatedClient(userId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Get list of messages with advanced search
      const listParams: any = {
        userId: 'me',
        maxResults,
        includeSpamTrash,
      };
      
      if (searchQuery.trim()) {
        listParams.q = searchQuery;
      }
      
      if (params.labelIds?.length) {
        listParams.labelIds = params.labelIds;
      }

      const messagesResponse = await gmail.users.messages.list(listParams);
      const messages = messagesResponse.data.messages || [];
      
      console.log(`📨 Found ${messages.length} messages matching criteria`);
      
      if (messages.length === 0) {
        return {
          success: true,
          data: {
            messages: [],
            summary: {
              total: 0,
              unread: 0,
              senders: [],
              subjects: [],
              todayCount: 0,
              thisWeekCount: 0,
            },
            searchQuery,
            maxResults,
            format,
            fetchedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Fetch details for each message based on format
      const detailedMessages: EmailMessage[] = [];
      // Optimize batch size based on format - smaller batches for full content
      const batchSize = format === 'full' && includeBody ? 5 : 15;
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (message) => {
            try {
              const messageResponse = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: format === 'minimal' ? 'metadata' : format,
              });

              const msg = messageResponse.data;
              const headers = msg.payload?.headers || [];
              
              // Extract headers
              const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
              const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
              const to = headers.find(h => h.name === 'To')?.value?.split(',').map(t => t.trim()) || [];
              const date = headers.find(h => h.name === 'Date')?.value || '';
              const cc = headers.find(h => h.name === 'Cc')?.value?.split(',').map(t => t.trim()) || [];
              const bcc = headers.find(h => h.name === 'Bcc')?.value?.split(',').map(t => t.trim()) || [];

              // Extract body content based on format and includeBody setting
              let body = '';
              let snippet = msg.snippet || '';
              
              if (includeBody && (format === 'full')) {
                if (msg.payload?.body?.data) {
                  body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
                } else if (msg.payload?.parts) {
                  // Handle multipart messages
                  const textPart = msg.payload.parts.find(part => 
                    part.mimeType === 'text/plain' || part.mimeType === 'text/html'
                  );
                  if (textPart?.body?.data) {
                    body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                  }
                }
                
                // Clean body content (remove HTML tags for plain text summary)
                const cleanBody = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                
                // Create summary (first 200 characters for full format)
                body = cleanBody.length > 200 
                  ? cleanBody.substring(0, 200) + '...' 
                  : cleanBody;
              }

              // Determine if email is unread
              const isUnread = msg.labelIds?.includes('UNREAD') || false;
              const isImportant = msg.labelIds?.includes('IMPORTANT') || false;
              const isStarred = msg.labelIds?.includes('STARRED') || false;
              
              // Extract attachments info
              const attachments: Array<{name: string, mimeType: string, size?: number}> = [];
              if (msg.payload?.parts) {
                msg.payload.parts.forEach(part => {
                  if (part.filename && part.filename.length > 0) {
                    attachments.push({
                      name: part.filename,
                      mimeType: part.mimeType || 'unknown',
                      size: part.body?.size || undefined
                    });
                  }
                });
              }

              const emailMessage: EmailMessage = {
                id: msg.id!,
                threadId: msg.threadId!,
                subject,
                from,
                to,
                cc: cc.length > 0 ? cc : undefined,
                bcc: bcc.length > 0 ? bcc : undefined,
                date,
                snippet: snippet || body.substring(0, 150),
                body: includeBody ? body : undefined,
                unread: isUnread,
                important: isImportant,
                starred: isStarred,
                labels: msg.labelIds || [],
                attachments: attachments.length > 0 ? attachments : undefined,
                sizeEstimate: msg.sizeEstimate || undefined,
              };

              detailedMessages.push(emailMessage);
            } catch (error) {
              console.error(`❌ Error fetching message ${message.id}:`, error);
              // Continue with other messages
            }
          })
        );
      }

      // Sort by date (newest first)
      detailedMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Generate comprehensive summary statistics
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const summary = {
        total: detailedMessages.length,
        unread: detailedMessages.filter(msg => msg.unread).length,
        important: detailedMessages.filter(msg => msg.important).length,
        starred: detailedMessages.filter(msg => msg.starred).length,
        withAttachments: detailedMessages.filter(msg => msg.attachments && msg.attachments.length > 0).length,
        senders: Array.from(new Set(detailedMessages.map(msg => {
          // Extract email from "Name <email>" format
          const match = msg.from.match(/<(.+)>/);
          return match ? match[1] : msg.from;
        }))).slice(0, 10), // Top 10 unique senders
        subjects: detailedMessages.slice(0, 5).map(msg => msg.subject), // Top 5 subjects
        todayCount: detailedMessages.filter(msg => {
          const msgDate = new Date(msg.date);
          return msgDate >= todayStart;
        }).length,
        thisWeekCount: detailedMessages.filter(msg => {
          const msgDate = new Date(msg.date);
          return msgDate >= weekStart;
        }).length,
        labelCounts: detailedMessages.reduce((acc, msg) => {
          msg.labels?.forEach(label => {
            acc[label] = (acc[label] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
      };

      return {
        success: true,
        data: {
          messages: detailedMessages,
          summary,
          searchQuery,
          maxResults,
          actualResults: detailedMessages.length,
          format,
          includeBody,
          fetchedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error fetching Gmail messages:', error);
      
      let errorMessage = 'Failed to fetch Gmail messages';
      if (error instanceof Error) {
        if (error.message.includes('insufficient authentication scopes')) {
          errorMessage = 'Gmail access permission denied. Please reconnect your Google account with email permissions.';
        } else if (error.message.includes('quota exceeded')) {
          errorMessage = 'Gmail API quota exceeded. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  },
};