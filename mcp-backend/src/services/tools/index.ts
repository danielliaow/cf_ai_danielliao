import { MCPToolRegistry } from '../mcpToolRegistry';
import { getTodaysEventsToolDefinition } from './getTodaysEvents';
import { getLastTenMailsToolDefinition } from './getLastTenMails';
import { getEmailsToolDefinition } from './getEmails';
import { createCalendarEventToolDefinition } from './createCalendarEvent';
import { crawlPageToolDefinition } from './crawlPage';
import { searchWebToolDefinition } from './searchWeb';

// Import new file system tools
import { 
  readFileToolDefinition, 
  writeFileToolDefinition, 
  listDirectoryToolDefinition 
} from './fileSystemTools';

// Import new Google Drive tools
import { 
  searchGoogleDriveToolDefinition, 
  getGoogleDriveFileToolDefinition, 
  createGoogleDriveFileToolDefinition 
} from './googleDriveTools';

// Import new document tools
import { 
  processDocumentToolDefinition, 
  createDocumentToolDefinition, 
  generateContentWithAIToolDefinition 
} from './documentTools';

// Register all tools
export function registerAllTools() {
  // Existing tools
  MCPToolRegistry.registerTool(getTodaysEventsToolDefinition);
  MCPToolRegistry.registerTool(getLastTenMailsToolDefinition);
  MCPToolRegistry.registerTool(getEmailsToolDefinition);
  MCPToolRegistry.registerTool(createCalendarEventToolDefinition);
  MCPToolRegistry.registerTool(crawlPageToolDefinition);
  MCPToolRegistry.registerTool(searchWebToolDefinition);
  
  // New file system tools
  MCPToolRegistry.registerTool(readFileToolDefinition);
  MCPToolRegistry.registerTool(writeFileToolDefinition);
  MCPToolRegistry.registerTool(listDirectoryToolDefinition);
  
  // New Google Drive tools
  MCPToolRegistry.registerTool(searchGoogleDriveToolDefinition);
  MCPToolRegistry.registerTool(getGoogleDriveFileToolDefinition);
  MCPToolRegistry.registerTool(createGoogleDriveFileToolDefinition);
  
  // New document processing and creation tools
  MCPToolRegistry.registerTool(processDocumentToolDefinition);
  MCPToolRegistry.registerTool(createDocumentToolDefinition);
  MCPToolRegistry.registerTool(generateContentWithAIToolDefinition);
}

// Export tool definitions for potential individual use
export {
  // Existing tools
  getTodaysEventsToolDefinition,
  getLastTenMailsToolDefinition,
  getEmailsToolDefinition,
  createCalendarEventToolDefinition,
  crawlPageToolDefinition,
  searchWebToolDefinition,
  
  // New file system tools
  readFileToolDefinition,
  writeFileToolDefinition,
  listDirectoryToolDefinition,
  
  // New Google Drive tools
  searchGoogleDriveToolDefinition,
  getGoogleDriveFileToolDefinition,
  createGoogleDriveFileToolDefinition,
  
  // New document tools
  processDocumentToolDefinition,
  createDocumentToolDefinition,
  generateContentWithAIToolDefinition,
};