import { supabase } from '../lib/supabase';

export class TokenDebugger {
  static async getCurrentToken(): Promise<{
    hasToken: boolean;
    token?: string;
    user?: any;
    error?: string;
  }> {
    try {
      console.log('🔍 Getting current Supabase session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session error:', error);
        return { hasToken: false, error: error.message };
      }
      
      if (!session) {
        console.log('❌ No session found');
        return { hasToken: false, error: 'No active session' };
      }
      
      console.log('✅ Session found for user:', session.user?.email);
      console.log('🔑 Token expires at:', new Date(session.expires_at! * 1000).toISOString());
      
      return {
        hasToken: true,
        token: session.access_token,
        user: {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        }
      };
    } catch (error) {
      console.error('💥 Token debug error:', error);
      return { 
        hasToken: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async testBackendAuth(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const tokenInfo = await this.getCurrentToken();
    
    if (!tokenInfo.hasToken) {
      return {
        success: false,
        message: 'No valid token available',
        details: tokenInfo
      };
    }

    try {
      console.log('🔍 Testing backend auth with token...');
      
      const response = await fetch('http://localhost:3001/api/auth/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Response data:', data);

      if (response.ok) {
        return {
          success: true,
          message: 'Backend authentication successful!',
          details: { tokenInfo, response: data }
        };
      } else {
        return {
          success: false,
          message: `Backend rejected token: ${data.error}`,
          details: { tokenInfo, response: data }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error testing backend',
        details: { tokenInfo, error }
      };
    }
  }
}