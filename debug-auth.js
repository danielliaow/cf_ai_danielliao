// Debug script to test authentication
import { supabase } from './lib/supabase';

async function debugAuth() {
  console.log('=== Auth Debug ===');
  
  // Test 1: Check initial session
  const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
  console.log('Initial session:', initialSession ? 'Present' : 'None', sessionError);
  
  // Test 2: Check user
  if (initialSession) {
    console.log('User ID:', initialSession.user?.id);
    console.log('User email:', initialSession.user?.email);
    console.log('Provider:', initialSession.user?.app_metadata?.provider);
  }
  
  // Test 3: Auth state listener
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state change:', event);
    console.log('Session:', session ? 'Present' : 'None');
    if (session) {
      console.log('User:', session.user?.email);
    }
  });
}

debugAuth().catch(console.error);