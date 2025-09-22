import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export class AuthDebugger {
  static async fullDiagnostic() {
    console.log('\n=== 🔍 FULL AUTH DIAGNOSTIC ===\n');

    // Test 1: Environment Variables
    console.log('1️⃣ Environment Check:');
    console.log('SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('URL Value:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    
    // Test 2: Supabase Client Connection
    console.log('\n2️⃣ Supabase Connection:');
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Connection:', error ? '❌ Failed' : '✅ Success');
      console.log('Initial Session:', data.session ? '✅ Found' : '❌ None');
      if (error) console.log('Error:', error);
    } catch (err) {
      console.log('Connection: ❌ Exception -', err);
    }

    // Test 3: AsyncStorage
    console.log('\n3️⃣ AsyncStorage Check:');
    try {
      await AsyncStorage.setItem('test_key', 'test_value');
      const value = await AsyncStorage.getItem('test_key');
      console.log('AsyncStorage:', value === 'test_value' ? '✅ Working' : '❌ Failed');
      await AsyncStorage.removeItem('test_key');
    } catch (err) {
      console.log('AsyncStorage: ❌ Error -', err);
    }

    // Test 4: Supabase Storage Keys
    console.log('\n4️⃣ Supabase Storage Keys:');
    try {
      const keys = await AsyncStorage.getAllKeys();
      const supabaseKeys = keys.filter(key => key.includes('supabase'));
      console.log('Supabase Keys Found:', supabaseKeys.length);
      supabaseKeys.forEach(key => console.log('  -', key));
      
      // Check specific auth keys
      const authKey = `sb-${process.env.EXPO_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
      const authData = await AsyncStorage.getItem(authKey);
      console.log('Auth Token Stored:', authData ? '✅ Yes' : '❌ None');
    } catch (err) {
      console.log('Storage Keys: ❌ Error -', err);
    }

    // Test 5: Auth State
    console.log('\n5️⃣ Current Auth State:');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        console.log('User ID:', session.user.id);
        console.log('Email:', session.user.email);
        console.log('Provider:', session.user.app_metadata?.provider);
        console.log('Token Expires:', new Date(session.expires_at! * 1000).toISOString());
        console.log('Access Token:', session.access_token?.substring(0, 20) + '...');
      } else {
        console.log('Session: ❌ None');
      }
    } catch (err) {
      console.log('Auth State: ❌ Error -', err);
    }

    console.log('\n=== 🏁 DIAGNOSTIC COMPLETE ===\n');
  }

  static async clearAllAuth() {
    console.log('🧹 Clearing all auth data...');
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear AsyncStorage auth keys
      const keys = await AsyncStorage.getAllKeys();
      const supabaseKeys = keys.filter(key => key.includes('supabase'));
      await AsyncStorage.multiRemove(supabaseKeys);
      
      console.log('✅ Auth data cleared');
    } catch (err) {
      console.log('❌ Error clearing auth:', err);
    }
  }

  static async testOAuthURL() {
    console.log('\n=== 🔗 OAuth URL Test ===');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://auth.expo.io/@your-username/supabaseauthapp',
        },
      });

      console.log('OAuth URL Generation:');
      console.log('Success:', !error ? '✅' : '❌');
      console.log('URL:', data?.url);
      console.log('Error:', error);
      
      return data?.url;
    } catch (err) {
      console.log('❌ OAuth URL Error:', err);
      return null;
    }
  }
}