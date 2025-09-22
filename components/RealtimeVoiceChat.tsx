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
  ScrollView,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { realtimeVoiceService, ConversationCallbacks } from '../services/realtimeVoiceService';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface RealtimeVoiceChatProps {
  sessionId?: string;
  onVoiceMessage?: (userText: string, aiText: string, audioData: ArrayBuffer) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  autoRecording?: boolean;
  naturalConversation?: boolean;
  disabled?: boolean;
  forceStop?: boolean; // New prop to force stop conversation
}

const processingMessages = [
  "🔥 Cooking up something amazing...",
  "🧠 Thinking deeply about your question...",
  "⚡ Processing at light speed...",
  "🎯 Crafting the perfect response...",
  "🚀 Launching thoughts into orbit...",
  "🌟 Brewing some digital magic...",
  "🎨 Painting words with AI...",
  "💎 Polishing the perfect answer...",
  "🔮 Consulting the AI crystal ball...",
  "🎪 Performing some computational acrobatics..."
];

export function RealtimeVoiceChat({
  sessionId,
  onVoiceMessage,
  onRecordingStateChange,
  autoRecording,
  naturalConversation,
  disabled = false,
  forceStop = false
}: RealtimeVoiceChatProps) {
  const { colors } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [conversationActive, setConversationActive] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [lastAIMessage, setLastAIMessage] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [processingMessage, setProcessingMessage] = useState('');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  const listeningAnimation = useRef(new Animated.Value(0)).current;
  const thinkingAnimation = useRef(new Animated.Value(1)).current;
  const speakingAnimation = useRef(new Animated.Value(1)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    voiceButtonContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    voiceButton: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 12,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    idleButton: {
      backgroundColor: '#FF6B35',
      shadowColor: '#FF6B35',
      borderColor: '#FF4500',
    },
    listeningButton: {
      backgroundColor: '#00E676',
      shadowColor: '#00E676',
      borderColor: '#00C853',
    },
    thinkingButton: {
      backgroundColor: '#FFB300',
      shadowColor: '#FFB300',
      borderColor: '#FF8F00',
    },
    speakingButton: {
      backgroundColor: '#3D5AFE',
      shadowColor: '#3D5AFE',
      borderColor: '#1E88E5',
    },
    disabledButton: {
      backgroundColor: colors.surfaceVariant,
      shadowOpacity: 0,
      elevation: 0,
      borderColor: colors.border,
    },
    glowRing: {
      position: 'absolute',
      borderRadius: 60,
      borderWidth: 3,
    },
    statusContainer: {
      alignItems: 'center',
      marginBottom: 20,
      minHeight: 80,
    },
    statusText: {
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '600',
      marginBottom: 8,
    },
    processingText: {
      fontSize: 16,
      color: '#FFB300',
      textAlign: 'center',
      fontWeight: '500',
      fontStyle: 'italic',
      marginTop: 4,
    },
    messagePreview: {
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 16,
      maxWidth: 320,
      borderLeftWidth: 4,
    },
    userMessagePreview: {
      borderLeftColor: '#00E676',
      backgroundColor: 'rgba(0, 230, 118, 0.1)',
    },
    aiMessagePreview: {
      borderLeftColor: '#3D5AFE',
      backgroundColor: 'rgba(61, 90, 254, 0.1)',
    },
    messageText: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    userMessageText: {
      color: '#00C853',
      fontWeight: '500',
    },
    aiMessageText: {
      color: '#3D5AFE',
      fontWeight: '500',
    },
    controlsContainer: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 12,
      alignItems: 'center',
    },
    controlButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 25,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 2,
      borderColor: colors.border,
      minWidth: 80,
      alignItems: 'center',
    },
    controlButtonActive: {
      backgroundColor: '#FF6B35',
      borderColor: '#FF4500',
    },
    controlButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    controlButtonTextActive: {
      color: 'white',
    },
    voiceButton2: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      borderWidth: 1,
      borderColor: colors.primary + '40',
    },
    voiceButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    unsupportedContainer: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'rgba(244, 67, 54, 0.3)',
    },
    unsupportedText: {
      fontSize: 16,
      color: '#D32F2F',
      textAlign: 'center',
      marginTop: 12,
      fontWeight: '500',
    },
    errorText: {
      fontSize: 14,
      color: '#FF5722',
      textAlign: 'center',
      marginTop: 8,
      fontWeight: '500',
    },

    // Voice Selector Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      margin: 20,
      maxHeight: '70%',
      minWidth: 300,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    voiceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    voiceOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    voiceOptionText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    voiceOptionMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 12,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    modalButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 20,
      flex: 1,
      marginHorizontal: 6,
      alignItems: 'center',
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonSecondary: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 2,
      borderColor: colors.border,
    },
    modalButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
    },
    modalButtonTextSecondary: {
      color: colors.text,
    },
  });

  // Initialize voice service
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🔧 Initializing RealtimeVoiceChat...');

        // Wait a bit for the service to initialize
        await new Promise(resolve => setTimeout(resolve, 500));

        const supported = realtimeVoiceService.isSupported();
        const permission = realtimeVoiceService.hasAudioPermission();

        console.log('🔍 Voice capabilities:', { supported, permission });

        setIsSupported(supported);
        setHasPermission(permission);

        // Load available voices
        if (supported && Platform.OS === 'web') {
          const voices = realtimeVoiceService.getAvailableVoices();
          setAvailableVoices(voices);
          const currentVoice = realtimeVoiceService.getCurrentVoice();
          setSelectedVoice(currentVoice);
        }

        if (!supported) {
          setStatusMessage('Voice features not supported');
        } else if (!permission) {
          setStatusMessage('Microphone permission required');
        } else {
          setStatusMessage('Ready to start conversation');
        }
      } catch (error) {
        console.error('❌ Error initializing realtime voice chat:', error);
        setIsSupported(false);
        setStatusMessage('Failed to initialize voice features');
      }
    };

    initialize();
  }, []);

  // Cleanup effect - stop conversation when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 RealtimeVoiceChat component unmounting, stopping conversation...');
      if (conversationActive) {
        realtimeVoiceService.stopConversation().catch(console.error);
      }
    };
  }, [conversationActive]);

  // Handle force stop from parent component
  useEffect(() => {
    if (forceStop && conversationActive) {
      console.log('🛑 Force stopping conversation from parent component');
      stopConversation();
    }
  }, [forceStop, conversationActive]);

  // Auto-start conversation if enabled
  useEffect(() => {
    if (autoRecording && isSupported && hasPermission && sessionId && !conversationActive && !disabled) {
      console.log('🎤 Auto-starting conversation mode...');
      setTimeout(() => {
        if (!conversationActive) {
          startConversation();
        }
      }, 1000);
    }
  }, [autoRecording, isSupported, hasPermission, sessionId, conversationActive, disabled]);

  // Handle natural conversation mode
  useEffect(() => {
    if (naturalConversation && isSupported && hasPermission && sessionId && !conversationActive && !disabled) {
      console.log('💬 Starting natural conversation mode...');
      setTimeout(() => {
        if (!conversationActive) {
          startConversation();
        }
      }, 500);
    }
  }, [naturalConversation, isSupported, hasPermission, sessionId, conversationActive, disabled]);

  // Animations
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(listeningAnimation, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(listeningAnimation, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      listeningAnimation.setValue(0);
    }
  }, [isListening]);

  useEffect(() => {
    if (isThinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(thinkingAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(thinkingAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      thinkingAnimation.setValue(1);
    }
  }, [isThinking]);

  useEffect(() => {
    if (isSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(speakingAnimation, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(speakingAnimation, {
            toValue: 0.95,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      speakingAnimation.setValue(1);
    }
  }, [isSpeaking]);

  // Glow animation for active states
  useEffect(() => {
    if (conversationActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnimation.setValue(0);
    }
  }, [conversationActive]);

  // Processing message rotation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isThinking) {
      let messageIndex = 0;
      setProcessingMessage(processingMessages[0]);

      interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % processingMessages.length;
        setProcessingMessage(processingMessages[messageIndex]);
      }, 2000);
    } else {
      setProcessingMessage('');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isThinking]);

  // Update parent recording state
  useEffect(() => {
    onRecordingStateChange?.(isListening || isThinking || isSpeaking);
  }, [isListening, isThinking, isSpeaking, onRecordingStateChange]);

  const startConversation = async () => {
    if (!sessionId || !isSupported || !hasPermission || conversationActive || disabled) {
      console.log('⚠️ Cannot start conversation:', {
        sessionId: !!sessionId,
        isSupported,
        hasPermission,
        conversationActive,
        disabled
      });
      return;
    }

    try {
      console.log('🚀 Starting conversation...');
      setStatusMessage('Starting conversation...');
      setCurrentUserMessage(''); // Reset for new conversation

      const callbacks: ConversationCallbacks = {
        onListening: () => {
          console.log('🎤 Listening callback');
          setIsListening(true);
          setIsThinking(false);
          setIsSpeaking(false);
          setStatusMessage('Listening... speak naturally');
        },

        onResults: (results) => {
          console.log('📝 Speech results callback:', results);
          if (results.length > 0) {
            const transcribedText = results[0];
            console.log('🎯 Setting current user message:', transcribedText);
            setCurrentUserMessage(transcribedText);
            setLastUserMessage(transcribedText);
          }
        },

        onSpeechStart: () => {
          console.log('🗣️ Speech start callback');
          setStatusMessage('I hear you speaking...');
        },

        onSpeechEnd: () => {
          console.log('🤐 Speech end callback');
          setIsListening(false);
        },

        onAIThinking: () => {
          console.log('🤔 AI thinking callback');
          setIsListening(false);
          setIsThinking(true);
          setIsSpeaking(false);
          setStatusMessage('AI is processing your request...');
        },

        onAIResponse: (aiText, userText) => {
          console.log('💬 AI response callback:', aiText.substring(0, 50));
          console.log('🎯 User text from service:', userText);
          setLastAIMessage(aiText);
          setIsThinking(false);
          setStatusMessage('AI responding...');

          // Notify parent component with voice message - use the userText from the service
          console.log('📤 Calling onVoiceMessage with:', { userText, aiText: aiText.substring(0, 50) });
          onVoiceMessage?.(userText || 'Voice input', aiText, new ArrayBuffer(0));
        },

        onAISpeaking: () => {
          console.log('🔊 AI speaking callback');
          setIsThinking(false);
          setIsSpeaking(true);
          setStatusMessage('AI is speaking...');
        },

        onError: (error) => {
          console.error('❌ Conversation error callback:', error);
          setIsListening(false);
          setIsThinking(false);
          setIsSpeaking(false);
          setStatusMessage('Error: ' + error);

          Alert.alert('Voice Error', `${error}`);
        },

        onConversationEnd: () => {
          console.log('🏁 Conversation end callback');
          setConversationActive(false);
          setIsListening(false);
          setIsThinking(false);
          setIsSpeaking(false);
          setCurrentUserMessage('');
          setStatusMessage('Conversation ended');
        },
      };

      await realtimeVoiceService.startConversation(sessionId, callbacks);
      setConversationActive(true);
      setStatusMessage('🔥 Conversation is blazing!');

    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      setStatusMessage('Error: ' + errorMessage);
      Alert.alert('Voice Error', errorMessage);
    }
  };

  const stopConversation = async () => {
    try {
      console.log('🛑 Stopping conversation...');
      setStatusMessage('Stopping conversation...');

      await realtimeVoiceService.stopConversation();

      setConversationActive(false);
      setIsListening(false);
      setIsThinking(false);
      setIsSpeaking(false);
      setCurrentUserMessage('');
      setStatusMessage('Conversation stopped');
    } catch (error) {
      console.error('❌ Error stopping conversation:', error);
      setStatusMessage('Error stopping conversation');
    }
  };

  const handleButtonPress = async () => {
    if (disabled || !isSupported) {
      console.log('⚠️ Button press ignored:', { disabled, isSupported });
      return;
    }

    if (!hasPermission) {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow microphone access to use voice features.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!sessionId) {
      Alert.alert('Error', 'No active session available');
      return;
    }

    console.log('🔘 Button pressed, current state:', { conversationActive, isListening, isThinking, isSpeaking });

    if (conversationActive) {
      await stopConversation();
    } else {
      await startConversation();
    }
  };

  const handleVoiceChange = (voiceName: string) => {
    const success = realtimeVoiceService.setVoice(voiceName);
    if (success) {
      setSelectedVoice(voiceName);
      setShowVoiceSelector(false);
    }
  };

  const getButtonStyle = () => {
    if (disabled || !isSupported || !hasPermission) return styles.disabledButton;
    if (isListening) return styles.listeningButton;
    if (isThinking) return styles.thinkingButton;
    if (isSpeaking) return styles.speakingButton;
    return styles.idleButton;
  };

  const getButtonIcon = () => {
    if (!isSupported || !hasPermission) return 'mic-off';
    if (isListening) return 'mic';
    if (isThinking) return 'psychology';
    if (isSpeaking) return 'volume-up';
    if (conversationActive) return 'stop';
    return 'mic';
  };

  const getAnimatedScale = () => {
    if (isListening) return listeningAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.15],
    });
    if (isThinking) return thinkingAnimation;
    if (isSpeaking) return speakingAnimation;
    return 1;
  };

  const getGlowColor = () => {
    if (isListening) return 'rgba(0, 230, 118, 0.6)';
    if (isThinking) return 'rgba(255, 179, 0, 0.6)';
    if (isSpeaking) return 'rgba(61, 90, 254, 0.6)';
    return 'rgba(255, 107, 53, 0.6)';
  };

  if (isSupported === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.statusText}>Initializing Embr Voice...</Text>
      </View>
    );
  }

  if (!isSupported) {
    return (
      <View style={styles.unsupportedContainer}>
        <MaterialIcons name="mic-off" size={48} color="#D32F2F" />
        <Text style={styles.unsupportedText}>
          {Platform.OS === 'web'
            ? 'Voice features are not supported in this browser. Try Chrome or Firefox.'
            : 'Voice features are not available on this device.'
          }
        </Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.unsupportedContainer}>
        <TouchableOpacity
          style={[styles.voiceButton, styles.disabledButton]}
          onPress={handleButtonPress}
        >
          <MaterialIcons name="mic-off" size={40} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.errorText}>
          Microphone permission required
        </Text>
        <Text style={styles.statusText}>
          Tap to enable microphone access
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.voiceButtonContainer}>
        {/* Animated glow ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: 120,
              height: 120,
              borderColor: getGlowColor(),
              opacity: glowAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
              transform: [{
                scale: glowAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              }],
            }
          ]}
        />

        <Animated.View
          style={[
            { transform: [{ scale: getAnimatedScale() }] }
          ]}
        >
          <TouchableOpacity
            style={[styles.voiceButton, getButtonStyle()]}
            onPress={handleButtonPress}
            disabled={disabled || !isSupported || !hasPermission}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={getButtonIcon()}
              size={40}
              color="white"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {statusMessage}
        </Text>

        {isThinking && processingMessage && (
          <Text style={styles.processingText}>
            {processingMessage}
          </Text>
        )}
      </View>

      {/* Message previews */}
      {lastUserMessage && (
        <View style={[styles.messagePreview, styles.userMessagePreview]}>
          <Text style={[styles.messageText, styles.userMessageText]}>
            You: {lastUserMessage.substring(0, 80)}{lastUserMessage.length > 80 ? '...' : ''}
          </Text>
        </View>
      )}

      {lastAIMessage && (
        <View style={[styles.messagePreview, styles.aiMessagePreview]}>
          <Text style={[styles.messageText, styles.aiMessageText]}>
            AI: {lastAIMessage.substring(0, 80)}{lastAIMessage.length > 80 ? '...' : ''}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            conversationActive && styles.controlButtonActive
          ]}
          onPress={handleButtonPress}
          disabled={!isSupported || disabled}
        >
          <Text style={[
            styles.controlButtonText,
            conversationActive && styles.controlButtonTextActive
          ]}>
            {conversationActive ? 'Stop' : 'Start'} Chat
          </Text>
        </TouchableOpacity>

       
      </View>

      {/* Voice Selector Modal */}
      <Modal
        visible={showVoiceSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVoiceSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Choose AI Voice</Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {availableVoices.map((voice) => (
                <TouchableOpacity
                  key={voice.name}
                  style={[
                    styles.voiceOption,
                    selectedVoice === voice.name && styles.voiceOptionSelected
                  ]}
                  onPress={() => handleVoiceChange(voice.name)}
                >
                  <MaterialIcons
                    name={selectedVoice === voice.name ? "radio-button-checked" : "radio-button-unchecked"}
                    size={20}
                    color={selectedVoice === voice.name ? colors.primary : colors.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voiceOptionText}>{voice.name}</Text>
                    <Text style={styles.voiceOptionMeta}>
                      {voice.lang} • {voice.localService ? 'Local' : 'Remote'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowVoiceSelector(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowVoiceSelector(false)}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Debug info for development */}
      {/* {__DEV__ && (
        <Text style={[styles.statusText, { fontSize: 10, color: colors.textSecondary, marginTop: 12 }]}>
          Debug: {JSON.stringify({ conversationActive, isListening, isThinking, isSpeaking })}
        </Text>
      )} */}
    </View>
  );
}