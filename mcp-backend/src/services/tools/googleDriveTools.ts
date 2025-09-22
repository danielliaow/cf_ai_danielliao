import { MCPTool, MCPToolResponse } from '../../types';
import { GoogleAuthService } from '../googleAuth';
import { google } from 'googleapis';

export const searchGoogleDriveToolDefinition: MCPTool = {
  name: 'searchGoogleDrive',
  description: 'Search for files in Google Drive using various criteria including filename and content',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const { 
        query = "", 
        fileType, // Renamed from mimeType for consistency
        maxResults = 20, 
        orderBy = "modifiedTime desc",
        includeContent = false 
      } = params || {};

      const auth = await GoogleAuthService.getAuthenticatedClient(userId);
      const drive = google.drive({ version: 'v3', auth });

      // Build search query with proper formatting
      let searchQuery = "trashed=false";
      
      // Add query term if provided and not empty
      if (query && query.trim() !== "") {
        searchQuery = `name contains '${query.trim()}' and ${searchQuery}`;
      }
      
      // Add file type filter if provided
      if (fileType) {
        const mimeTypeMap: { [key: string]: string } = {
          'pdf': 'application/pdf',
          'document': 'application/vnd.google-apps.document',
          'spreadsheet': 'application/vnd.google-apps.spreadsheet',
          'presentation': 'application/vnd.google-apps.presentation',
          'image': 'image/',
          'video': 'video/',
          'audio': 'audio/'
        };
        
        const mimeType = mimeTypeMap[fileType.toLowerCase()] || fileType;
        if (mimeType.endsWith('/')) {
          searchQuery += ` and mimeType contains '${mimeType}'`;
        } else {
          searchQuery += ` and mimeType='${mimeType}'`;
        }
      }

      // Validate and constrain maxResults (Google Drive API requires 1-1000)
      const validMaxResults = Math.max(1, Math.min(maxResults, 100));

      const response = await drive.files.list({
        q: searchQuery,
        pageSize: validMaxResults,
        orderBy,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,description,parents)'
      });

      const files = response.data.files || [];
      console.log(files,'files from gogle drive tool');
      const results = [];

      for (const file of files) {
        const result: any = {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ? parseInt(file.size) : 0,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          thumbnailLink: file.thumbnailLink,
          description: file.description
        };

        // Include content preview for supported formats
        if (includeContent && file.id) {
          try {
            result.content = await getFileContent(drive, file.id, file.mimeType || '');
            result.wordCount = typeof result.content === 'string' ? 
              result.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
          } catch (error) {
            result.contentError = `Could not retrieve content: ${error}`;
          }
        }

        results.push(result);
      }

      return {
        success: true,
        data: {
          files: results,
          totalCount: results.length,
          query: searchQuery,
          summary: {
            totalFiles: results.length,
            withContent: results.filter(r => r.content).length,
            mimeTypes: [...new Set(results.map(r => r.mimeType))],
            totalSize: results.reduce((sum, file) => sum + (file.size || 0), 0)
          }
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error searching Google Drive:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Drive search failed',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export const getGoogleDriveFileToolDefinition: MCPTool = {
  name: 'getGoogleDriveFile',
  description: 'Download and retrieve content from a specific Google Drive file by ID',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const { fileId, exportFormat, includeMetadata = true } = params || {};

      if (!fileId) {
        throw new Error('fileId parameter is required');
      }

      const auth = await GoogleAuthService.getAuthenticatedClient(userId);
      const drive = google.drive({ version: 'v3', auth });

      // Get file metadata
      const fileMetadata = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,description,parents,permissions'
      });

      const file = fileMetadata.data;
      
      // Get file content
      const content = await getFileContent(drive, fileId, file.mimeType || '', exportFormat);

      const result: any = {
        id: file.id,
        name: file.name,
        content,
        contentType: exportFormat || file.mimeType,
        wordCount: typeof content === 'string' ? 
          content.split(/\s+/).filter(w => w.length > 0).length : 0,
        characterCount: typeof content === 'string' ? content.length : 0
      };

      if (includeMetadata) {
        result.metadata = {
          mimeType: file.mimeType,
          size: file.size ? parseInt(file.size) : 0,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          description: file.description,
          parents: file.parents
        };
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting Google Drive file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Google Drive file',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export const createGoogleDriveFileToolDefinition: MCPTool = {
  name: 'createGoogleDriveFile',
  description: 'Create a new file in Google Drive with specified content and format',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const { 
        name, 
        content, 
        mimeType = "text/plain", 
        parentFolderId,
        description 
      } = params || {};

      if (!name || content === undefined) {
        throw new Error('name and content parameters are required');
      }

      const auth = await GoogleAuthService.getAuthenticatedClient(userId);
      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata: any = {
        name,
        description
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      // Create file
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType,
          body: content
        },
        fields: 'id,name,webViewLink,createdTime,size'
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          webViewLink: response.data.webViewLink,
          createdTime: response.data.createdTime,
          mimeType,
          size: response.data.size ? parseInt(response.data.size) : content.length,
          contentLength: content.length,
          wordCount: typeof content === 'string' ? 
            content.split(/\s+/).filter(w => w.length > 0).length : 0
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating Google Drive file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Google Drive file',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

// Helper function to get file content
async function getFileContent(drive: any, fileId: string, mimeType: string, exportFormat?: string): Promise<string> {
  try {
    let response;

    // Handle Google Workspace documents (need to be exported)
    if (mimeType.startsWith('application/vnd.google-apps.')) {
      const format = exportFormat || getDefaultExportFormat(mimeType);
      response = await drive.files.export({
        fileId,
        mimeType: format
      });
    } else {
      // Handle regular files
      response = await drive.files.get({
        fileId,
        alt: 'media'
      });
    }

    // Convert buffer to string if needed
    if (Buffer.isBuffer(response.data)) {
      return response.data.toString('utf-8');
    }

    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to get file content: ${error.message}`);
  }
}

// Helper function to get default export format for Google Workspace files
function getDefaultExportFormat(mimeType: string): string {
  switch (mimeType) {
    case 'application/vnd.google-apps.document':
      return 'text/plain';
    case 'application/vnd.google-apps.spreadsheet':
      return 'text/csv';
    case 'application/vnd.google-apps.presentation':
      return 'text/plain';
    default:
      return 'text/plain';
  }
}