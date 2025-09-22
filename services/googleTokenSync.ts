import { supabase } from '../lib/supabase';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

export class GoogleTokenSync {
  static async extractGoogleTokens(): Promise<{
    success: boolean;
    tokens?: any;
    error?: string;
  }> {
    try {
      console.log('🔍 Extracting Google tokens from Supabase session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return { success: false, error: 'No active session' };
      }

      // Check if user signed in with Google
      const provider = session.user.app_metadata?.provider;
      if (provider !== 'google') {
        return { 
          success: false, 
          error: `Signed in with ${provider}, not Google. Please sign in with Google to access Workspace data.` 
        };
      }

      // Extract Google-specific data from the session
      const googleData = {
        // Use Supabase's access token as it includes Google OAuth delegation
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user_id: session.user.id,
        email: session.user.email,
        // Google provider info
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token,
      };

      console.log('✅ Google tokens extracted:', {
        hasAccessToken: !!googleData.access_token,
        hasRefreshToken: !!googleData.refresh_token,
        hasProviderToken: !!googleData.provider_token,
        expires: googleData.expires_at ? new Date(googleData.expires_at * 1000).toISOString() : 'unknown'
      });

      return { success: true, tokens: googleData };
    } catch (error) {
      console.error('❌ Error extracting Google tokens:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async syncTokensToBackend(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔄 Syncing Google tokens to MCP backend...');
      
      const tokenResult = await this.extractGoogleTokens();
      
      if (!tokenResult.success) {
        return {
          success: false,
          message: `Token extraction failed: ${tokenResult.error}`,
        };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'No active session' };
      }

      // Send tokens to backend
      const response = await fetch(`${MCP_BASE_URL}/auth/google/sync-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleTokens: tokenResult.tokens,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Tokens synced successfully');
        return {
          success: true,
          message: 'Google Workspace tokens synced successfully!',
          details: data.data
        };
      } else {
        console.error('❌ Backend sync failed:', data);
        return {
          success: false,
          message: `Backend sync failed: ${data.error || 'Unknown error'}`,
          details: data
        };
      }
    } catch (error) {
      console.error('💥 Token sync error:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      };
    }
  }

  static async testGoogleAPIAccess(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testing Google API access...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'No active session' };
      }

      // Test calendar access
      const response = await fetch(`${MCP_BASE_URL}/mcp/tools/getTodaysEvents/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ params: {} }),
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          message: 'Google API access working! Calendar data retrieved.',
          details: data.data
        };
      } else {
        return {
          success: false,
          message: `Google API test failed: ${data.error}`,
          details: data
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API test failed: ${error}`,
        details: error
      };
    }
  }
}