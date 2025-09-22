import React, { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { CarouselOnboarding } from '../components/CarouselOnboarding';
import { UserPreferencesService } from '../services/userPreferencesService';
import { UserPersonalizationData } from '../types/userPreferences';

export default function Index() {
  const { user, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingPreferences, setCheckingPreferences] = useState(true);

  useEffect(() => {
    if (user && !loading) {
      checkOnboardingStatus();
    }
  }, [user, loading]);

  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 Checking onboarding status...');
      const result = await UserPreferencesService.getUserPreferences();
      console.log('📊 Onboarding status result:', result);
      console.log('📊 onboarding_completed value:', result.onboarding_completed);
      console.log('📊 typeof onboarding_completed:', typeof result.onboarding_completed);
      console.log('📊 service success:', result.success);
      
      // If service call was successful, use the onboarding_completed value
      // If service call failed, default to false to show onboarding
      if (result.success) {
        console.log('✅ Service call successful, using onboarding status:', result.onboarding_completed);
        setOnboardingCompleted(result.onboarding_completed);
      } else {
        console.log('❌ Service call failed, defaulting to show onboarding');
        setOnboardingCompleted(false);
      }
      
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // Default to showing onboarding if there's an error
      console.log('🔄 Setting onboarding to false due to error');
      setOnboardingCompleted(false);
    } finally {
      setCheckingPreferences(false);
    }
  };

  const handleOnboardingComplete = (preferences: UserPersonalizationData) => {
    setOnboardingCompleted(true);
  };

  const handleOnboardingSkip = () => {
    setOnboardingCompleted(true);
  };

  if (loading || (user && checkingPreferences)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  // Show onboarding if user is logged in but hasn't completed preferences
  if (user && onboardingCompleted === false) {
    console.log(onboardingCompleted,'from index')
    return (
      <CarouselOnboarding 
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});