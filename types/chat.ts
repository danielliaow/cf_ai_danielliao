export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool' | 'file' | 'document';
  content: string;
  timestamp: string;
  metadata?: {
    toolName?: string;
    toolData?: any;
    error?: boolean;
    loading?: boolean;
    reasoning?: string;
    isVoice?: boolean;
    fileType?: 'local' | 'drive' | 'generated';
    fileName?: string;
    filePath?: string;
    fileSize?: number;
    wordCount?: number;
    operations?: string[];
    documentType?: 'text' | 'markdown' | 'html' | 'json' | 'csv';
  };
}

export interface FileOperationResult {
  success: boolean;
  data?: {
    content?: string;
    filePath?: string;
    fileName?: string;
    size?: number;
    wordCount?: number;
    metadata?: any;
  };
  error?: string;
}

export interface DocumentAnalysisResult {
  success: boolean;
  data?: {
    operations: {
      text?: string;
      summary?: string;
      keywords?: string[];
      sentiment?: any;
      structure?: any;
      metadata?: any;
    };
    statistics?: {
      wordCount: number;
      characterCount: number;
      paragraphCount: number;
      estimatedReadingTime: number;
    };
  };
  error?: string;
}

export interface DriveSearchResult {
  success: boolean;
  data?: {
    files: Array<{
      id: string;
      name: string;
      mimeType: string;
      size: number;
      modifiedTime: string;
      webViewLink?: string;
      content?: string;
      wordCount?: number;
    }>;
    totalCount: number;
    query: string;
  };
  error?: string;
}

export interface MCPCommand {
  command: string;
  description: string;
  example: string;
  toolName: string;
}

export const AVAILABLE_COMMANDS: MCPCommand[] = [
  {
    command: '/connect',
    description: 'Connect your Google Workspace account',
    example: '/connect',
    toolName: 'googleConnect',
  },
  {
    command: '/calendar',
    description: 'Get today\'s calendar events (requires Google connection)',
    example: '/calendar',
    toolName: 'getTodaysEvents',
  },
  {
    command: '/emails',
    description: 'Get last 10 emails (requires Google connection)',
    example: '/emails',
    toolName: 'getLastTenMails',
  },
  {
    command: '/files',
    description: 'List files in Documents directory',
    example: '/files or /files Downloads',
    toolName: 'listDirectory',
  },
  {
    command: '/read',
    description: 'Read content from a local file',
    example: '/read Documents/myfile.txt',
    toolName: 'readFile',
  },
  {
    command: '/drive-search',
    description: 'Search files in Google Drive',
    example: '/drive-search project reports',
    toolName: 'searchGoogleDrive',
  },
  {
    command: '/drive-get',
    description: 'Get content from Google Drive file by ID',
    example: '/drive-get [file-id]',
    toolName: 'getGoogleDriveFile',
  },
  {
    command: '/analyze',
    description: 'Analyze a document with AI',
    example: '/analyze Documents/report.pdf',
    toolName: 'processDocument',
  },
  {
    command: '/create-doc',
    description: 'Create a document with AI assistance',
    example: '/create-doc "Meeting Summary" formal',
    toolName: 'createDocument',
  },
  {
    command: '/generate',
    description: 'Generate content with AI',
    example: '/generate "Blog post about AI trends"',
    toolName: 'generateContentWithAI',
  },
  {
    command: '/status',
    description: 'Check MCP backend and Google connection status',
    example: '/status',
    toolName: 'status',
  },
  {
    command: '/test',
    description: 'Test backend connection and troubleshoot issues',
    example: '/test',
    toolName: 'connectionTest',
  },
  {
    command: '/debug',
    description: 'Debug authentication and token issues',
    example: '/debug',
    toolName: 'tokenDebug',
  },
  {
    command: '/help',
    description: 'Show available commands',
    example: '/help',
    toolName: 'help',
  },
];