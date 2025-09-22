import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export const saveUserTokens = async (user: User, tokens: {
  providerToken?: string;
  providerRefreshToken?: string;
  accessToken?: string;
  refreshToken?: string;
} = {}) => {
  try {
    console.log('🔄 TokenService: Attempting to save user tokens');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Tokens available:', {
      providerToken: !!tokens.providerToken,
      providerRefreshToken: !!tokens.providerRefreshToken,
      accessToken: !!tokens.accessToken,
      refreshToken: !!tokens.refreshToken,
    });
    
    const tokenData = {
      user_id: user.id,
      access_token: tokens.providerToken || tokens.accessToken || `token_${Date.now()}`,
      refresh_token: tokens.providerRefreshToken || tokens.refreshToken || null,
      scope: 'gmail.readonly calendar userinfo.email userinfo.profile drive drive.file',
      token_type: 'Bearer',
      expiry_date: Date.now() + (3600 * 1000), // 1 hour from now
    };

    console.log('💾 TokenService: Saving token data to user_google_tokens table...');

    const { data, error } = await supabase
      .from('user_google_tokens')
      .upsert(tokenData, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ TokenService: Database error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return { success: false, error };
    } else {
      console.log('✅ TokenService: Tokens saved successfully!');
      console.log('Saved data:', data);
      return { success: true, data };
    }
  } catch (error) {
    console.error('💥 TokenService: Unexpected error:', error);
    return { success: false, error };
  }
};

export const getUserTokens = async (userId: string) => {
  try {
    console.log('🔍 TokenService: Retrieving tokens for user:', userId);
    
    const { data, error } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ TokenService: Error retrieving tokens:', error);
      return { success: false, error };
    }

    console.log('✅ TokenService: Tokens retrieved:', {
      hasData: !!data,
      hasAccessToken: !!data?.access_token,
      hasRefreshToken: !!data?.refresh_token,
    });

    return { success: true, data };
  } catch (error) {
    console.error('💥 TokenService: Error retrieving tokens:', error);
    return { success: false, error };
  }
};

export const saveTokensFromSession = async (session: Session) => {
  if (!session.user) {
    console.log('❌ TokenService: No user in session');
    return { success: false, error: 'No user in session' };
  }

  console.log('🔄 TokenService: Extracting tokens from session...');
  console.log('Session provider token:', session.provider_token ? 'Present' : 'Missing');
  console.log('Session provider refresh token:', session.provider_refresh_token ? 'Present' : 'Missing');

  return await saveUserTokens(session.user, {
    providerToken: session.provider_token,
    providerRefreshToken: session.provider_refresh_token,
  });
};