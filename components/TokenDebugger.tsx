import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { saveTokensFromSession, getUserTokens, saveUserTokens } from '../services/tokenService';

export default function TokenDebugger() {
  const { colors } = useTheme();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginVertical: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    infoContainer: {
      backgroundColor: colors.background,
      padding: 15,
      borderRadius: 8,
      marginTop: 15,
    },
    infoText: {
      fontSize: 12,
      color: colors.text,
      fontFamily: 'monospace',
      lineHeight: 16,
    },
    errorText: {
      color: colors.error || '#ff4444',
      fontSize: 12,
      marginTop: 5,
    },
    successText: {
      color: colors.success || '#44ff44',
      fontSize: 12,
      marginTop: 5,
    },
  });

  const saveSessionTokens = async () => {
    if (!session) {
      Alert.alert('Error', 'No session available');
      return;
    }

    setLoading(true);
    try {
      const result = await saveTokensFromSession(session);
      if (result.success) {
        Alert.alert('Success', 'Tokens saved from session!');
        setTokenInfo(result.data);
      } else {
        Alert.alert('Error', `Failed to save tokens: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error}`);
    }
    setLoading(false);
  };

  const saveManualTokens = async () => {
    if (!user) {
      Alert.alert('Error', 'No user available');
      return;
    }

    setLoading(true);
    try {
      // Try to save with minimal data - just to get something in the database
      const result = await saveUserTokens(user, {
        providerToken: `manual_token_${Date.now()}`,
        providerRefreshToken: null,
      });
      
      if (result.success) {
        Alert.alert('Success', 'Manual tokens saved!');
        setTokenInfo(result.data);
      } else {
        Alert.alert('Error', `Failed to save manual tokens: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error}`);
    }
    setLoading(false);
  };

  const checkExistingTokens = async () => {
    if (!user) {
      Alert.alert('Error', 'No user available');
      return;
    }

    setLoading(true);
    try {
      const result = await getUserTokens(user.id);
      if (result.success) {
        Alert.alert('Success', 'Tokens found in database!');
        setTokenInfo(result.data);
      } else {
        Alert.alert('Not Found', 'No tokens found in database');
        setTokenInfo(null);
      }
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error}`);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Token Debugger</Text>
        <Text style={styles.errorText}>No user logged in</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Token Debugger</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={saveSessionTokens}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Save Tokens from Session'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={saveManualTokens}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Saving...' : 'Save Manual Test Tokens'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={checkExistingTokens}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Checking...' : 'Check Existing Tokens'}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          User ID: {user.id}
          {'\n'}Email: {user.email}
          {'\n'}Session exists: {session ? 'Yes' : 'No'}
          {'\n'}Provider token in session: {session?.provider_token ? 'Yes' : 'No'}
          {'\n'}Provider refresh token in session: {session?.provider_refresh_token ? 'Yes' : 'No'}
        </Text>

        {tokenInfo && (
          <View style={{ marginTop: 15 }}>
            <Text style={styles.successText}>✅ Token Data Found:</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={styles.infoText}>
                {JSON.stringify(tokenInfo, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}