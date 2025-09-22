import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { AppModeService, AppMode, AppModePreferences } from '../services/appModeService';
import { useTheme } from '../contexts/ThemeContext';

interface AppModeSettingsProps {
  currentMode?: AppMode;
  onModeChange?: (mode: AppMode) => void;
  onAutoStartChange?: (enabled: boolean) => void;
}

export function AppModeSettings({ 
  currentMode = 'typing', 
  onModeChange,
  onAutoStartChange 
}: AppModeSettingsProps) {
  const { colors } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<AppModePreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    modeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      marginHorizontal: 2,
    },
    modeButtonActive: {
      backgroundColor: colors.primary,
    },
    modeButtonInactive: {
      backgroundColor: 'transparent',
    },
    modeText: {
      marginLeft: 6,
      fontSize: 12,
      fontWeight: '600',
    },
    modeTextActive: {
      color: colors.background,
    },
    modeTextInactive: {
      color: colors.textSecondary,
    },
    settingsButton: {
      marginLeft: 8,
      padding: 6,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
    },
    
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      margin: 20,
      minWidth: 300,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '30',
    },
    settingLabel: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
      gap: 12,
    },
    modalButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    buttonText: {
      marginLeft: 6,
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: colors.background,
    },
    secondaryButtonText: {
      color: colors.text,
    },
    modeSelector: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 4,
      marginLeft: 12,
    },
    modeSelectorButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    modeSelectorActive: {
      backgroundColor: colors.primary,
    },
    modeSelectorInactive: {
      backgroundColor: 'transparent',
    },
    modeSelectorText: {
      fontSize: 12,
      fontWeight: '600',
    },
    modeSelectorTextActive: {
      color: colors.background,
    },
    modeSelectorTextInactive: {
      color: colors.textSecondary,
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const prefs = await AppModeService.getAppModePreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('❌ Error loading app mode preferences:', error);
      Alert.alert('Error', 'Failed to load app mode settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = async (newMode: AppMode) => {
    try {
      await AppModeService.setDefaultMode(newMode);
      await loadPreferences();
      onModeChange?.(newMode);
      
      // Show confirmation
      const modeLabel = newMode === 'speech' ? 'Speech' : 'Typing';
      Alert.alert(
        'Mode Changed', 
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
      await loadPreferences();
      onAutoStartChange?.(enabled);
    } catch (error) {
      console.error('❌ Error changing auto-start setting:', error);
      Alert.alert('Error', 'Failed to change auto-start setting');
    }
  };

  const resetSettings = async () => {
    try {
      Alert.alert(
        'Reset Settings',
        'Are you sure you want to reset app mode settings to default?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: async () => {
              await AppModeService.resetToDefault();
              await loadPreferences();
              onModeChange?.('typing');
              onAutoStartChange?.(false);
              Alert.alert('Settings Reset', 'App mode settings have been reset to default');
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error resetting settings:', error);
      Alert.alert('Error', 'Failed to reset settings');
    }
  };

  if (isLoading || !preferences) {
    return null;
  }

  const effectiveMode = currentMode || preferences.defaultMode;

  return (
    <>
      {/* Compact Mode Toggle */}
      <View style={styles.container}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              effectiveMode === 'typing' ? styles.modeButtonActive : styles.modeButtonInactive
            ]}
            onPress={() => handleModeChange('typing')}
          >
            <MaterialIcons
              name="keyboard"
              size={16}
              color={effectiveMode === 'typing' ? colors.background : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeText,
                effectiveMode === 'typing' ? styles.modeTextActive : styles.modeTextInactive
              ]}
            >
              Type
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modeButton,
              effectiveMode === 'speech' ? styles.modeButtonActive : styles.modeButtonInactive
            ]}
            onPress={() => handleModeChange('speech')}
          >
            <MaterialIcons
              name="mic"
              size={16}
              color={effectiveMode === 'speech' ? colors.background : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeText,
                effectiveMode === 'speech' ? styles.modeTextActive : styles.modeTextInactive
              ]}
            >
              Voice
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings Button */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <MaterialIcons name="settings" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>App Mode Settings</Text>

            {/* Default Mode Setting */}
            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingTitle}>Default Mode</Text>
                <Text style={styles.settingDescription}>
                  Choose your preferred interface when starting the app
                </Text>
              </View>
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[
                    styles.modeSelectorButton,
                    preferences.defaultMode === 'typing' ? styles.modeSelectorActive : styles.modeSelectorInactive
                  ]}
                  onPress={() => handleModeChange('typing')}
                >
                  <Text
                    style={[
                      styles.modeSelectorText,
                      preferences.defaultMode === 'typing' ? styles.modeSelectorTextActive : styles.modeSelectorTextInactive
                    ]}
                  >
                    Typing
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeSelectorButton,
                    preferences.defaultMode === 'speech' ? styles.modeSelectorActive : styles.modeSelectorInactive
                  ]}
                  onPress={() => handleModeChange('speech')}
                >
                  <Text
                    style={[
                      styles.modeSelectorText,
                      preferences.defaultMode === 'speech' ? styles.modeSelectorTextActive : styles.modeSelectorTextInactive
                    ]}
                  >
                    Speech
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Auto-start Speech Setting */}
            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <View style={styles.settingLabel}>
                <Text style={styles.settingTitle}>Auto-start Voice Mode</Text>
                <Text style={styles.settingDescription}>
                  Automatically enable voice mode when opening the app or starting new sessions
                </Text>
              </View>
              <Switch
                value={preferences.autoStartSpeech}
                onValueChange={handleAutoStartChange}
                trackColor={{ false: colors.surfaceVariant, true: colors.primary + '40' }}
                thumbColor={preferences.autoStartSpeech ? colors.primary : colors.textSecondary}
              />
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={resetSettings}
              >
                <MaterialIcons name="restore" size={18} color={colors.text} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Reset
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => setShowSettings(false)}
              >
                <MaterialIcons name="check" size={18} color={colors.background} />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}