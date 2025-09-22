import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import * as Linking from "expo-linking";
import { Platform } from 'react-native';

// WebBrowser.maybeCompleteAuthSession();

interface GoogleTokens {
  providerToken?: string | null;
  providerRefreshToken?: string | null;
}

const saveUserProfile = async (user: User, googleTokens: GoogleTokens) => {
  try {
    console.log('💾 Saving user profile with Google tokens...');
    
    const profileData = {
      id: user.id,
      email: user.email!,
      google_refresh_token: googleTokens.providerRefreshToken,
     
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Error saving user profile:', error);
      console.error('Error details:', error.message);
      // Don't throw here - profile save shouldn't block auth
      // This might fail if the table doesn't exist yet, which is fine
    } else {
      console.log('✅ User profile saved successfully with Google tokens');
    }
  } catch (error) {
    console.error('💥 Error in saveUserProfile:', error);
    // Don't throw here - profile save shouldn't block auth
  }
};

// export const signInWithGoogle = async () => {
//   try {
//     console.log('🚀 Starting Google Sign In...');
    
//     // Use Expo's auth session with proper configuration
//     const redirectUrl = AuthSession.makeRedirectUri({
//       useProxy: true,
//       preferLocalhost: true,
//     });
    
//     console.log('📍 Redirect URL:', redirectUrl);

//     // Create auth request configuration
//     const authUrl = `https://duztkixncybltsiwajif.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
    
//     console.log('🔗 Direct Auth URL:', authUrl);

//     // Open browser for authentication with timeout and proper error handling
//     const result = await WebBrowser.openAuthSessionAsync(
//       authUrl,
//       redirectUrl,
//       {
//         showInRecents: false,
//         createTask: false,
//       }
//     );

//     console.log('🔄 Browser result type:', result.type);

//     if (result.type === 'success') {
//       console.log('✅ Browser returned success!');
//       console.log('🎯 Callback URL:', result.url);
      
//       try {
//         // Parse the callback URL manually
//         const url = new URL(result.url);
        
//         // Check for error in callback
//         const error = url.searchParams.get('error');
//         if (error) {
//           console.error('❌ OAuth error in callback:', error);
//           throw new Error(`OAuth error: ${error}`);
//         }

//         // Look for session data in hash
//         const hash = url.hash.substring(1);
//         const hashParams = new URLSearchParams(hash);
        
//         const accessToken = hashParams.get('access_token');
//         const refreshToken = hashParams.get('refresh_token');
        
//         console.log('🔑 Tokens found:', {
//           access: accessToken ? 'Yes' : 'No',
//           refresh: refreshToken ? 'Yes' : 'No'
//         });

//         if (accessToken && refreshToken) {
//           // Set session manually
//           const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
//             access_token: accessToken,
//             refresh_token: refreshToken,
//           });
         
//           if (sessionError) {
//             console.error('❌ Session error:', sessionError);
//             throw sessionError;
//           }
          
//           console.log('✅ Session set successfully!', sessionData?.user?.email);
//           console.log(sessionData ,"session dataaaaaaaa ")
//           // Extract Google tokens from the hash
//           const providerToken = hashParams.get('provider_token');
//           const providerRefreshToken = hashParams.get('provider_refresh_token');
          
//           console.log('🔍 Google Provider tokens:', {
//             provider_token: providerToken ? 'Found' : 'Not found',
//             provider_refresh_token: providerRefreshToken ? 'Found' : 'Not found'
//           });
          
//           // Save user profile with Google tokens
//           if (sessionData?.user) {
//             await saveUserProfile(sessionData.user, {
//               providerToken,
//               providerRefreshToken
//             });
//           }
          
//           return { type: 'success', url: result.url };
//         } else {
//           console.error('❌ No tokens in callback URL');
//           console.log('Full callback URL:', result.url);
//           throw new Error('No authentication tokens received');
//         }
//       } catch (parseError) {
//         console.error('❌ Error parsing callback:', parseError);
//         throw parseError;
//       }
//     } else if (result.type === 'cancel') {
//       console.log('⚠️ User cancelled authentication');
//       return result;
//     } else {
//       console.log('❌ Authentication failed:', result.type);
//       return result;
//     }
//   } catch (error) {
//     console.error('💥 Sign in error:', error);
//     throw error;
//   }
// };

