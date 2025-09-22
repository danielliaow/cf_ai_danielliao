import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

export class GoogleWorkspaceAuth {
  static async getAuthUrl(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/auth/google`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data.authUrl;
      } else {
        throw new Error(data.error || 'Failed to get auth URL');
      }
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      return null;
    }
  }

  static async connectGoogleWorkspace(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('🔗 Starting Google Workspace connection...');
      
      const authUrl = await this.getAuthUrl();
      
      if (!authUrl) {
        return {
          success: false,
          message: 'Failed to generate Google authorization URL'
        };
      }

      console.log('📱 Opening Google authorization...');
      
      const result = await WebBrowser.openBrowserAsync(authUrl, {
        showTitle: true,
        toolbarColor: '#4285F4',
        controlsColor: '#ffffff',
      });

      if (result.type === 'cancel') {
        return {
          success: false,
          message: 'Authorization cancelled by user'
        };
      }

      // Wait a moment for the auth flow to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test if Google connection is now working
      const testResult = await this.testGoogleConnection();
      
      return testResult;
    } catch (error) {
      console.error('Google Workspace connection error:', error);
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async testGoogleConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'No active session' };
      }

      const response = await fetch(`${MCP_BASE_URL}/auth/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success && data.data.googleWorkspace.connected) {
        return {
          success: true,
          message: 'Google Workspace is connected and ready!'
        };
      } else {
        return {
          success: false,
          message: 'Google Workspace is not connected'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error}`
      };
    }
  }
}