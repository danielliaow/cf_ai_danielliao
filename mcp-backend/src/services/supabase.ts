import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1enRraXhuY3libHRzaXdhamlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDkzNzIsImV4cCI6MjA3MDIyNTM3Mn0.5DTdKQEk7B8I1C4HmAlq4OW2bCjivOenYleKdgdkyH8';

// For user token verification, we need the anon key, not service role
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Create a separate admin client with service role key for admin operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export class SupabaseService {
  static async verifyToken(token: string) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        throw new Error('Invalid token');
      }

      return {
        id: user.id,
        email: user.email!,
        metadata: user.user_metadata,
      };
    } catch (error) {
      throw new Error('Token verification failed');
    }
  }

  static async storeGoogleTokens(userId: string, tokens: any) {
    console.log('💾 Storing Google tokens in user_profiles for user:', userId);
    
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
       
        google_refresh_token: tokens.refresh_token,
       
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error storing Google tokens:', error);
      throw error;
    }
    
    console.log('✅ Google tokens stored successfully');
  }

  static async getGoogleTokens(userId: string) {
    console.log('🔍 Retrieving Google tokens from user_profiles for user:', userId);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('google_refresh_token')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error retrieving Google tokens:', error);
      throw error;
    }
    
    if (!data?.google_refresh_token) {
      throw new Error('No Google tokens found for user');
    }

    console.log('✅ Google tokens retrieved:', {
   
      hasRefreshToken: !!data.google_refresh_token,
     
    });

    // Convert to the format expected by Google Auth tools
    return {
    
      refresh_token: data.google_refresh_token,
      scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
      token_type: 'Bearer',
    };
  }
}