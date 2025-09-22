import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { AIService } from './aiService';

export interface DocumentCreationRequest {
  title?: string;
  content: string;
  type?: 'text' | 'markdown' | 'html' | 'json';
  saveLocation?: 'local' | 'drive' | 'both';
  mimeType?: string;
}

export interface DocumentCreationResult {
  success: boolean;
  localPath?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  error?: string;
}

export class DocumentCreationService {
  /**
   * Create a document with the specified content and save it to the chosen location(s)
   */
  static async createDocument(request: DocumentCreationRequest): Promise<DocumentCreationResult> {
    try {
      // Apply defaults if not provided
      const processedRequest = {
        title: request.title || `Document_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_')}`,
        content: request.content || 'This document was created automatically.',
        type: request.type || 'text',
        saveLocation: request.saveLocation || 'both',
        mimeType: request.mimeType
      };

      console.log('📄 Creating document with defaults applied:', {
        title: processedRequest.title,
        type: processedRequest.type,
        saveLocation: processedRequest.saveLocation,
        contentLength: processedRequest.content.length
      });

      const result: DocumentCreationResult = { success: false };

      if (processedRequest.saveLocation === 'local' || processedRequest.saveLocation === 'both') {
        const localResult = await this.saveDocumentLocally(processedRequest);
        if (localResult.success) {
          result.localPath = localResult.path;
        } else {
          result.error = localResult.error;
          if (processedRequest.saveLocation === 'local') {
            return result;
          }
        }
      }

      if (processedRequest.saveLocation === 'drive' || processedRequest.saveLocation === 'both') {
        const driveResult = await this.saveDocumentToDrive(processedRequest);
        if (driveResult.success) {
          result.driveFileId = driveResult.fileId;
          result.driveWebViewLink = driveResult.webViewLink;
        } else {
          result.error = driveResult.error;
          if (processedRequest.saveLocation === 'drive') {
            return result;
          }
        }
      }

      result.success = !!(result.localPath || result.driveFileId);
      return result;
    } catch (error) {
      console.error('❌ Error creating document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate document content using AI
   */
  static async generateDocument(prompt: string, type: string = 'document', length: string = 'medium'): Promise<{ success: boolean; content?: string; title?: string; error?: string }> {
    try {
      const result = await AIService.callMCPTool('generateContentWithAI', {
        prompt,
        contentType: type,
        length
      });

      if (result.success) {
        // Extract title and content from the generated text
        const content = result.data?.content || result.data?.text || '';
        const lines = content.split('\n');
        const title = lines[0]?.replace(/^#\s*/, '') || 'Generated Document';
        
        return {
          success: true,
          content,
          title
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to generate content'
        };
      }
    } catch (error) {
      console.error('❌ Error generating document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a document using AI assistance
   */
  static async createDocumentWithAI(title: string, type: string, prompt?: string): Promise<DocumentCreationResult> {
    try {
      const result = await AIService.callMCPTool('createDocument', {
        title,
        type,
        prompt: prompt || `Create a ${type} with the title "${title}"`
      });

      if (result.success) {
        const data = result.data;
        const creationResult: DocumentCreationResult = {
          success: true
        };

        // Check where the document was saved based on the destination
        if (data.destination) {
          if (data.destination.type === 'local_file') {
            creationResult.localPath = data.destination.path;
          } else if (data.destination.type === 'google_drive') {
            creationResult.driveFileId = data.destination.fileId;
            creationResult.driveWebViewLink = data.destination.webViewLink;
          }
        }

        return creationResult;
      } else {
        return {
          success: false,
          error: result.error || 'Failed to create document'
        };
      }
    } catch (error) {
      console.error('❌ Error creating document with AI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save document locally
   */
  private static async saveDocumentLocally(request: any): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const extension = this.getFileExtension(request.type);
      const sanitizedTitle = request.title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
      const fileName = `${sanitizedTitle}.${extension}`;
      
      // Create a Documents folder if it doesn't exist
      const documentsDir = `${FileSystem.documentDirectory}Documents/`;
      const dirInfo = await FileSystem.getInfoAsync(documentsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(documentsDir, { intermediates: true });
        console.log('📁 Created Documents directory:', documentsDir);
      }
      
      const filePath = `${documentsDir}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, request.content, {
        encoding: FileSystem.EncodingType.UTF8
      });

      console.log('✅ Document saved locally:', filePath);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('❌ Error saving document locally:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save locally' 
      };
    }
  }

  /**
   * Save document to Google Drive
   */
  private static async saveDocumentToDrive(request: DocumentCreationRequest): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
    try {
      const mimeType = request.mimeType || this.getMimeTypeForType(request.type);
      const extension = this.getFileExtension(request.type);
      const fileName = request.title.endsWith(`.${extension}`) ? request.title : `${request.title}.${extension}`;

      const result = await AIService.callMCPTool('createGoogleDriveFile', {
        name: fileName,
        content: request.content,
        mimeType
      });

      if (result.success) {
        console.log('✅ Document saved to Google Drive:', result.data.name);
        return {
          success: true,
          fileId: result.data.id,
          webViewLink: result.data.webViewLink
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to save to Google Drive'
        };
      }
    } catch (error) {
      console.error('❌ Error saving document to Google Drive:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save to Google Drive'
      };
    }
  }

  /**
   * Get file extension based on document type
   */
  private static getFileExtension(type: string): string {
    const extensions: { [key: string]: string } = {
      'text': 'txt',
      'markdown': 'md',
      'html': 'html',
      'json': 'json',
      'document': 'txt',
      'report': 'txt',
      'summary': 'txt',
      'memo': 'txt',
      'letter': 'txt'
    };

    return extensions[type.toLowerCase()] || 'txt';
  }

  /**
   * Get MIME type based on document type
   */
  private static getMimeTypeForType(type: string): string {
    const mimeTypes: { [key: string]: string } = {
      'text': 'text/plain',
      'markdown': 'text/markdown',
      'html': 'text/html',
      'json': 'application/json',
      'document': 'application/vnd.google-apps.document',
      'report': 'application/vnd.google-apps.document',
      'summary': 'application/vnd.google-apps.document',
      'memo': 'application/vnd.google-apps.document',
      'letter': 'application/vnd.google-apps.document'
    };

    return mimeTypes[type.toLowerCase()] || 'text/plain';
  }

  /**
   * Quick document creation with common templates
   */
  static async quickCreateDocument(type: 'note' | 'meeting' | 'report' | 'todo', content: string, saveLocation: 'local' | 'drive' | 'both' = 'both'): Promise<DocumentCreationResult> {
    const templates = {
      note: {
        title: `Note - ${new Date().toLocaleDateString()}`,
        template: `# Note - ${new Date().toLocaleDateString()}\n\n${content}\n\nCreated: ${new Date().toLocaleString()}`
      },
      meeting: {
        title: `Meeting Notes - ${new Date().toLocaleDateString()}`,
        template: `# Meeting Notes - ${new Date().toLocaleDateString()}\n\n## Attendees\n- \n\n## Agenda\n${content}\n\n## Action Items\n- \n\n## Next Meeting\nDate: \nTime: \n\nCreated: ${new Date().toLocaleString()}`
      },
      report: {
        title: `Report - ${new Date().toLocaleDateString()}`,
        template: `# Report - ${new Date().toLocaleDateString()}\n\n## Summary\n${content}\n\n## Details\n\n\n## Conclusions\n\n\n## Recommendations\n\n\nGenerated: ${new Date().toLocaleString()}`
      },
      todo: {
        title: `Todo List - ${new Date().toLocaleDateString()}`,
        template: `# Todo List - ${new Date().toLocaleDateString()}\n\n${content.split('\n').map(line => line.trim() ? `- [ ] ${line.trim()}` : '').filter(Boolean).join('\n')}\n\nCreated: ${new Date().toLocaleString()}`
      }
    };

    const template = templates[type];
    return await this.createDocument({
      title: template.title,
      content: template.template,
      type: 'markdown',
      saveLocation
    });
  }

  /**
   * Show creation success message
   */
  static showCreationSuccess(result: DocumentCreationResult, title: string): void {
    let message = `Document "${title}" created successfully!\n\n`;
    
    if (result.localPath) {
      message += `📱 Saved locally\n`;
    }
    
    if (result.driveFileId) {
      message += `☁️ Saved to Google Drive\n`;
    }
    
    if (result.driveWebViewLink) {
      message += `\nTap OK to view in Google Drive`;
    }

    Alert.alert(
      'Document Created',
      message,
      [
        { text: 'OK', style: 'default' },
        ...(result.driveWebViewLink ? [{
          text: 'View in Drive',
          onPress: () => {
            // This will be handled by the component calling this service
          }
        }] : [])
      ]
    );
  }
}