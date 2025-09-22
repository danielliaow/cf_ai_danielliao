import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { router } from 'expo-router';

export default function PrivacyPolicy() {
  const { colors, isDark } = useTheme();

  const openEmail = () => {
    Linking.openURL('mailto:privacy@embr.app');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    lastUpdated: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 30,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
    paragraph: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 15,
    },
    scopeCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 15,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    scopeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    scopeIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    scopeTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    scopeDescription: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 10,
    },
    purposeTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
    },
    purposeList: {
      marginLeft: 15,
    },
    purposeItem: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 4,
    },
    highlightBox: {
      backgroundColor: colors.primary + '15',
      borderRadius: 12,
      padding: 20,
      marginVertical: 20,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    highlightTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 10,
    },
    highlightText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    contactButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    contactButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    bullet: {
      color: colors.primary,
      fontSize: 16,
      marginRight: 10,
      marginTop: 2,
    },
    listText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
  });

  const scopes = [
    {
      icon: '📧',
      title: 'Gmail Access (Read-Only)',
      permission: 'gmail.readonly',
      description: 'We request read-only access to your Gmail to provide intelligent email management and AI-powered assistance.',
      purposes: [
        'Generate smart email summaries and insights',
        'Provide quick email response suggestions',
        'Help organize and prioritize your inbox',
        'Extract important information and deadlines',
        'Enable voice commands for email management'
      ]
    },
    {
      icon: '📅',
      title: 'Google Calendar Access',
      permission: 'calendar',
      description: 'We access your Google Calendar to provide comprehensive schedule management and intelligent calendar assistance.',
      purposes: [
        'Create, view, and manage calendar events',
        'Provide scheduling suggestions and conflict resolution',
        'Send smart meeting reminders and preparations',
        'Integrate calendar data with AI conversations',
        'Enable voice commands for calendar management'
      ]
    },
    {
      icon: '👤',
      title: 'Profile Information',
      permission: 'userinfo.email + userinfo.profile',
      description: 'We access your basic Google profile information to personalize your experience and enable account features.',
      purposes: [
        'Display your name and profile picture in the app',
        'Personalize AI responses and recommendations',
        'Enable account identification and security',
        'Customize app settings and preferences',
        'Provide user-specific data organization'
      ]
    },
    {
      icon: '💾',
      title: 'Google Drive Access',
      permission: 'drive + drive.file',
      description: 'We access your Google Drive to enable document processing, file management, and intelligent content analysis.',
      purposes: [
        'Process and analyze documents for AI assistance',
        'Create and save AI-generated content',
        'Provide file organization and management',
        'Enable document collaboration features',
        'Backup and sync app-generated files'
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>🔒 Your Privacy Matters</Text>
          <Text style={styles.highlightText}>
            Embr is designed with privacy at its core. We only request the minimum permissions necessary to provide you with an exceptional AI assistant experience. 
            Your data is never sold, never shared with third parties for advertising, and always remains under your control.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Access and Why</Text>
          <Text style={styles.paragraph}>
            Embr requests specific Google permissions to provide you with intelligent AI assistance. Each permission serves a clear purpose in enhancing your productivity and experience.
          </Text>
          
          {scopes.map((scope, index) => (
            <View key={index} style={styles.scopeCard}>
              <View style={styles.scopeHeader}>
                <Text style={styles.scopeIcon}>{scope.icon}</Text>
                <Text style={styles.scopeTitle}>{scope.title}</Text>
              </View>
              <Text style={styles.scopeDescription}>{scope.description}</Text>
              <Text style={styles.purposeTitle}>What we use this for:</Text>
              <View style={styles.purposeList}>
                {scope.purposes.map((purpose, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.listText}>{purpose}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Protect Your Data</Text>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>🔐</Text>
            <Text style={styles.listText}>All data is encrypted in transit and at rest using industry-standard encryption</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>🏠</Text>
            <Text style={styles.listText}>Your data is processed locally and securely in the cloud, never shared with third parties</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>🔑</Text>
            <Text style={styles.listText}>You maintain full control and can revoke access at any time through your Google Account settings</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>⏰</Text>
            <Text style={styles.listText}>We only access your data when you actively use features that require it</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>🗑️</Text>
            <Text style={styles.listText}>Data is automatically purged when no longer needed for the service</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We DON'T Do</Text>
          <Text style={styles.paragraph}>
            Embr is committed to ethical data use. We explicitly do NOT:
          </Text>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>❌</Text>
            <Text style={styles.listText}>Sell your personal data to third parties</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>❌</Text>
            <Text style={styles.listText}>Use your data for advertising or marketing by third parties</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>❌</Text>
            <Text style={styles.listText}>Access your data when you're not actively using the app</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>❌</Text>
            <Text style={styles.listText}>Store unnecessary personal information beyond what's required for functionality</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>❌</Text>
            <Text style={styles.listText}>Share your data with AI training companies without your explicit consent</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights and Control</Text>
          <Text style={styles.paragraph}>
            You have complete control over your data:
          </Text>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>✅</Text>
            <Text style={styles.listText}>View and download all data we have about you</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>✅</Text>
            <Text style={styles.listText}>Request deletion of your data at any time</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>✅</Text>
            <Text style={styles.listText}>Revoke Google permissions through your Google Account settings</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>✅</Text>
            <Text style={styles.listText}>Use selective permissions (you can choose which Google services to connect)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your data only as long as necessary to provide our services:
          </Text>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>📱</Text>
            <Text style={styles.listText}>App usage data: Retained while you use the service</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>🔄</Text>
            <Text style={styles.listText}>Cached email/calendar data: Automatically purged after 30 days</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>👤</Text>
            <Text style={styles.listText}>Profile information: Retained until you delete your account</Text>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.bullet}>💬</Text>
            <Text style={styles.listText}>Conversation history: You control retention settings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google's Limited Use Policy</Text>
          <Text style={styles.paragraph}>
            Embr's use and transfer of information received from Google APIs adheres to the{' '}
            <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
              Google API Services User Data Policy
            </Text>, including the Limited Use requirements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the new privacy policy in the app and updating the "Last updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this privacy policy or how we handle your data, please don't hesitate to contact us.
          </Text>
          
          <TouchableOpacity style={styles.contactButton} onPress={openEmail}>
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Privacy Team</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}