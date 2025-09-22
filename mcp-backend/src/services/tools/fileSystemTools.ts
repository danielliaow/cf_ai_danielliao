import { MCPTool, MCPToolResponse } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export const readFileToolDefinition: MCPTool = {
  name: 'readFile',
  description: 'Read content from a file in the local file system (Documents, Desktop, or Downloads folders only)',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const { filePath, encoding = "utf8" } = params || {};
      
      if (!filePath) {
        throw new Error('filePath parameter is required');
      }

      // Security: Restrict access to user's home directory and common document folders
      const homeDir = require('os').homedir();
      const allowedPaths = [
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Downloads')
      ];
      
      const absolutePath = path.resolve(homeDir, filePath);
      
      // Check if path is within allowed directories
      const isAllowed = allowedPaths.some(allowedPath => 
        absolutePath.startsWith(allowedPath)
      );
      
      if (!isAllowed) {
        throw new Error('Access denied. File must be in Documents, Desktop, or Downloads folder.');
      }

      // Check if file exists
      await fs.access(absolutePath);
      
      // Read file content
      const content = await fs.readFile(absolutePath, encoding as BufferEncoding);
      
      // Get file stats
      const stats = await fs.stat(absolutePath);
      
      return {
        success: true,
        data: {
          content,
          filePath: absolutePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          encoding,
          wordCount: typeof content === 'string' ? content.split(/\s+/).filter(w => w.length > 0).length : 0
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error reading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export const writeFileToolDefinition: MCPTool = {
  name: 'writeFile',
  description: 'Write content to a file in the local file system (Documents, Desktop, or Downloads folders only)',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const { filePath, content, encoding = "utf8", createDirectories = true } = params || {};
      
      if (!filePath || content === undefined) {
        throw new Error('filePath and content parameters are required');
      }

      // Security: Restrict access to user's home directory
      const homeDir = require('os').homedir();
      const allowedPaths = [
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Downloads')
      ];
      
      const absolutePath = path.resolve(homeDir, filePath);
      
      // Check if path is within allowed directories
      const isAllowed = allowedPaths.some(allowedPath => 
        absolutePath.startsWith(allowedPath)
      );
      
      if (!isAllowed) {
        throw new Error('Access denied. File must be in Documents, Desktop, or Downloads folder.');
      }

      // Create parent directories if needed
      if (createDirectories) {
        const dirPath = path.dirname(absolutePath);
        await fs.mkdir(dirPath, { recursive: true });
      }
      
      // Write file content
      await fs.writeFile(absolutePath, content, encoding as BufferEncoding);
      
      // Get file stats
      const stats = await fs.stat(absolutePath);
      
      return {
        success: true,
        data: {
          filePath: absolutePath,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          encoding,
          contentLength: content.length
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error writing file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write file',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export const listDirectoryToolDefinition: MCPTool = {
  name: 'listDirectory',
  description: 'List files and directories in a given path (Documents, Desktop, or Downloads folders only)',
  
  async execute(userId: string, params?: any): Promise<MCPToolResponse> {
    try {
      const { dirPath = "Documents", includeDetails = false, fileExtensions } = params || {};

      // Security: Restrict access to user's home directory
      const homeDir = require('os').homedir();
      const allowedPaths = [
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Downloads')
      ];
      
      const absolutePath = path.resolve(homeDir, dirPath);
      
      // Check if path is within allowed directories
      const isAllowed = allowedPaths.some(allowedPath => 
        absolutePath.startsWith(allowedPath)
      );
      
      if (!isAllowed) {
        throw new Error('Access denied. Directory must be in Documents, Desktop, or Downloads folder.');
      }

      // Check if directory exists
      await fs.access(absolutePath);
      
      // Read directory contents
      const items = await fs.readdir(absolutePath);
      
      let results = [];
      
      for (const item of items) {
        const itemPath = path.join(absolutePath, item);
        const stats = await fs.stat(itemPath);
        
        // Apply file extension filter
        if (fileExtensions && stats.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (!fileExtensions.includes(ext)) {
            continue;
          }
        }
        
        const result: any = {
          name: item,
          type: stats.isDirectory() ? 'directory' : 'file',
          path: itemPath
        };
        
        if (includeDetails) {
          result.size = stats.size;
          result.modified = stats.mtime.toISOString();
          result.created = stats.birthtime.toISOString();
          
          if (stats.isFile()) {
            result.extension = path.extname(item);
          }
        }
        
        results.push(result);
      }

      // Sort results: directories first, then files
      results.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      return {
        success: true,
        data: {
          directory: absolutePath,
          items: results,
          totalCount: results.length,
          summary: {
            directories: results.filter(item => item.type === 'directory').length,
            files: results.filter(item => item.type === 'file').length
          }
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error listing directory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list directory',
        timestamp: new Date().toISOString(),
      };
    }
  },
};