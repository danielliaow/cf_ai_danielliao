import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Profile() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },
    profileHeader: {
      alignItems: 'center',
      marginBottom: 32,
      paddingVertical: 20,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 16,
      borderWidth: 4,
      borderColor: colors.primary,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 4,
      borderColor: colors.primary,
    },
    avatarText: {
      color: '#fff',
      fontSize: 36,
      fontWeight: '800',
    },
    name: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    email: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    detailsSection: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    detailItem: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailIcon: {
      marginRight: 12,
      width: 24,
      alignItems: 'center',
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
      lineHeight: 22,
    },
  });

  const getDetailIcon = (label: string) => {
    const iconMap: { [key: string]: string } = {
      'Full Name': 'person',
      'Email': 'mail',
      'Email Verified': 'shield-checkmark',
      'Provider': 'logo-google',
      'Account Created': 'calendar',
      'Last Sign In': 'time',
    };
    return iconMap[label] || 'information-circle';
  };

  const profileDetails = [
    {
      label: 'Full Name',
      value: user?.user_metadata?.full_name || user?.user_metadata?.name || 'Not provided'
    },
    {
      label: 'Email',
      value: user?.email || 'Not provided'
    },
    {
      label: 'Email Verified',
      value: user?.email_confirmed_at ? '✅ Verified' : '❌ Not verified'
    },
    {
      label: 'Provider',
      value: user?.app_metadata?.provider || 'Unknown'
    },
    {
      label: 'Account Created',
      value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'
    },
    {
      label: 'Last Sign In',
      value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Unknown'
    }
  ];

  return (
    <LinearGradient colors={colors.gradientBackground} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={colors.gradientPrimary}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <Text style={styles.name}>
              {user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          {/* Profile Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>🔥 Profile Details</Text>
            
            {profileDetails.map((detail, index) => (
              <View key={index} style={styles.detailItem}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons 
                      name={getDetailIcon(detail.label) as any} 
                      size={20} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}