import { supabase } from '../lib/supabase';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class MCPService {
  private static async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private static async makeRequest(endpoint: string, options: RequestInit = {}): Promise<MCPResponse> {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${MCP_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    return data;
  }

  static async getAvailableTools(): Promise<MCPResponse> {
    try {
      return await this.makeRequest('/mcp/tools');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tools',
        timestamp: new Date().toISOString(),
      };
    }
  }

  static async executeTool(toolName: string, params: any = {}): Promise<MCPResponse> {
    try {
      const res= await this.makeRequest(`/mcp/tools/${toolName}/execute`, {
        method: 'POST',
        body: JSON.stringify({ params }),
      });
console.log(res,'client res')
      return res
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute tool',
        timestamp: new Date().toISOString(),
      };
    }
  }

  static async getTodaysEvents(): Promise<MCPResponse> {
    console.log('📅 Fetching today\'s calendar events...');
    return this.executeTool('getTodaysEvents');
  }

  static async getLastTenMails(): Promise<MCPResponse> {
    console.log('📧 Fetching last 10 emails...');
    return this.executeTool('getLastTenMails');
  }

  static async getEmails(params: any = {}): Promise<MCPResponse> {
    console.log('📧 Fetching emails with params:', params);
    return this.executeTool('getEmails', params);
  }

  static async getAuthStatus(): Promise<MCPResponse> {
    try {
      return await this.makeRequest('/auth/status');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get auth status',
        timestamp: new Date().toISOString(),
      };
    }
  }
}