// export const signInWithGoogle = async () => {
//   try {
//     console.log('🚀 Starting Google Sign In with proper scopes...');
    
//     // Step 0: Verify Supabase client
//     console.log('🔍 Checking Supabase client...');
//     if (!supabase) {
//       throw new Error('Supabase client not initialized');
//     }
//     if (!supabase.auth) {
//       throw new Error('Supabase auth not available');
//     }
//     console.log('✅ Supabase client verified');

//     // Step 1: Generate redirect URL
//     let redirectUrl;
//     try {
//       redirectUrl = AuthSession.makeRedirectUri({
//         useProxy: true,
//         preferLocalhost: true,
//       });
//       console.log('📍 Redirect URL generated:', redirectUrl);
//     } catch (redirectError) {
//       console.error('❌ Error generating redirect URL:', redirectError);
//       throw new Error(`Failed to generate redirect URL: ${redirectError.message}`);
//     }

//     // Step 2: Prepare OAuth options
//     const oauthOptions = {
//       provider: 'google' as const,
//       options: {
//         redirectTo: redirectUrl,
//         scopes: [
//           'https://www.googleapis.com/auth/gmail.readonly',
//           'https://www.googleapis.com/auth/calendar.readonly',
//           'https://www.googleapis.com/auth/userinfo.email',
//           'https://www.googleapis.com/auth/userinfo.profile',
//         ].join(' '),
//         queryParams: {
//           access_type: 'offline', // ✅ Needed for refresh_token
//           prompt: 'consent',      // ✅ Forces Google to return it again
//         },
//       },
//     };

//     console.log('🔧 OAuth options prepared:', JSON.stringify(oauthOptions, null, 2));

//     // Step 3: Call Supabase OAuth
//     console.log('📡 Calling supabase.auth.signInWithOAuth...');
//     let data, error;
//     try {
//       const result = await supabase.auth.signInWithOAuth(oauthOptions);
//       data = result.data;
//       error = result.error;
//       console.log('📡 Supabase OAuth response:', { data, error });
//     } catch (supabaseError) {
//       console.error('❌ Supabase OAuth call failed:', supabaseError);
//       throw new Error(`Supabase OAuth failed: ${supabaseError.message}`);
//     }

//     if (error) {
//       console.error('❌ Supabase OAuth returned error:', error);
//       throw new Error(`OAuth error: ${error.message || error}`);
//     }

//     if (!data?.url) {
//       console.error('❌ No OAuth URL returned from Supabase');
//       throw new Error('No OAuth URL returned from Supabase');
//     }

//     console.log('🔗 Opening browser with OAuth URL...');
//     console.log('Full URL:', data.url);

//     const result = await WebBrowser.openAuthSessionAsync(
//       data.url,
//       redirectUrl,
//       { showInRecents: false, createTask: false }
//     );

//     console.log('🔄 Browser result:', result);

//     if (result.type !== 'success') {
//       console.log('⚠️ Auth failed or cancelled:', result.type);
//       return result;
//     }

//     console.log('✅ Browser returned success!');
//     console.log('🎯 Callback URL:', result.url);

//     // Give Supabase a moment to process the callback
//     console.log('⏳ Waiting for Supabase to process session...');
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // Try to get session multiple times if needed
//     let session = null;
//     let attempts = 0;
//     const maxAttempts = 5;

//     while (!session && attempts < maxAttempts) {
//       attempts++;
//       console.log(`🔍 Attempt ${attempts}/${maxAttempts} to get session...`);
      
//       const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
//       if (sessionError) {
//         console.error(`❌ Session error on attempt ${attempts}:`, sessionError);
//         if (attempts === maxAttempts) throw sessionError;
//       } else if (sessionData.session) {
//         session = sessionData.session;
//         console.log('✅ Session found on attempt', attempts);
//         break;
//       }
      
//       if (!session && attempts < maxAttempts) {
//         console.log('⏳ No session yet, waiting 1 second...');
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//     }

//     if (!session) {
//       throw new Error('Failed to get session after authentication');
//     }

//     console.log('🔑 Final tokens in session:', {
//       access_token: session?.access_token ? 'Yes' : 'No',
//       refresh_token: session?.refresh_token ? 'Yes' : 'No',
//       provider_token: session?.provider_token ? 'Yes' : 'No',
//       provider_refresh_token: session?.provider_refresh_token ? 'Yes' : 'No',
//     });

