import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

export default function TestAuth() {
  const { colors } = useTheme();
  const [authUrl, setAuthUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const generateDirectAuthUrl = () => {
    const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    const REDIRECT_URI = `${window.location.origin}/auth/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: CLIENT_ID || '',
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'select_account consent',
      include_granted_scopes: 'false',
      state: 'test_auth_flow'
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    setAuthUrl(url);
    return url;
  };

  const testDirectAuth = async () => {
    try {
      setLoading(true);
      const url = generateDirectAuthUrl();
      
      console.log('🔗 Generated Direct Auth URL:', url);
      console.log('🔍 URL Parameters:', {
        client_id: url.includes('client_id='),
        redirect_uri: url.includes('redirect_uri='),
        scope: url.includes('scope='),
        access_type: url.includes('access_type=offline'),
        prompt: url.includes('prompt=select_account%20consent'),
        include_granted_scopes: url.includes('include_granted_scopes=false')
      });

      // Show alert with URL details
      Alert.alert(
        'Direct Auth URL Generated',
        `This URL will show all requested scopes.\n\nScopes included:\n• Gmail (read-only)\n• Calendar (full access)\n• User profile & email\n• Google Drive (full access)\n• Drive files (app-created)\n\nClick "Open" to test`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Copy URL', 
            onPress: () => {
              // For web, we can't copy to clipboard easily, so show the URL
              Alert.alert('Auth URL', url);
            }
          },
          { 
            text: 'Open', 
            onPress: () => {
              if (typeof window !== 'undefined') {
                window.open(url, '_blank');
              } else {
                Linking.openURL(url);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error generating auth URL:', error);
      Alert.alert('Error', `Failed to generate auth URL: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    header: {
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    scopeSection: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
    scopeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      padding: 15,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    scopeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    scopeText: {
      flex: 1,
    },
    scopeTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    scopeDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    urlSection: {
      marginBottom: 30,
    },
    urlContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
    },
    urlText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      lineHeight: 16,
    },
    testButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
    },
    testButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    note: {
      backgroundColor: colors.warning + '20',
      padding: 15,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    },
    noteText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });

  const scopes = [
    {
      icon: '📧',
      title: 'Gmail Access',
      description: 'Read your emails to provide intelligent summaries and quick responses',
      scope: 'gmail.readonly'
    },
    {
      icon: '📅',
      title: 'Calendar Access',
      description: 'Manage your schedule, create events, and provide calendar insights',
      scope: 'calendar'
    },
    {
      icon: '👤',
      title: 'Profile Information',
      description: 'Access your basic profile information and email address',
      scope: 'userinfo.email + userinfo.profile'
    },
    {
      icon: '💾',
      title: 'Google Drive',
      description: 'Access and manage your Google Drive files for document processing',
      scope: 'drive + drive.file'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Direct OAuth Test</Text>
          <Text style={styles.subtitle}>
            Test the direct Google OAuth flow to verify that all requested scopes are properly displayed in the consent screen.
          </Text>
        </View>

        <View style={styles.scopeSection}>
          <Text style={styles.sectionTitle}>Requested Scopes</Text>
          {scopes.map((scope, index) => (
            <View key={index} style={styles.scopeItem}>
              <View style={styles.scopeIcon}>
                <Text style={{ fontSize: 20 }}>{scope.icon}</Text>
              </View>
              <View style={styles.scopeText}>
                <Text style={styles.scopeTitle}>{scope.title}</Text>
                <Text style={styles.scopeDescription}>{scope.description}</Text>
                <Text style={[styles.scopeDescription, { fontStyle: 'italic', marginTop: 4 }]}>
                  Scope: {scope.scope}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {authUrl && (
          <View style={styles.urlSection}>
            <Text style={styles.sectionTitle}>Generated Auth URL</Text>
            <View style={styles.urlContainer}>
              <Text style={styles.urlText}>{authUrl}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.testButton, loading && styles.buttonDisabled]}
          onPress={testDirectAuth}
          disabled={loading}
        >
          <Text style={styles.testButtonText}>
            {loading ? 'Generating...' : 'Test Direct OAuth Flow'}
          </Text>
        </TouchableOpacity>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            <Text style={{ fontWeight: '600' }}>Note:</Text> This direct OAuth flow bypasses Supabase and goes directly to Google's OAuth endpoint. 
            You should see ALL the scopes listed above in the Google consent screen. 
            If scopes are missing, it indicates an issue with the OAuth configuration.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}