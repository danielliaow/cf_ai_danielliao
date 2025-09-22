import React, { useEffect, useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { UserPreferencesService } from '../../services/userPreferencesService';
import { UserPersonalizationData } from '../../types/userPreferences';
import { ActivityIndicator, View } from 'react-native';
import { CarouselOnboarding } from '../../components/CarouselOnboarding';

export default function TabLayout() {
  const { user,loading } = useAuth();
  const { colors } = useTheme();

  if (!user) {
    return <Redirect href="/(auth)" />;
  }


 
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
      <View style={ {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
      }}>
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
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown:false,
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: colors.text,
          fontSize: 20,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
        headerShown:false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hidden tab, still accessible for redirects
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: '👤 Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: '⚙️ Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
