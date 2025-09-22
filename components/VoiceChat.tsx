

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VoiceService } from '../services/voiceService';
import { useTheme } from '../contexts/ThemeContext';
import * as FileSystem from 'expo-file-system';

interface VoiceChatProps {
  sessionId?: string;
  onVoiceMessage?: (userText: string, aiText: string, audioData: ArrayBuffer) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  autoRecording?: boolean;
  disabled?: boolean;
}

export function VoiceChat({ 
  sessionId, 
  onVoiceMessage, 
  onRecordingStateChange,
  autoRecording,
  disabled = false
}: VoiceChatProps) {
  const { colors } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isVoiceModeEnabled, setIsVoiceModeEnabled] = useState(false);
  const [supportedAudioFormat, setSupportedAudioFormat] = useState<string | null>(null);

  const voiceService = useRef<VoiceService>(new VoiceService());
  const recordingAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    voiceButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },
    idleButton: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
    },
    recordingButton: {
      backgroundColor: colors.error,
      shadowColor: colors.error,
    },
    processingButton: {
      backgroundColor: colors.warning,
      shadowColor: colors.warning,
    },
    playingButton: {
      backgroundColor: colors.success,
      shadowColor: colors.success,
    },
    disabledButton: {
      backgroundColor: colors.surfaceVariant,
      shadowOpacity: 0,
      elevation: 0,
    },
    statusText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.text,
      textAlign: 'center',
    },
    permissionContainer: {
      alignItems: 'center',
      padding: 20,
    },
    permissionText: {
      fontSize: 14,
      color: colors.warning,
      textAlign: 'center',
      marginTop: 8,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      textAlign: 'center',
      marginTop: 4,
    },
  });

  // Initialize voice service and check permissions
  useEffect(() => {
    initializeVoiceService();
  }, []);

  useEffect(() => {
    console.log('hi i pressed')
   if (autoRecording && hasPermission  ) {
    console.log('hi im inside')
      handleVoiceButtonPress();
    }
  }, [hasPermission])
  
  // Fire-like recording animation
  useEffect(() => {
    if (isRecording) {
      // Create a fire-like flickering effect with multiple overlapping animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0.3,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0.9,
            duration: 80,
            useNativeDriver: false,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0.1,
            duration: 120,
            useNativeDriver: false,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0.8,
            duration: 90,
            useNativeDriver: false,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 0.2,
            duration: 110,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      recordingAnimation.setValue(0);
    }
  }, [isRecording]);

  // Pulse animation for processing/playing
  useEffect(() => {
    if (isProcessing || isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isProcessing, isPlaying]);

  const getSupportedAudioFormat = (): string | null => {
    if (Platform.OS !== 'web' || typeof MediaRecorder === 'undefined') {
      return null; // Native platforms handle this automatically
    }

    // List of formats in order of preference
    const supportedTypes = [
      // 'audio/webm;codecs=opus',
      'audio/webm',
      // 'audio/mp4;codecs=mp4a.40.2',
      // 'audio/mp4',
      // 'audio/ogg;codecs=opus',
      // 'audio/ogg',
      // 'audio/wav',
      // 'audio/mpeg'
    ];
    
    for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('✅ Using supported audio format:', type);
        return type;
      }
    }
    
    console.warn('⚠️ No supported audio formats found for MediaRecorder');
    return null;
  };

  const initializeVoiceService = async () => {
    try {
      // Check for supported audio format on web
      if (Platform.OS === 'web') {
        const format = getSupportedAudioFormat();
        setSupportedAudioFormat(format);
        
        if (!format) {
          console.error('❌ No supported audio formats available');
          setHasPermission(false);
          return;
        }
      }

      // Check microphone permissions
      const permission = await VoiceService.initialize();
      setHasPermission(permission);

      if (permission) {
        // Enable voice mode automatically when permissions are granted
        if (sessionId) {
          const result = await VoiceService.enableConversationMode(sessionId);
          if (result.success) {
            setIsVoiceModeEnabled(true);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error initializing voice service:', error);
      setHasPermission(false);
    }
  };

  const handleVoiceButtonPress = async () => {
    if (disabled) return;

    // Check if we have a supported audio format on web
    if (Platform.OS === 'web' && !supportedAudioFormat) {
      alert(
        'Audio Not Supported Your browser does not support audio recording. Please try using a different browser like Chrome or Firefox.'
       
      );
      return;
    }

    // If no permission, request it
    if (!hasPermission) {
      console.log('🎤 Requesting microphone permissions...');
      const permissionGranted = await VoiceService.initialize();
      if (!permissionGranted) {
        Alert.alert(
          'Microphone Access Required',
          'Voice features need microphone access. Please enable it in your device settings and try again.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      setHasPermission(true);
      
      // Enable voice mode after getting permission
      if (sessionId) {
        const result = await VoiceService.enableConversationMode(sessionId);
        if (result.success) {
          setIsVoiceModeEnabled(true);
        }
      }
      return;
    }

    // If currently recording, stop recording and process
    if (isRecording) {
      await stopRecording();
      return;
    }

    // If processing or playing, do nothing
    if (isProcessing ) {
      return;
    }
    if( isPlaying ) {
      // Stop playback if user taps while playing
      await VoiceService.stopAudioPlayback();
      setIsPlaying(false);
      setIsRecording(true);
      onRecordingStateChange?.(true);
      return;
    }

    // Start recording
    await startRecording();
  };

  const startRecording = async () => {
    try {
      // Pass the supported format to the voice service if on web
      const recordingOptions = Platform.OS === 'web' && supportedAudioFormat 
        ? { audioFormat: supportedAudioFormat }
        : undefined;

      await voiceService.current.startRecording();
      setIsRecording(true);
      onRecordingStateChange?.(true);
      console.log('🎤 Started recording...');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to start recording';
      if (error instanceof Error) {
        if (error.name === 'NotSupportedError') {
          errorMessage = 'Audio recording is not supported in this browser. Please try Chrome or Firefox.';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access was denied. Please enable microphone permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Recording Error', errorMessage);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      onRecordingStateChange?.(false);
      setIsProcessing(true);
      console.log('⏹️ Stopping recording and processing...');

      const audioUri = await voiceService.current.stopRecording();
      
      // Process the voice message
      const result = await VoiceService.processVoiceMessage(audioUri);
      console.log(result)
      if (result.success && result.audioData && result.userText && result.aiText) {
        console.log('✅ Voice processing successful');
        
        // Notify parent component
        onVoiceMessage?.(result.userText, result.aiText, result.audioData);
        
        // Play the AI response
        setIsProcessing(false);
        setIsPlaying(true);
        await VoiceService.playAudioResponse(result.audioData);
        setIsPlaying(false);

        // Clean up the temporary audio file
        if (Platform.OS !== 'web') {
          FileSystem.deleteAsync(audioUri, { idempotent: true }).catch(console.warn);
        }
      } else {
        Alert.alert('Error', result.error || 'Voice processing failed');
      }
    } catch (error) {
      console.error('❌ Error processing voice:', error);
      Alert.alert('Error', 'Failed to process voice message');
    } finally {
      setIsProcessing(false);
      setIsPlaying(false);
    }
  };

  const getButtonStyle = () => {
    if (disabled || !hasPermission || (Platform.OS === 'web' && !supportedAudioFormat)) {
      return styles.disabledButton;
    }
    if (isRecording) return styles.recordingButton;
    if (isProcessing) return styles.processingButton;
    if (isPlaying) return styles.playingButton;
    return styles.idleButton;
  };

  const getButtonIcon = () => {
    if (!hasPermission || (Platform.OS === 'web' && !supportedAudioFormat)) {
      return 'mic-off';
    }
    if (isRecording) return 'stop';
    if (isProcessing) return '🤔'; // Thinking emoji
    if (isPlaying) return 'volume-up';
    return 'mic';
  };

  const getStatusText = () => {
    if (Platform.OS === 'web' && !supportedAudioFormat) {
      return 'Audio recording not supported in this browser';
    }
    if (!hasPermission) return 'Tap to enable microphone';
    if (isRecording) return 'Recording... tap to stop';
    if (isProcessing) return 'AI is thinking...';
    if (isPlaying) return 'Playing response...';
    return 'Tap to speak';
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.statusText}>Initializing voice...</Text>
      </View>
    );
  }

  // Show error state if audio is not supported on web
  if (Platform.OS === 'web' && !supportedAudioFormat) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity 
          style={[styles.voiceButton, styles.disabledButton]}
          disabled
        >
          <MaterialIcons name="mic-off" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.errorText}>
          Audio recording not supported in this browser
        </Text>
        <Text style={[styles.permissionText, { fontSize: 12, marginTop: 4 }]}>
          Try using Chrome or Firefox for voice features
        </Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity 
          style={[styles.voiceButton, styles.disabledButton]}
          onPress={handleVoiceButtonPress}
        >
          <MaterialIcons name="mic-off" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.permissionText}>
          Tap to enable microphone for voice chat
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          { transform: [{ scale: pulseAnimation }] }
        ]}
      >
        <TouchableOpacity
          style={[styles.voiceButton, getButtonStyle()]}
          onPress={handleVoiceButtonPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <Text style={{ fontSize: 24 }}>🤔</Text>
          ) : (
            <MaterialIcons
              name={getButtonIcon()}
              size={24}
              color="white"
            />
          )}
          
          {/* Fire-like recording indicators */}
          {isRecording && (
            <>
              {/* Main fire indicator */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#FF4500', // Orange-red fire color
                  opacity: recordingAnimation,
                  shadowColor: '#FF4500',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              />
              {/* Secondary fire indicator */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#FFD700', // Golden fire color
                  opacity: recordingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.9],
                  }),
                }}
              />
              {/* Outer glow effect */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 1,
                  right: 1,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: 'rgba(255, 69, 0, 0.3)',
                  opacity: recordingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.6],
                  }),
                }}
              />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.statusText}>
        {getStatusText()}
      </Text>

      {/* Show supported format info in development */}
      {__DEV__ && Platform.OS === 'web' && supportedAudioFormat && (
        <Text style={[styles.statusText, { fontSize: 10, color: colors.textSecondary }]}>
          Using: {supportedAudioFormat}
        </Text>
      )}
    </View>
  );
}