//     if (session?.user) {
//       console.log('💾 Saving user profile with tokens...');
//       await saveUserProfile(session.user, {
//         providerToken: session.provider_token,
//         providerRefreshToken: session.provider_refresh_token,
//       });
//     }

//     return { type: 'success', session };
//   } catch (err) {
//     console.error('💥 Sign in error details:');
//     console.error('Error type:', typeof err);
//     console.error('Error message:', err.message || 'No message');
//     console.error('Full error:', err);
//     console.error('Error stack:', err.stack);
    
//     // Re-throw with more context
//     const errorMessage = err.message || err.toString() || 'Unknown error';
//     throw new Error(`Google Sign In failed: ${errorMessage}`);
//   }
// };


export const signInWithGoogle = async () => {
  try {
    console.log("🚀 Starting Google Sign In with proper scopes...");

    // Step 1: Redirect URL - Dynamic based on platform and environment
    const redirectUrl = Platform.OS === 'web' 
      ? `${window.location.origin}/auth/callback`
      : AuthSession.makeRedirectUri({
          useProxy: true,
          preferLocalhost: false, // Allow dynamic detection
        });
    console.log("📍 Redirect URL generated:", redirectUrl);

    // Step 2: Supabase OAuth options
    const oauthOptions = {
      provider: "google" as const,
      options: {
        redirectTo: redirectUrl,
        scopes: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/drive", 
        ].join(" "),
        queryParams: {
          access_type: "offline", // 🔑 ensures refresh_token
          prompt: "consent",      // 🔑 forces Google to reissue it
        },
      },
    };

    // Step 3: Get Supabase OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth(oauthOptions);
    if (error) throw error;
    if (!data?.url) throw new Error("No OAuth URL returned from Supabase");

    // Step 4: Open OAuth session
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type !== "success") {
      console.log("⚠️ Auth failed or cancelled:", result.type);
      return result;
    }

    console.log("✅ Browser returned success!");
    console.log("🎯 Callback URL:", result.url);

    // Step 5: Extract tokens from callback URL fragment
    const urlParams = new URLSearchParams(result.url.split("#")[1]);
    const access_token = urlParams.get("access_token");
    const refresh_token = urlParams.get("refresh_token");
    const provider_token = urlParams.get("provider_token");
    const provider_refresh_token = urlParams.get("provider_refresh_token");

    if (!access_token) throw new Error("No access token found in callback URL");

    console.log("🔑 Parsed tokens:", {
      access_token: !!access_token,
      refresh_token: !!refresh_token,
      provider_token: !!provider_token,
      provider_refresh_token: !!provider_refresh_token,
    });

    // Step 6: Store Supabase session (auth works with access/refresh)
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) throw sessionError;

    // Step 7: Persist provider tokens (Gmail/Calendar usage)
    if (sessionData.session?.user) {
      await saveUserProfile(sessionData.session.user, {
        providerToken: provider_token,
        providerRefreshToken: provider_refresh_token,
      });
    }

    return {
      type: "success",
      session: sessionData.session,
      provider_token,
      provider_refresh_token,
    };
  } catch (err) {
    console.error("💥 Sign in error:", err);
    throw new Error(`Google Sign In failed: ${err.message}`);
  }
};



// export const signInWithGoogle = async () => {
//   try {
//     console.log("🚀 Starting Google Sign In...");

//     if (Platform.OS === "web") {
//       // 👉 Web flow: Supabase will handle session automatically
//       const requestedScopes = [
//         "https://www.googleapis.com/auth/gmail.readonly",
//         "https://www.googleapis.com/auth/calendar.readonly",
//         "https://www.googleapis.com/auth/userinfo.email", 
//         "https://www.googleapis.com/auth/userinfo.profile",
//         "https://www.googleapis.com/auth/drive",
//       ].join(" ");
      
//       console.log("🔍 Web: Requesting scopes:", requestedScopes);
      
//       const { error } = await supabase.auth.signInWithOAuth({
//         provider: "google",
//         options: {
//           redirectTo: `${window.location.origin}/auth/callback`, // or index.html
//           scopes: requestedScopes,
//           queryParams: {
//             access_type: "offline",
//             prompt: "consent",
//           },
//         },
//       });
//       if (error) throw error;

