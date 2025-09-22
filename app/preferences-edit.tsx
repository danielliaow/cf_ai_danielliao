import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { router } from 'expo-router';
import { CarouselOnboarding } from '../components/CarouselOnboarding';
import { UserPersonalizationData } from '../types/userPreferences';
import { UserPreferencesService } from '../services/userPreferencesService';

export default function PreferencesEdit() {
  const { colors } = useTheme();
  const [preferences, setPreferences] = useState<UserPersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    backButton: {
      position: 'absolute',
      top: 60,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      zIndex: 10,
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const result = await UserPreferencesService.getUserPreferences();
      if (result.success && result.preferences) {
        setPreferences(result.preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (updatedPreferences: UserPersonalizationData) => {
    Alert.alert('Success', 'Preferences updated successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  if (loading) {
    return (
      <LinearGradient colors={colors.gradientBackground} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Ionicons name="settings" size={48} color={colors.textSecondary} />
            <Text style={styles.loadingText}>Loading preferences...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Use Carousel Onboarding for editing preferences */}
      <CarouselOnboarding 
        onComplete={handleComplete}
        isEditMode={true}
        existingPreferences={preferences}
      />
    </View>
  );
}