import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Fallback method using direct Supabase session handling
export const signInWithGoogleFallback = async () => {
  try {
    console.log('🔄 Using fallback Google auth method...');

    const request = new AuthSession.AuthRequest({
      clientId: '277683829604-lr21bqtsatm0eicaephloms8udij401v.apps.googleusercontent.com',
      scopes:[
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/userinfo.email", 
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
      ],
      redirectUri: AuthSession.makeRedirectUri({
        useProxy: true,
        preferLocalhost: true,
      }),
      responseType: AuthSession.ResponseType.Code,
      additionalParameters: {
        access_type: 'offline',
        prompt: 'consent',
      },
    });

    console.log('📱 Request configured, opening prompt...');

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const result = await request.promptAsync(discovery);

    console.log('🎯 Auth result:', result.type);

    if (result.type === 'success') {
      console.log('✅ Got authorization code:', result.params.code ? 'Yes' : 'No');
      
      if (result.params.code) {
        // Exchange code for session via Supabase
        console.log('🔄 Exchanging code for session...');
        
        // Use Supabase's code exchange
        const { data, error } = await supabase.auth.exchangeCodeForSession(result.params.code);
        
        if (error) {
          console.error('❌ Code exchange error:', error);
          throw error;
        }
        
        console.log('✅ Session created!', data.user?.email);
        return { type: 'success', session: data.session };
      }
    }

    return result;
  } catch (error) {
    console.error('💥 Fallback auth error:', error);
    throw error;
  }
};

// Simple direct sign-in attempt
export const signInWithSupabaseDirect = async () => {
  try {
    console.log('🎯 Direct Supabase OAuth attempt...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: false,
        redirectTo: 'https://auth.expo.io/@your-username/supabaseauthapp',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('❌ Direct OAuth error:', error);
      throw error;
    }

    console.log('🔗 Opening OAuth URL...');
    
    if (data?.url) {
      await WebBrowser.openBrowserAsync(data.url);
      
      // Wait a bit and check for session
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📊 Session after browser:', session ? 'Found' : 'None');
      
      return { type: 'success', session };
    }

    throw new Error('No OAuth URL generated');
  } catch (error) {
    console.error('💥 Direct OAuth error:', error);
    throw error;
  }
};