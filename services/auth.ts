import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export const signInWithGoogle = async () => {
  try {
    const redirectUrl = Platform.OS === 'web' 
      ? `${window.location.origin}/auth/callback`
      : AuthSession.makeRedirectUri({
          scheme: 'embr', // Use your app's scheme from app.json
          path: 'auth/callback',
        });

    console.log('Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      throw error;
    }

    console.log('Opening auth URL:', data?.url);

    const res = await WebBrowser.openAuthSessionAsync(
      data?.url ?? '',
      redirectUrl
    );

    console.log('WebBrowser result:', res);

    if (res.type === 'success') {
      const { url } = res;
      console.log('Callback URL:', url);
      
      // Parse URL fragments (Supabase returns tokens in hash, not query params)
      const urlParts = url.split('#');
      if (urlParts.length > 1) {
        const hashParams = new URLSearchParams(urlParts[1]);
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        
        console.log('Extracted tokens:', { 
          access_token: access_token ? 'present' : 'missing',
          refresh_token: refresh_token ? 'present' : 'missing'
        });

        if (access_token && refresh_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }
          
          console.log('Session set successfully:', sessionData?.user?.email);
        } else {
          console.error('Missing tokens in callback URL');
          throw new Error('Authentication failed - missing tokens');
        }
      } else {
        // Try query parameters as fallback
        const parsedUrl = new URL(url);
        const access_token = parsedUrl.searchParams.get('access_token');
        const refresh_token = parsedUrl.searchParams.get('refresh_token');
        
        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
        } else {
          console.error('No tokens found in URL:', url);
          throw new Error('Authentication failed - no tokens received');
        }
      }
    }

    return res;
  } catch (error) {
    console.error('Error during Google sign in:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};