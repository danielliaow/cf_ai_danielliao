// // app/auth/callback.tsx
// import { useEffect } from "react";
// import { useRouter } from "expo-router";
// import { supabase } from "../../lib/supabase";

// export default function AuthCallback() {
//   const router = useRouter();

//   useEffect(() => {
//     async function finishAuth() {
//       const { data: { session } } = await supabase.auth.getSession();
//       if (session) {
//         console.log("✅ Login success:", session.user.email);
//         router.replace("/"); // go to home
//       } else {
//         console.log("⚠️ No session found");
//         router.replace("/signin");
//       }
//     }
//     finishAuth();
//   }, []);

//   return null; // no UI needed
// }

// import { useEffect } from "react";
// import { useRouter } from "expo-router";
// import { supabase } from "../../lib/supabase";
// import { Platform } from "react-native";

// export default function AuthCallback() {
//   const router = useRouter();

//   useEffect(() => {
//     async function handleAuthCallback() {
//       try {
//         if (Platform.OS === "web") {
//           // 👉 For web: Check if there are auth tokens in the URL
//           const hashParams = new URLSearchParams(window.location.hash.substring(1));
//           const searchParams = new URLSearchParams(window.location.search);

//           // Check for auth tokens in URL hash or search params
//           const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
//           const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
//           const error = hashParams.get('error') || searchParams.get('error');

//           if (error) {
//             console.error("❌ Auth callback error:", error);
//             router.replace("/signin?error=auth_failed");
//             return;
//           }

//           if (accessToken && refreshToken) {
//             // Set the session with the tokens from URL
//             const { data, error: sessionError } = await supabase.auth.setSession({
//               access_token: accessToken,
//               refresh_token: refreshToken,
//             });

//             if (sessionError) {
//               console.error("❌ Session error:", sessionError);
//               router.replace("/signin?error=session_failed");
//               return;
//             }

//             if (data.session) {
//               console.log("✅ Login success:", data.session.user.email);
//               // Clear the URL hash/search params
//               window.history.replaceState({}, document.title, window.location.pathname);
//               router.replace("/");
//               return;
//             }
//           }
//         }
//         else{
//           const { data: { session } } = await supabase.auth.getSession();
        
//           if (session) {
//             console.log("✅ Native auth success:", session.user.email);
//             router.replace("/");
//           } else {
//             console.log("⚠️ No session found in native callback");
//             router.replace("/signin");
//           }
//           return;
//         }

//         // 👉 Fallback: Check if session already exists
//         const { data: { session }, error } = await supabase.auth.getSession();

//         if (error) {
//           console.error("❌ Get session error:", error);
//           router.replace("/signin?error=session_error");
//           return;
//         }

//         if (session) {
//           console.log("✅ Session found:", session.user.email);
//           router.replace("/");
//         } else {
//           console.log("⚠️ No session found, redirecting to sign in");
//           router.replace("/signin");
//         }
//       } catch (error) {
//         console.error("💥 Callback processing error:", error);
//         router.replace("/signin?error=callback_failed");
//       }
//     }

//     handleAuthCallback();
//   }, [router]);

//   return (
//     <div style={{ padding: 20, textAlign: 'center' }}>
//       <p>Completing authentication...</p>
//     </div>
//   );
// }

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Platform } from "react-native";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        if (Platform.OS === "web") {
          // 👉 For web: Check if there are auth tokens in the URL
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const searchParams = new URLSearchParams(window.location.search);
          console.log("hashParams:", hashParams.toString(),'kjhgfdsfbgnm');
          // Extract all tokens from URL
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
          const providerToken = hashParams.get('provider_token') || searchParams.get('provider_token');
          const providerRefreshToken = hashParams.get('provider_refresh_token') || searchParams.get('provider_refresh_token');
          const error = hashParams.get('error') || searchParams.get('error');

          console.log("🔍 Extracted tokens from URL:", {
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
            providerToken: !!providerToken,
            providerRefreshToken: !!providerRefreshToken,
            error: error
          });

          if (error) {
            console.error("❌ Auth callback error:", error);
            router.replace("/signin?error=auth_failed");
            return;
          }

          if (accessToken && refreshToken) {
            // Set the session with the tokens from URL
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error("❌ Session error:", sessionError);
              router.replace("/signin?error=session_failed");
              return;
            }

            if (data.session?.user) {
              console.log("✅ Session created for:", data.session.user.email);
              
              // 🔑 Save provider tokens if available
              if (providerToken || providerRefreshToken) {
                try {
                  console.log("💾 Saving provider tokens...");
                  await saveUserProfile(data.session.user, {
                    providerToken: providerToken,
                    providerRefreshToken: providerRefreshToken,
                  });
                  console.log("✅ Provider tokens saved successfully");
                } catch (profileError) {
                  console.error("⚠️ Failed to save provider tokens:", profileError);
                  // Don't fail the auth flow, just log the error
                }
              } else {
                console.warn("⚠️ No provider tokens found in callback URL");
              }

              // Clear the URL hash/search params
              window.history.replaceState({}, document.title, window.location.pathname);
              router.replace("/");
              return;
            }
          }
        } else {
          // 👉 Native flow: Check for existing session
          const { data: { session } } = await supabase.auth.getSession();
        
          if (session) {
            console.log("✅ Native auth success:", session.user.email);
            
            // For native, provider tokens should already be saved in the sign-in function
            // But we can add additional logic here if needed
            router.replace("/");
          } else {
            console.log("⚠️ No session found in native callback");
            router.replace("/signin");
          }
          return;
        }

        // 👉 Fallback: Check if session already exists
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ Get session error:", error);
          router.replace("/signin?error=session_error");
          return;
        }

        if (session) {
          console.log("✅ Session found:", session.user.email);
          router.replace("/");
        } else {
          console.log("⚠️ No session found, redirecting to sign in");
          router.replace("/signin");
        }
      } catch (error) {
        console.error("💥 Callback processing error:", error);
        router.replace("/signin?error=callback_failed");
      }
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <p>Completing authentication...</p>
      <p>Please wait while we finalize your login...</p>
    </div>
  );
}

// Helper function - make sure this is available or import it
async function saveUserProfile(user, tokens) {
  // Your existing saveUserProfile implementation
  // Example structure:
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      email: user.email,
      provider_token: tokens.providerToken,
      provider_refresh_token: tokens.providerRefreshToken,
      updated_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to save user profile: ${error.message}`);
  }
}