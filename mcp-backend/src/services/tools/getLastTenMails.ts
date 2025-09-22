import { google } from 'googleapis';
import { MCPTool, MCPToolResponse, EmailMessage } from '../../types';
import { GoogleAuthService } from '../googleAuth';

export const getLastTenMailsToolDefinition: MCPTool = {
  name: 'getLastTenMails',
  description: 'Fetch the last 10 Gmail messages with subject and summary',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      console.log('hoi');
      const auth = await GoogleAuthService.getAuthenticatedClient(userId);
      console.log(auth)
      const gmail = google.gmail({ version: 'v1', auth });

      // Get list of messages
      const messagesResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: 'in:inbox',
      });

      const messages = messagesResponse.data.messages || [];
      console.log(messages,'messages form gmail');
      // Fetch details for each message
      const detailedMessages: EmailMessage[] = [];
      
      for (const message of messages) {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full',
          });

          const msg = messageResponse.data;
          const headers = msg.payload?.headers || [];
          
          // Extract headers
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
          const to = headers.find(h => h.name === 'To')?.value?.split(',').map(t => t.trim()) || [];
          const date = headers.find(h => h.name === 'Date')?.value || '';

          // Extract body content
          let body = '';
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
          
          // Create summary (first 150 characters)
          const summary = cleanBody.length > 150 
            ? cleanBody.substring(0, 150) + '...' 
            : cleanBody;

          const emailMessage: EmailMessage = {
            id: msg.id!,
            threadId: msg.threadId!,
            subject,
            from,
            to,
            date,
            snippet: msg.snippet || summary,
            body: summary,
            unread: msg.labelIds?.includes('UNREAD') || false,
          };

          detailedMessages.push(emailMessage);
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
          // Continue with other messages
        }
      }

      // Generate summary statistics
      const summary = {
        total: detailedMessages.length,
        unread: detailedMessages.filter(msg => msg.unread).length,
        senders: Array.from(new Set(detailedMessages.map(msg => {
          // Extract email from "Name <email>" format
          const match = msg.from.match(/<(.+)>/);
          return match ? match[1] : msg.from;
        }))).slice(0, 5), // Top 5 unique senders
        todayCount: detailedMessages.filter(msg => {
          const msgDate = new Date(msg.date);
          const today = new Date();
          return msgDate.toDateString() === today.toDateString();
        }).length,
      };

      return {
        success: true,
        data: {
          messages: detailedMessages,
          summary,
          fetchedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error fetching Gmail messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Gmail messages',
        timestamp: new Date().toISOString(),
      };
    }
  },
};