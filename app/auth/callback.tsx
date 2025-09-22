import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Platform } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Auth callback started');
        setStatus('Checking authentication...');
  
        if (Platform.OS === 'web') {
          // Give Supabase a moment to process the URL parameters
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check for URL parameters and extract all tokens
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          
          const error = urlParams.get('error') || hashParams.get('error');
          const providerToken = urlParams.get('provider_token') || hashParams.get('provider_token');
          const providerRefreshToken = urlParams.get('provider_refresh_token') || hashParams.get('provider_refresh_token');
          
          console.log('🔍 URL tokens extracted:', {
            error: error,
            providerToken: !!providerToken,
            providerRefreshToken: !!providerRefreshToken
          });
          
          if (error) {
            console.error('❌ OAuth error in callback:', error);
            setStatus('Authentication failed');
            router.replace('/(auth)/signin?error=' + encodeURIComponent(error));
            return;
          }
  
          console.log('🔍 Checking for session...');
          setStatus('Retrieving session...');
          
          // Try multiple times to get the session
          let session = null;
          let attempts = 0;
          const maxAttempts = 5;
  
          while (!session && attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Session check attempt ${attempts}/${maxAttempts}`);
            
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error(`❌ Session error on attempt ${attempts}:`, sessionError);
              if (attempts === maxAttempts) {
                setStatus('Session error');
                router.replace('/(auth)/signin?error=session_failed');
                return;
              }
            } else if (currentSession) {
              
              session = currentSession;
              console.log('✅ Session found:', session);
              await saveUserProfile(session.user, {
                providerToken: session.provider_token,
                providerRefreshToken: session.provider_refresh_token,
              });
              break;
            }
            
            if (!session && attempts < maxAttempts) {
              console.log('⏳ No session yet, waiting 1 second...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
  
          if (session) {
            console.log('✅ Auth callback success, user:', session.user.email);
            setStatus('Saving profile...');
            
            // 🔑 Save provider tokens if available
            // if (providerToken || providerRefreshToken) {
            //   try {
            //     console.log('💾 Saving provider tokens to profile...');

            //     console.log('✅ Provider tokens saved successfully');
            //     setStatus('Profile saved! Redirecting...');
            //   } catch (profileError) {
            //     console.error('⚠️ Failed to save provider tokens:', profileError);
            //     // Don't fail the auth flow, just log the error
            //     setStatus('Authentication successful! Redirecting...');
            //   }
            // } else {
            //   console.warn('⚠️ No provider tokens found in callback URL');
            //   setStatus('Authentication successful! Redirecting...');
            // }
            
            // Clear URL parameters
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            // Wait a moment before redirect to let AuthContext update
            await new Promise(resolve => setTimeout(resolve, 500));
            router.replace('/(tabs)');
          } else {
            console.log('❌ No session found after all attempts');
            setStatus('No session found');
            router.replace('/(auth)/signin?error=no_session');
          }
        } else {
          // For native platforms
          console.log('📱 Native callback handling');
          setStatus('Checking native session...');
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Native auth callback error:', error);
            router.replace('/(auth)/signin');
            return;
          }
  
          if (session) {
            console.log('✅ Native auth success:', session.user.email);
            setStatus('Native authentication successful! Redirecting...');
            
            // For native, provider tokens should already be handled in the sign-in function
            // But we could add additional logic here if needed
            router.replace('/(tabs)');
          } else {
            console.log('❌ No session in native callback');
            router.replace('/(auth)/signin');
          }
        }
      } catch (error) {
        console.error('💥 Auth callback error:', error);
        setStatus('Authentication error');
        router.replace('/(auth)/signin?error=callback_failed');
      }
    };
  
    handleCallback();
  }, [router]);
  
  // Make sure you have this helper function available (import it or define it)
  const saveUserProfile = async (user, tokens) => {
    try {
      console.log('💾 Attempting to save user profile:', {
        userId: user.id,
        email: user.email,
        hasProviderToken: !!tokens.providerToken,
        hasProviderRefreshToken: !!tokens.providerRefreshToken
      });
  
      const { error } = await supabase
        .from('user_profiles') // Replace with your actual table name
        .upsert({
          id: user.id,
          email: user.email,
          // full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          // avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          // provider_token: tokens.providerToken,
          google_refresh_token: tokens.providerRefreshToken,
          
          created_at: new Date().toISOString()
        });
  
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
  
      console.log('✅ User profile saved to database');
    } catch (err) {
      console.error('❌ saveUserProfile error:', err);
      throw new Error(`Failed to save user profile: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4285F4" />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});