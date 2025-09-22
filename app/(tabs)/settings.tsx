import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { router } from 'expo-router';
import { UserPreferencesService } from '../../services/userPreferencesService';
import { UserPersonalizationData } from '../../types/userPreferences';
import { AppModeService, AppMode, AppModePreferences } from '../../services/appModeService';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { colors, toggleTheme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPersonalizationData | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [appModePreferences, setAppModePreferences] = useState<AppModePreferences | null>(null);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'gpt-4'>('gemini');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    loadUserPreferences();
    loadAppModePreferences();
    loadModelPreference();
  }, []);

  const loadModelPreference = async () => {
    try {
      const result = await UserPreferencesService.getUserPreferences();
      if (result.success && result.preferences?.assistantBehavior?.preferred_model) {
        setSelectedModel(result.preferences.assistantBehavior.preferred_model);
      }
    } catch (error) {
      console.error('Error loading model preference:', error);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const result = await UserPreferencesService.getUserPreferences();
      if (result.success) {
        setUserPreferences(result.preferences);
        setOnboardingCompleted(result.onboarding_completed);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadAppModePreferences = async () => {
    try {
      const prefs = await AppModeService.getAppModePreferences();
      setAppModePreferences(prefs);
    } catch (error) {
      console.error('Error loading app mode preferences:', error);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    // AuthContext will handle the redirect automatically
  };

  const handleEditPreferences = () => {
    router.push('/preferences-edit');
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Personalization',
      'This will reset your personalization settings and show the onboarding flow again. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await UserPreferencesService.resetPreferences();
              if (result.success) {
                Alert.alert('Success', 'Personalization settings have been reset');
                await loadUserPreferences();
              } else {
                Alert.alert('Error', result.error || 'Failed to reset preferences');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reset preferences');
            }
          }
        }
      ]
    );
  };

  const handleModeChange = async (newMode: AppMode) => {
    try {
      await AppModeService.setDefaultMode(newMode);
      await loadAppModePreferences();
      
      const modeLabel = newMode === 'speech' ? 'Speech' : 'Typing';
      alert(
      
        `Default mode set to ${modeLabel}. ${newMode === 'speech' ? 'Voice mode will be preferred when starting the app.' : 'Text input will be the default interface.'}`
      );
    } catch (error) {
      console.error('❌ Error changing mode:', error);
      Alert.alert('Error', 'Failed to change app mode');
    }
  };

  const handleAutoStartChange = async (enabled: boolean) => {
    try {
      await AppModeService.setAutoStartSpeech(enabled);
      await loadAppModePreferences();
    } catch (error) {
      console.error('❌ Error changing auto-start setting:', error);
      Alert.alert('Error', 'Failed to change auto-start setting');
    }
  };

  const handleModelChange = async (newModel: 'gemini' | 'gpt-4') => {
    try {
      const result = await UserPreferencesService.getUserPreferences();
      if (result.success) {
        const updatedPreferences = {
          ...result.preferences,
          assistantBehavior: {
            ...result.preferences.assistantBehavior,
            preferred_model: newModel
          }
        };
        
        const updateResult = await UserPreferencesService.updateUserPreferences(updatedPreferences);
        if (updateResult.success) {
          setSelectedModel(newModel);
          setShowModelDropdown(false);
        } else {
          Alert.alert('Error', updateResult.error || 'Failed to update model preference');
        }
      }
    } catch (error) {
      console.error('❌ Error changing model:', error);
      Alert.alert('Error', 'Failed to change AI model');
    }
  };

  const settingsItems = [
    {
      title: '🎯 Personalization',
      items: [
        {
          title: 'Edit Preferences',
          subtitle: onboardingCompleted ? 'Customize your AI experience' : 'Complete onboarding first',
          icon: 'person-circle',
          onPress: onboardingCompleted ? handleEditPreferences : () => Alert.alert('Onboarding Required', 'Please complete the onboarding flow first to access personalization settings.'),
          disabled: !onboardingCompleted,
          gradient: onboardingCompleted,
        },
        {
          title: 'Communication Style',
          subtitle: userPreferences?.communicationStyle ? 
            `${userPreferences.communicationStyle.tone?.charAt(0).toUpperCase() + userPreferences.communicationStyle.tone?.slice(1)} tone` : 
            'Not set',
          icon: 'chatbubbles',
          onPress: () => {},
          info: true,
        },
        {
          title: 'Religion',
          subtitle: userPreferences?.personalInfo?.religion ? 
            userPreferences.personalInfo.religion.charAt(0).toUpperCase() + userPreferences.personalInfo.religion.slice(1) : 
            'Not set',
          icon: 'library',
          onPress: () => {},
          info: true,
        },
        {
          title: 'Hobbies',
          subtitle: userPreferences?.personalInfo?.hobbies && userPreferences.personalInfo.hobbies.length > 0 ? 
            `${userPreferences.personalInfo.hobbies.length} selected` : 
            'Not set',
          icon: 'game-controller',
          onPress: () => {},
          info: true,
        },
        {
          title: 'Interests',
          subtitle: userPreferences?.contentPreferences?.interests && userPreferences.contentPreferences.interests.length > 0 ? 
            `${userPreferences.contentPreferences.interests.length} selected` : 
            'Not set',
          icon: 'newspaper',
          onPress: () => {},
          info: true,
        },
        {
          title: 'Reset Personalization',
          icon: 'refresh',
          onPress: handleResetOnboarding,
          disabled: !onboardingCompleted,
        },
      ],
    },
    {
      title: '🔥 Embr Settings',
      items: [
        {
          title: 'AI Model',
          subtitle: selectedModel === 'gpt-4' ? 'GPT-4 (OpenAI)' : 'Gemini (Google)',
          icon: 'brain',
          onPress: () => setShowModelDropdown(true),
          gradient: selectedModel === 'gpt-4',
        },
        {
          title: 'Auto-start Voice Mode',
          subtitle: 'Automatically enable voice mode when opening the app',
          icon: 'mic-outline',
          onPress: () => {
            if (!appModePreferences) return;
            handleAutoStartChange(!appModePreferences.autoStartSpeech);
          },
          hasToggle: true,
          toggleValue: appModePreferences?.autoStartSpeech || false,
        },
        {
          title: 'Dark Mode',
          icon: isDark ? 'moon' : 'sunny',
          onPress: toggleTheme,
          hasToggle: true,
          toggleValue: isDark,
          gradient: true,
        },
        {
          title: 'Notifications',
          icon: 'notifications',
          onPress: () => Alert.alert('Coming Soon', 'Notification settings coming soon!'),
        },
      ],
    },
    {
      title: '👤 Account',
      items: [
        {
          title: 'Edit Profile',
          icon: 'person',
          onPress: () => Alert.alert('Coming Soon', 'Profile editing feature coming soon!'),
        },
        {
          title: 'Privacy Settings',
          icon: 'shield-checkmark',
          onPress: () => Alert.alert('Coming Soon', 'Privacy settings coming soon!'),
        },
      ],
    },
    {
      title: '🛠 Support',
      items: [
        {
          title: 'Help Center',
          icon: 'help-circle',
          onPress: () => Alert.alert('Coming Soon', 'Help center coming soon!'),
        },
        {
          title: 'Contact Us',
          icon: 'mail',
          onPress: () => Alert.alert('Coming Soon', 'Contact form coming soon!'),
        },
        {
          title: 'About Embr',
          icon: 'flame',
          onPress: () => Alert.alert('About Embr', '🔥 Your AI Assistant with Fire\nVersion 1.0.0'),
        },
      ],
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
      paddingVertical: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    settingItem: {
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
      marginBottom: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingItemGradient: {
      borderRadius: 16,
      marginBottom: 8,
    },
    settingItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingItemText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
      fontWeight: '500',
      flex: 1,
    },
    settingItemSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 12,
      marginTop: 2,
      flex: 1,
    },
    settingItemTextContainer: {
      flex: 1,
      marginLeft: 12,
    },
    disabledItem: {
      opacity: 0.5,
    },
    signOutButton: {
      borderColor: colors.error,
      backgroundColor: colors.surface,
    },
    signOutText: {
      color: colors.error,
    },
    userInfo: {
      alignItems: 'center',
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    userInfoText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    toggle: {
      transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '80%',
      maxWidth: 300,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    modelOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedModelOption: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight + '20',
    },
    modelOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    modelOptionSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.border,
      alignItems: 'center',
    },
    closeButtonText: {
      color: colors.text,
      fontWeight: '500',
    },
  });

  const renderSettingItem = (item: any, itemIndex: number) => {
    if (item.hasToggle) {
      return (
        <LinearGradient
          key={itemIndex}
          colors={item.gradient ? colors.gradientPrimary : [colors.surface, colors.surface]}
          style={styles.settingItemGradient}
        >
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: 'transparent', borderWidth: 0 }]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.settingItemContent}>
              {item.customIcon ? (
                <MaterialIcons name={item.icon as any} size={22} color={item.gradient ? '#fff' : colors.primary} />
              ) : (
                <Ionicons name={item.icon as any} size={22} color={item.gradient ? '#fff' : colors.primary} />
              )}
              <Text style={[styles.settingItemText, { color: item.gradient ? '#fff' : colors.text }]}>
                {item.title}
              </Text>
            </View>
            <Switch
              value={item.toggleValue}
              onValueChange={item.onPress}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={item.toggleValue ? colors.accent : colors.textSecondary}
              style={styles.toggle}
            />
          </TouchableOpacity>
        </LinearGradient>
      );
    }

    const isGradientItem = item.gradient && !item.disabled;
    const containerStyle = [
      styles.settingItem,
      item.disabled && styles.disabledItem,
      isGradientItem && { backgroundColor: 'transparent', borderWidth: 0 }
    ];

    const ItemContent = (
      <TouchableOpacity
        style={containerStyle}
        onPress={item.disabled ? undefined : item.onPress}
        activeOpacity={item.disabled ? 1 : 0.7}
        disabled={item.disabled}
      >
        <View style={styles.settingItemContent}>
          {item.customIcon ? (
            <MaterialIcons 
              name={item.icon as any} 
              size={22} 
              color={isGradientItem ? '#fff' : item.disabled ? colors.textSecondary : colors.primary} 
            />
          ) : (
            <Ionicons 
              name={item.icon as any} 
              size={22} 
              color={isGradientItem ? '#fff' : item.disabled ? colors.textSecondary : colors.primary} 
            />
          )}
          <View style={styles.settingItemTextContainer}>
            <Text style={[
              styles.settingItemText, 
              { 
                color: isGradientItem ? '#fff' : item.disabled ? colors.textSecondary : colors.text,
                marginLeft: 0 
              }
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={[
                styles.settingItemSubtitle, 
                { 
                  color: isGradientItem ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
                  marginLeft: 0 
                }
              ]}>
                {item.subtitle}
              </Text>
            )}
          </View>
        </View>
        {!item.info && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={isGradientItem ? 'rgba(255,255,255,0.8)' : colors.textSecondary} 
          />
        )}
      </TouchableOpacity>
    );

    if (isGradientItem) {
      return (
        <LinearGradient
          key={itemIndex}
          colors={colors.gradientPrimary}
          style={styles.settingItemGradient}
        >
          {ItemContent}
        </LinearGradient>
      );
    }

    return (
      <View key={itemIndex}>
        {ItemContent}
      </View>
    );
  };

  return (
    <LinearGradient colors={colors.gradientBackground} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🔥 Embr Settings</Text>
            <Text style={styles.headerSubtitle}>Customize your AI assistant experience</Text>
          </View>

          {/* Settings Sections */}
          {settingsItems.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          ))}

          {/* Sign Out */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.settingItem, styles.signOutButton]}
              onPress={handleSignOut}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemContent}>
                <Ionicons name="log-out" size={22} color={colors.error} />
                <Text style={[styles.settingItemText, styles.signOutText]}>
                  {loading ? 'Signing out...' : 'Sign Out'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>
              Signed in as {user?.email}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* AI Model Selection Modal */}
      <Modal
        visible={showModelDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModelDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModelDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select AI Model</Text>
            
            <TouchableOpacity
              style={[
                styles.modelOption,
                selectedModel === 'gemini' && styles.selectedModelOption
              ]}
              onPress={() => handleModelChange('gemini')}
            >
              <View>
                <Text style={styles.modelOptionText}>🤖 Gemini</Text>
                <Text style={styles.modelOptionSubtext}>Google's AI model</Text>
              </View>
              {selectedModel === 'gemini' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modelOption,
                selectedModel === 'gpt-4' && styles.selectedModelOption
              ]}
              onPress={() => handleModelChange('gpt-4')}
            >
              <View>
                <Text style={styles.modelOptionText}>🧠 GPT-4</Text>
                <Text style={styles.modelOptionSubtext}>OpenAI's advanced model</Text>
              </View>
              {selectedModel === 'gpt-4' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModelDropdown(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}