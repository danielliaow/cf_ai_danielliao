import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  Dimensions,
  Animated,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithGoogle } from '../../services/auth-simple';
import { useTheme } from '../../contexts/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SignIn() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const { error } = useLocalSearchParams();

  useEffect(() => {
    // Show error alert if coming from callback with error
    if (error) {
      const errorMessage = Array.isArray(error) ? error[0] : error;
      Alert.alert(
        'Authentication Error',
        `Sign in failed: ${decodeURIComponent(errorMessage)}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    }
  }, [error]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log('🎯 Starting Google Sign-In process...');
      
      const result = await signInWithGoogle();
      console.log('🔄 Sign in result:', result);
      
      if (result.type === 'success') {
        console.log('✅ Sign in successful! AuthContext will handle redirect.');
      } else if (result.type === 'cancel') {
        console.log('⚠️ User cancelled sign in');
        Alert.alert('Cancelled', 'Sign in was cancelled');
      } else {
        console.log('❌ Sign in failed:', result);
        Alert.alert('Error', `Sign in failed: ${result.type}`);
      }
    } catch (error) {
      console.error('💥 Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Sign In Error', `Failed to sign in with Google:\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      marginTop:30
    },
    header: {
      alignItems: 'center',
      marginBottom: 60,
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    logoText: {
      fontSize: 48,
      fontWeight: '800',
    },
    appName: {
      fontSize: 42,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    tagline: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
      fontWeight: '500',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    featuresContainer: {
      marginVertical: 5,
      width: '100%',
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    signInContainer: {
      width: '100%',
      marginTop: 20,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    googleButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    googleButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 12,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    footerText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    testAuthButton: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    testAuthText: {
      fontSize: 14,
      color: colors.primary,
      textAlign: 'center',
      fontWeight: '500',
    },
  });

  const features = [
    {
      icon: 'chatbubbles',
      title: 'Smart Conversations',
      description: 'Chat with your AI assistant powered by advanced language models'
    },
    {
      icon: 'calendar',
      title: 'Calendar Integration',
      description: 'Manage your schedule with seamless Google Calendar integration'
    },
    {
      icon: 'mail',
      title: 'Email Management',
      description: 'Get intelligent email summaries and quick responses'
    },
    {
      icon: 'apps',
      title: 'Deep Linking',
      description: 'Connect with external apps like Spotify, Amazon, and more'
    }
  ];

  return (
    <LinearGradient colors={colors.gradientBackground} style={styles.container}>
      <SafeAreaView style={styles.gradient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Logo */}
            <LinearGradient
              colors={colors.gradientPrimary}
              style={styles.logoContainer}
            >
              <Text style={[styles.logoText, { color: '#fff' }]}>🔥</Text>
            </LinearGradient>

            {/* App Name & Tagline */}
            <Text style={styles.appName}>Embr</Text>
            <Text style={styles.tagline}>Your AI Assistant with Fire</Text>
            <Text style={styles.subtitle}>
              Ignite productivity with intelligent conversations,{'\n'}
              seamless integrations, and powerful automation
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View 
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {features.map((feature, index) => (
              <View key={index} style={styles.feature}>
                <LinearGradient
                  colors={[colors.primary + '20', colors.secondary + '20']}
                  style={styles.featureIcon}
                >
                  <Ionicons name={feature.icon as any} size={24} color={colors.primary} />
                </LinearGradient>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          {/* Sign In Button */}
          <Animated.View 
            style={[
              styles.signInContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity 
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={colors.gradientPrimary}
                style={[styles.googleButton, loading && styles.buttonDisabled]}
              >
                <View style={styles.googleButtonContent}>
                  <Ionicons 
                    name="logo-google" 
                    size={24} 
                    color="#fff" 
                  />
                  <Text style={styles.googleButtonText}>
                    {loading ? 'Signing in...' : 'Continue with Google'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.View 
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <Text style={styles.footerText}>
              By signing in, you agree to our Terms of Service and{' '}
              <Text 
                style={[styles.footerText, { color: colors.primary, textDecorationLine: 'underline' }]}
                onPress={() => router.push('/(auth)/privacy-policy')}
              >
                Privacy Policy
              </Text>
            </Text>
            
            {/* <TouchableOpacity 
              style={styles.testAuthButton}
              onPress={() => router.push('/(auth)/test-auth')}
            >
              <Text style={styles.testAuthText}>🔍 Test OAuth Scopes</Text>
            </TouchableOpacity> */}
            
            <Text style={[styles.footerText, { marginTop: 10 }]}>
              Welcome to the future! 🚀
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}