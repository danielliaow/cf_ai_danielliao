import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export const testManualSession = async () => {
  try {
    console.log('🧪 Testing manual session creation...');

    // Test with dummy session (this will fail but show us how session handling works)
    const testSession = {
      access_token: 'test_token',
      refresh_token: 'test_refresh',
    };

    console.log('Attempting to set test session...');
    const { data, error } = await supabase.auth.setSession(testSession);
    
    console.log('Session set result:');
    console.log('Data:', data);
    console.log('Error:', error);

    // Check if session was set
    const { data: { session }, error: getError } = await supabase.auth.getSession();
    console.log('Retrieved session:', session ? 'Found' : 'None');
    console.log('Get error:', getError);

    return { success: !error, data, error };
  } catch (err) {
    console.error('Manual session test error:', err);
    return { success: false, error: err };
  }
};

export const testDirectAuth = async () => {
  try {
    console.log('🔑 Testing direct auth...');
    
    // This will test if we can reach Supabase auth endpoints
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
      },
    });

    console.log('Direct auth test:');
    console.log('Success:', !error);
    console.log('URL generated:', !!data?.url);
    console.log('Error:', error);

    if (data?.url) {
      Alert.alert('Auth URL Generated', 'OAuth URL was successfully generated!');
    } else {
      Alert.alert('Auth Failed', `Error: ${error?.message || 'Unknown error'}`);
    }

    return { success: !error, data, error };
  } catch (err) {
    console.error('Direct auth test error:', err);
    Alert.alert('Test Error', `Exception: ${err}`);
    return { success: false, error: err };
  }
};