//       // Don’t parse tokens yourself here — Supabase will do it on redirect
//       return;
//     }

//     // 👉 Native (Expo) flow
//     const redirectUrl = AuthSession.makeRedirectUri({
//       scheme: 'embr',
//       path: 'auth/callback',
//     });
//     console.log("📍 Redirect URL generated:", redirectUrl);

//     const requestedScopes = [
//       "https://www.googleapis.com/auth/gmail.readonly",
//       "https://www.googleapis.com/auth/calendar",
//       "https://www.googleapis.com/auth/userinfo.email",
//       "https://www.googleapis.com/auth/userinfo.profile",
//       "https://www.googleapis.com/auth/drive",
//     ].join(" ");
    
//     console.log("🔍 Native: Requesting scopes:", requestedScopes);
    
//     const { data, error } = await supabase.auth.signInWithOAuth({
//       provider: "google",
//       options: {
//         redirectTo: redirectUrl,
//         scopes: requestedScopes,
//         queryParams: {
//           access_type: "offline",
//           prompt: "consent",
//         },
//       },
//     });
//     if (error) throw error;

//     console.log("🔗 Opening auth URL:", data.url);
//     const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    
//     console.log("🔄 Browser result:", result);
    
//     if (result.type !== "success") {
//       console.log("⚠️ Auth cancelled:", result.type);
//       return result;
//     }

//     console.log("✅ Auth success - parsing tokens from:", result.url);

//     // Parse tokens from URL - handle both hash and query params
//     let access_token, refresh_token, provider_token, provider_refresh_token;
    
//     try {
//       // Try hash first (most common for Supabase OAuth)
//       const hashPart = result.url.split("#")[1];
//       if (hashPart) {
//         const hashParams = new URLSearchParams(hashPart);
//         access_token = hashParams.get("access_token");
//         refresh_token = hashParams.get("refresh_token");
//         provider_token = hashParams.get("provider_token");
//         provider_refresh_token = hashParams.get("provider_refresh_token");
//       }
      
//       // Fallback to query params if no hash tokens
//       if (!access_token) {
//         const url = new URL(result.url);
//         access_token = url.searchParams.get("access_token");
//         refresh_token = url.searchParams.get("refresh_token");
//         provider_token = url.searchParams.get("provider_token");
//         provider_refresh_token = url.searchParams.get("provider_refresh_token");
//       }
      
//       console.log("🔑 Parsed tokens:", {
//         access_token: access_token ? "Yes" : "No",
//         refresh_token: refresh_token ? "Yes" : "No",
//         provider_token: provider_token ? "Yes" : "No",
//         provider_refresh_token: provider_refresh_token ? "Yes" : "No",
//       });

//     } catch (parseError) {
//       console.error("❌ Error parsing callback URL:", parseError);
//       throw new Error("Failed to parse authentication callback");
//     }

//     if (!access_token) {
//       console.error("❌ No access token found in callback URL:", result.url);
//       throw new Error("No access token received from OAuth callback");
//     }

//     // Set Supabase session
//     const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ 
//       access_token, 
//       refresh_token: refresh_token || '' 
//     });
    
//     if (sessionError) {
//       console.error("❌ Session error:", sessionError);
//       throw sessionError;
//     }

//     console.log("✅ Session created successfully for user:", sessionData?.user?.email);

//     // Save provider tokens if available
//     if (sessionData.session?.user && (provider_token || provider_refresh_token)) {
//       try {
//         await saveUserProfile(sessionData.session.user, {
//           providerToken: provider_token,
//           providerRefreshToken: provider_refresh_token,
//         });
//       } catch (profileError) {
//         console.warn("⚠️ Failed to save provider tokens:", profileError);
//       }
//     }

//     return { 
//       type: "success", 
//       session: sessionData.session,
//       provider_token,
//       provider_refresh_token 
//     };
//   } catch (err: any) {
//     console.error("💥 Sign in error:", err);
//     throw new Error(`Google Sign In failed: ${err.message}`);
//   }
// };

export const signOut = async () => {
  try {
    console.log('🚪 Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.error('💥 Sign out error:', error);
    throw error;
  }
};