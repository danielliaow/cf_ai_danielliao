import { MCPService } from './mcpService';

export class MCPTestService {
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 Testing MCP backend connection...');
      
      // Test 1: Basic health check (no auth required)
      try {
        const healthResponse = await fetch('http://localhost:3001/api/health');
        const healthData = await healthResponse.json();
        
        if (!healthData.success) {
          throw new Error('Backend health check failed');
        }
        
        console.log('✅ Backend health check passed');
      } catch (error) {
        return {
          success: false,
          message: 'Backend is not running or unreachable',
          details: error
        };
      }

      // Test 2: Auth status (requires auth)
      try {
        const authResult = await MCPService.getAuthStatus();
        
        if (authResult.success) {
          console.log('✅ Backend authentication successful');
          return {
            success: true,
            message: 'MCP backend connected successfully!',
            details: authResult.data
          };
        } else {
          console.log('❌ Backend authentication failed:', authResult.error);
          return {
            success: false,
            message: `Authentication failed: ${authResult.error}`,
            details: authResult
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Authentication request failed',
          details: error
        };
      }
    } catch (error) {
      console.error('🔥 MCP connection test failed:', error);
      return {
        success: false,
        message: 'Connection test failed',
        details: error
      };
    }
  }

  static async testGoogleConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('📅 Testing Google Workspace connection...');
      
      const result = await MCPService.getTodaysEvents();
      
      if (result.success) {
        return {
          success: true,
          message: 'Google Workspace connected! Calendar access working.',
          details: result.data
        };
      } else {
        return {
          success: false,
          message: `Google Workspace issue: ${result.error}`,
          details: result
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Google connection test failed',
        details: error
      };
    }
  }
}