import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ChatMessage } from '../../types/chat';
import { ChatService } from '../../services/chatService';
import { SessionService } from '../../services/sessionService';
import { Session, Message } from '../../types/session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionList } from '../../components/SessionList';
import { ThinkingAnimation } from '../../components/ThinkingAnimation';
import { StreamingMessage } from '../../components/StreamingMessage';
import { StreamingCallbacks } from '../../services/streamingService';
import { VoiceChat } from '../../components/VoiceChat';
import { RealtimeVoiceChat } from '../../components/RealtimeVoiceChat';
import { realtimeVoiceService } from '../../services/realtimeVoiceService';
import { FileOperationCard } from '../../components/FileOperationCard';
import { DocumentAnalysisCard } from '../../components/DocumentAnalysisCard';
import { DriveFileCard } from '../../components/DriveFileCard';
import { DocumentCreationModal } from '../../components/DocumentCreationModal';
import { AppModeService, AppMode } from '../../services/appModeService';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const CURRENT_SESSION_KEY = 'current_session_id';
const { width: screenWidth } = Dimensions.get('window');

export default function Chat() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      minHeight:"93%"
     
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      // borderBottomWidth: 1,
      // borderBottomColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    emptyText: {
      fontSize: 18,
      color: "#888",
      textAlign: "center",
    },
    sessionInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sessionTitle: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    sessionsToggle: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      marginRight: 12,
    },
    newChatButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
    },
    sessionsOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      flexDirection: 'row',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sessionsSidebar: {
      width: Math.min(screenWidth * 0.85, 350),
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    keyboardAvoid: {
      flex: 1,
    },
    messagesList: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      paddingBottom: 8,
    },
    messageContainer: {
      marginBottom: 16,
    },
    userMessage: {
      alignItems: 'flex-end',
    },
    assistantMessage: {
      alignItems: 'flex-start',
    },
    messageBubble: {
      maxWidth: '85%',
      borderRadius: 16,
      padding: 12,
    },
    userBubble: {
      backgroundColor: colors.primary,
    },
    assistantBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    systemBubble: {
      backgroundColor: colors.warning + '20',
      borderWidth: 1,
      borderColor: colors.warning + '40',
    },
    toolBubble: {
      backgroundColor: colors.success + '20',
      borderWidth: 1,
      borderColor: colors.success + '40',
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    messageRole: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginLeft: 4,
    },
    loadingSpinner: {
      marginLeft: 8,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    userMessageText: {
      color: '#fff',
    },
    assistantMessageText: {
      color: colors.text,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height:-2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 5,
    
    },
    textInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    sendButtonDisabled: {
      backgroundColor: colors.surfaceVariant,
      shadowOpacity: 0,
      elevation: 0,
    },
    voiceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '20',
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    voiceText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
      marginLeft: 2,
    },
    toolBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '20',
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    toolText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.success,
      marginLeft: 2,
    },
    userText: {
      color: '#fff',
    },
    assistantText: {
      color: colors.text,
    },
    errorText: {
      color: colors.error,
    },
    timestamp: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    fabContainer: {
      position: 'absolute',
      right: 16,
      bottom: 100,
      zIndex: 1000,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    
    // Voice button styles
    voiceButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    
    // Push-to-talk modal styles
    voiceModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    voiceModalBackdrop: {
      flex: 1,
    },
    voiceModalContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 32,
      alignItems: 'center',
      paddingBottom: 40,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 16,
    },
    voiceModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 8,
    },
    voiceModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      textAlign: 'center',
    },
    voiceSelectionButton: {
      position: 'absolute',
      right: 0,
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.border,
    },
    voiceModalSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 2,
      textAlign: 'center',
    },
    holdToTalkButton: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      borderWidth: 3,
      borderColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    holdToTalkButtonRecording: {
      backgroundColor: '#ffebee',
      borderColor: '#ff4444',
      transform: [{ scale: 1.1 }],
    },
    recordingIndicator: {
      position: 'absolute',
      bottom: -40,
      alignItems: 'center',
      flexDirection: 'row',
    },
    recordingText: {
      marginLeft: 8,
      fontSize: 14,
      color: '#ff4444',
      fontWeight: '600',
    },
    voiceModalCancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 20,
    },
    voiceModalCancelText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    
    // Fire wave animation styles
    voiceButtonContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    fireWave: {
      position: 'absolute',
      borderRadius: 100,
      borderWidth: 2,
    },
    fireWave1: {
      width: 120,
      height: 120,
      borderColor: 'rgba(255, 69, 0, 0.3)', // Orange-red
      backgroundColor: 'rgba(255, 69, 0, 0.05)',
    },
    fireWave2: {
      width: 100,
      height: 100,
      borderColor: 'rgba(255, 140, 0, 0.4)', // Dark orange
      backgroundColor: 'rgba(255, 140, 0, 0.08)',
    },
    fireWave3: {
      width: 80,
      height: 80,
      borderColor: 'rgba(255, 165, 0, 0.5)', // Orange
      backgroundColor: 'rgba(255, 165, 0, 0.1)',
    },
    fireWave4: {
      width: 70,
      height: 70,
      borderColor: 'rgba(255, 215, 0, 0.6)', // Gold
      backgroundColor: 'rgba(255, 215, 0, 0.12)',
    },

    // Voice selection modal styles
    voiceSelectionModal: {
      margin: 20,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      maxHeight: '80%',
    },
    voiceSelectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    voiceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedVoiceItem: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    voiceInfo: {
      flex: 1,
      marginLeft: 12,
    },
    voiceName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    voiceLanguage: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    voiceSelectionClose: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      alignItems: 'center',
    },
    voiceSelectionCloseText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const [streamingMessage, setStreamingMessage] = useState<{
    id: string;
    content: string;
    isStreaming: boolean;
    toolName?: string;
    toolStatus?: string;
  } | null>(null);
  const [isVoiceModeEnabled, setIsVoiceModeEnabled] = useState(false);
  const [currentAppMode, setCurrentAppMode] = useState<AppMode>('typing');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showVoicePopup, setShowVoicePopup] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [forceStopVoice, setForceStopVoice] = useState(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const [autoRecord, setautoRecord] = useState(false)
  const messageCache = useRef<Map<string, ChatMessage[]>>(new Map());

  // Fire wave animations
  const fireWave1 = useRef(new Animated.Value(0)).current;
  const fireWave2 = useRef(new Animated.Value(0)).current;
  const fireWave3 = useRef(new Animated.Value(0)).current;
  const fireWave4 = useRef(new Animated.Value(0)).current;
 
useEffect(() => {
  const getStartupType= async () => {
    const typeOrAudio= await AsyncStorage.getItem('app_mode_preferences');
    const data= JSON.parse(typeOrAudio || '{}');
    setShowVoicePopup(data.autoStartSpeech===true)
    setIsRecordingVoice(data.autoStartSpeech===true)
   setIsRecordingVoice(data.autoStartSpeech===true)
   setautoRecord(data.autoStartSpeech===true)
   

  }
  getStartupType()
}, [])

  // Initialize session on component mount
  useEffect(() => {
    initializeSession();
  }, []);

  // Initialize app mode preferences
  useEffect(() => {
    initializeAppMode();
  }, []);

  // Fire wave animations - start when recording
  useEffect(() => {
    if (isRecordingVoice) {
      // Create staggered fire wave animations
      const animations = [
        Animated.loop(
          Animated.sequence([
            Animated.timing(fireWave1, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(fireWave1, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(fireWave2, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(fireWave2, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(fireWave3, {
              toValue: 1,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(fireWave3, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(fireWave4, {
              toValue: 1,
              duration: 2100,
              useNativeDriver: true,
            }),
            Animated.timing(fireWave4, {
              toValue: 0,
              duration: 2100,
              useNativeDriver: true,
            }),
          ])
        ),
      ];

      // Start all animations with slight delays for staggered effect
      animations[0].start();
      setTimeout(() => animations[1].start(), 300);
      setTimeout(() => animations[2].start(), 600);
      setTimeout(() => animations[3].start(), 900);
    } else {
      // Reset all fire waves when not recording
      fireWave1.setValue(0);
      fireWave2.setValue(0);
      fireWave3.setValue(0);
      fireWave4.setValue(0);
    }
  }, [isRecordingVoice]);

  // Load available voices on component mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = realtimeVoiceService.getAvailableVoices();
      setAvailableVoices(voices);

      // Set current voice if available
      const currentVoice = realtimeVoiceService.getCurrentVoice();
      if (currentVoice) {
        setSelectedVoice(currentVoice);
      } else if (voices.length > 0) {
        setSelectedVoice(voices[0].name);
      }
    };

    // Load voices immediately
    loadVoices();

    // Also listen for voices changed event (for web browsers)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const initializeAppMode = async () => {
    try {
      const preferences = await AppModeService.getAppModePreferences();
      setCurrentAppMode(preferences.defaultMode);
      
      // Auto-start speech mode if enabled
      if (await AppModeService.shouldAutoStartSpeech()) {
        console.log('🎤 Auto-starting speech mode based on preferences');
        setIsVoiceModeEnabled(true);
        
        // Wait for current session to be available, then auto-start continuous recording
        const waitForSession = () => {
          if (currentSession?.id) {
            console.log('🎤 Auto-starting continuous voice recording...');
            // Auto-enable continuous mode since speech is the preferred mode
            startContinuousVoiceMode();
          } else {
            // Check again in 500ms
            setTimeout(waitForSession, 500);
          }
        };
        
        // Start checking for session after a brief delay
        setTimeout(waitForSession, 1000);
      }
    } catch (error) {
      console.error('❌ Error initializing app mode:', error);
      // Default to typing mode on error
      setCurrentAppMode('typing');
    }
  };



  const initializeSession = async () => {
    try {
      await createNewSession();

    } catch (error) {
      console.error('❌ Error initializing session:', error);
      // // Fallback to local mode without sessions
      // setMessages([{
      //   id: '1',
      //   type: 'assistant',
      //   content: '👋 **Welcome to MCP Chat!**\n\nI can help you access your Google Workspace data.\n\n**First time here?**\n1. Use `/connect` to link your Google account\n2. Then try `/calendar` or `/emails`\n3. Type `/help` to see all commands\n\n**Quick start:** Type `/connect` to begin!',
      //   timestamp: new Date().toISOString(),
      // }]);
    } finally {
      setIsSessionLoading(false);
    }
  };

  // const createNewSession = async () => {
  //   try {
  //     const session = await SessionService.createSession({
  //       title: `Chat - ${new Date().toLocaleDateString()}`,
  //       description: 'MCP Assistant conversation'
  //     });
      
  //     setCurrentSession(session);
  //     await AsyncStorage.setItem(CURRENT_SESSION_KEY, session.id);

  //     // Add welcome message to session
  //     // const welcomeContent = '👋 **Welcome to MCP Chat!**\n\nI can help you access your Google Workspace data.\n\n**First time here?**\n1. Use `/connect` to link your Google account\n2. Then try `/calendar` or `/emails`\n3. Type `/help` to see all commands\n\n**Quick start:** Type `/connect` to begin!';

  //     // await SessionService.addMessage(session.id, 'assistant', welcomeContent, {
  //     //   isWelcome: true
  //     // });

  //     // setMessages([{
  //     //   id: '1',
  //     //   type: 'assistant',
  //     //   content: welcomeContent,
  //     //   timestamp: new Date().toISOString(),
  //     // }]);

  //   } catch (error) {
  //     console.error('❌ Error creating session:', error);
  //     throw error;
  //   }
  // };

  const createNewSession = async () => {
    try {
      const generateSessionTitle = () => {
        const adjectives = ['Brave', 'Calm', 'Swift', 'Bright', 'Witty', 'Quiet', 'Bold', 'Lucky', 'Clever', 'Gentle'];
        const nouns = ['Lion', 'Ocean', 'Falcon', 'Forest', 'Mountain', 'River', 'Tiger', 'Sky', 'Storm', 'Phoenix'];
  
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
        const randomSuffix = Array.from({ length: 4 }, () =>
          String.fromCharCode(97 + Math.floor(Math.random() * 26))
        ).join('');
  
        return `${randomAdjective}-${randomNoun}-${randomSuffix}`;
      };
  
      const sessionTitle = generateSessionTitle();
  
      const session = await SessionService.createSession({
        title: sessionTitle,
        description: 'MCP Assistant conversation'
      });
  
      setCurrentSession(session);
      await AsyncStorage.setItem(CURRENT_SESSION_KEY, session.id);
  
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  };

  const loadSessionMessages = async (sessionId: string, useCache: boolean = true) => {
    try {
      // Check cache first
      if (useCache && messageCache.current.has(sessionId)) {
        const cachedMessages = messageCache.current.get(sessionId)!;
        setMessages(cachedMessages);
        return;
      }

      const sessionMessages = await SessionService.getSessionMessages(sessionId);

      const chatMessages: ChatMessage[] = sessionMessages.map((msg: Message) => ({
        id: msg.id,
        type: msg.role as ChatMessage['type'],
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata
      }));

      // Cache the messages
      messageCache.current.set(sessionId, chatMessages);
      setMessages(chatMessages);
    } catch (error) {
      console.error('❌ Error loading session messages:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (inputText.trim() === '' || isLoading || !currentSession) return;

    const userMessage = ChatService.createMessage('user', inputText.trim());
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    const currentInput = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Save user message to session (async, don't wait)
    SessionService.addMessage(currentSession.id, 'user', currentInput).catch(console.error);

    // Initialize streaming message
    const streamingId = ChatService.generateId();
    setStreamingMessage({
      id: streamingId,
      content: '',
      isStreaming: true,
    });

    // Define streaming callbacks
    const streamingCallbacks: StreamingCallbacks = {
      onStart: (data) => {
        console.log('🚀 Stream started:', data);
        if (data.cached) {
          setThinkingMessage('Using cached response...');
        } else if (data.isCommand) {
          setThinkingMessage('Processing command...');
        } else if (data.fallback) {
          setThinkingMessage('Processing your request...');
        } else {
          setThinkingMessage('Analyzing your request...');
        }
      },

      onToolSelection: (data) => {
        console.log('🎯 Tool selection:', data);
        if (data.status === 'analyzing') {
          setStreamingMessage(prev => prev ? {
            ...prev,
            toolStatus: 'analyzing'
          } : null);
          setThinkingMessage('Understanding your request...');
        } else if (data.status === 'selected') {
          setStreamingMessage(prev => prev ? {
            ...prev,
            toolName: data.tool,
            toolStatus: 'selected'
          } : null);
          setThinkingMessage(`Selected: ${data.tool}`);
        }
      },

      onToolExecution: (data) => {
        console.log('🔧 Tool execution:', data);
        if (data.status === 'executing') {
          setStreamingMessage(prev => prev ? {
            ...prev,
            toolName: data.tool,
            toolStatus: 'executing'
          } : null);
          setThinkingMessage(data.message || `Executing ${data.tool}...`);
        } else if (data.status === 'completed') {
          setThinkingMessage('Generating response...');
        }
      },

      onResponseChunk: (data) => {
        console.log('📝 Response chunk received:', { status: data.status, chunkLength: data.chunk?.length, isComplete: data.isComplete });

        if (data.status === 'generating') {
          setThinkingMessage('Generating response...');
          return;
        }

        // Update streaming message with new chunk
        setStreamingMessage(prev => {
          const newState = prev ? {
            ...prev,
            content: data.chunk,
            isStreaming: !data.isComplete,
            toolStatus: undefined // Clear tool status when response starts
          } : null;
          console.log('📝 Updated streaming message:', newState);
          return newState;
        });

        // Auto-scroll as content is being typed
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      },

      onComplete: (data) => {
        console.log('✅ Stream completed:', data);
        console.log('🔍 StreamingMessage state:', streamingMessage);
        console.log('🔍 UpdatedMessages length:', updatedMessages.length);

        // Use responses from data if available, fallback to streamingMessage content
        let finalMessages = [...updatedMessages];

        if (data.responses && data.responses.length > 0) {
          // Use the actual responses from the completion data
          console.log('✅ Using responses from data:', data.responses.length, 'responses');
          finalMessages = [...updatedMessages, ...data.responses];
        } else if (streamingMessage && streamingMessage.content) {
          console.log('✅ Using streamingMessage content:', streamingMessage.content.length, 'chars');
          // Fallback to streaming message content
          const finalMessage = ChatService.createMessage(
            'assistant',
            streamingMessage.content,
            {
              toolName: data.toolUsed,
              toolData: data.rawData,
              reasoning: data.reasoning
            }
          );
          finalMessages = [...updatedMessages, finalMessage];
        }

        // Update messages in UI
        console.log('🎯 Setting final messages:', finalMessages.length, 'total messages');
        setMessages(finalMessages);

        // Update cache
        messageCache.current.set(currentSession.id, finalMessages);

        // Save messages to session (async)
        const responsesToSave = data.responses || (streamingMessage?.content ? [
          ChatService.createMessage('assistant', streamingMessage.content, {
            toolName: data.toolUsed,
            toolData: data.rawData,
            reasoning: data.reasoning
          })
        ] : []);

        for (const response of responsesToSave) {
          SessionService.addMessage(
            currentSession.id,
            response.type as 'user' | 'assistant' | 'system',
            response.content,
            response.metadata
          ).catch(console.error);
        }

        // Add suggested actions if available
        if (data.suggestedActions && data.suggestedActions.length > 0) {
          const suggestionsMessage = ChatService.createMessage(
            'system',
            `💡 **Suggestions:**\n${data.suggestedActions.map((action: string) => `• ${action}`).join('\n')}`,
            { toolName: 'suggestions' }
          );

          const messagesWithSuggestions = [...finalMessages, suggestionsMessage];
          setMessages(messagesWithSuggestions);
          messageCache.current.set(currentSession.id, messagesWithSuggestions);

          SessionService.addMessage(
            currentSession.id,
            'system',
            suggestionsMessage.content,
            suggestionsMessage.metadata
          ).catch(console.error);
        }

        // Clear streaming state
        setStreamingMessage(null);
        setIsLoading(false);
        setThinkingMessage('');
      },

      onError: (error) => {
        console.error('❌ Streaming error:', error);

        const errorMessage = ChatService.createMessage(
          'assistant',
          `❌ **Error:** ${error}`,
          { error: true }
        );

        const finalMessages = [...updatedMessages, errorMessage];
        setMessages(finalMessages);

        // Update cache
        messageCache.current.set(currentSession.id, finalMessages);

        // Save error message
        SessionService.addMessage(
          currentSession.id,
          'assistant',
          errorMessage.content,
          errorMessage.metadata
        ).catch(console.error);

        // Clear streaming state
        setStreamingMessage(null);
        setIsLoading(false);
        setThinkingMessage('');
      }
    };

    try {
      // Start streaming
      await ChatService.processMessageWithStreaming(currentInput, streamingCallbacks, currentSession.id);
    } catch (error) {
      console.error('❌ Streaming failed, falling back to regular processing:', error);

      // Fallback to regular processing
      setStreamingMessage(null);
      setThinkingMessage('Processing request...');

      try {
        const responses = await ChatService.processMessage(currentInput, currentSession.id);
        const finalMessages = [...updatedMessages, ...responses];
        setMessages(finalMessages);

        // Update cache
        messageCache.current.set(currentSession.id, finalMessages);

        // Save responses to session
        for (const response of responses) {
          SessionService.addMessage(
            currentSession.id,
            response.type as Message['role'],
            response.content,
            response.metadata
          ).catch(console.error);
        }

      } catch (fallbackError) {
        const errorMessage = ChatService.createMessage(
          'assistant',
          `❌ **Error:** ${fallbackError instanceof Error ? fallbackError.message : 'Something went wrong'}`,
          { error: true }
        );

        const finalMessages = [...updatedMessages, errorMessage];
        setMessages(finalMessages);
        messageCache.current.set(currentSession.id, finalMessages);

        SessionService.addMessage(
          currentSession.id,
          'assistant',
          errorMessage.content,
          errorMessage.metadata
        ).catch(console.error);
      }

      setIsLoading(false);
      setThinkingMessage('');
    }
  };

  const handleVoiceMessage = async (userText: string, aiText: string, audioData: ArrayBuffer) => {
    if (!currentSession) return;

    try {
      // Add user message to UI
      const userMessage = ChatService.createMessage('user', userText, { isVoice: true });
      const aiMessage = ChatService.createMessage('assistant', aiText, { isVoice: true });

      const updatedMessages = [...messages, userMessage, aiMessage];
      setMessages(updatedMessages);

      // Update cache
      messageCache.current.set(currentSession.id, updatedMessages);

      // Save messages to session storage
      try {
        await SessionService.addMessage(currentSession.id, 'user', userText, { isVoice: true });
        await SessionService.addMessage(currentSession.id, 'assistant', aiText, { isVoice: true });
        console.log('✅ Voice messages saved to session storage');
      } catch (sessionError) {
        console.error('❌ Error saving voice messages to session:', sessionError);
      }

      // Auto-scroll to latest message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      console.log('🎤 Voice message added:', { userText: userText.substring(0, 50), aiText: aiText.substring(0, 50) });

    } catch (error) {
      console.error('❌ Error handling voice message:', error);
    }
  };

  const handleVoiceModeChange = (enabled: boolean) => {
    setIsVoiceModeEnabled(enabled);
    if (enabled) {
      console.log('🗣️ Voice mode enabled');
    } else {
      console.log('🔇 Voice mode disabled');
    }
  };

  const handleCloseVoiceModal = () => {
    console.log('🔒 Closing voice modal and stopping conversation');
    setForceStopVoice(true);
    setShowVoicePopup(false);
    setIsRecordingVoice(false);

    // Reset force stop after a brief delay
    setTimeout(() => {
      setForceStopVoice(false);
    }, 500);
  };

  const startContinuousVoiceMode = async () => {
    try {
      if (!currentSession?.id) {
        console.warn('⚠️ No session available for continuous voice mode');
        return;
      }
      
      // Import VoiceService dynamically to avoid import issues
      const { VoiceService } = await import('../../services/voiceService');
      
      // Enable conversation mode on the backend first
      await VoiceService.enableConversationMode(currentSession.id);
      
      // The VoiceChat component should automatically start continuous mode
      // since we're setting voice mode to enabled
      console.log('✅ Continuous voice mode started for session:', currentSession.id);
      
    } catch (error) {
      console.error('❌ Error starting continuous voice mode:', error);
    }
  };

  const handleNewSession = async () => {
    try {
      setIsSessionLoading(true);
      await createNewSession();
    } catch (error) {
      Alert.alert('Error', 'Failed to create new session');
    } finally {
      setIsSessionLoading(false);
    }
  };

  // Push-to-talk recording functions
  const startPushToTalkRecording = async () => {
    try {
      setIsRecordingVoice(true);
      
      // Initialize voice service if not already done
      const { VoiceService } = await import('../../services/voiceService');
      const voiceService = new VoiceService();
      
      await voiceService.startRecording();
      
      console.log('🎤 Started push-to-talk recording');
    } catch (error) {
      console.error('❌ Error starting push-to-talk recording:', error);
      setIsRecordingVoice(false);
    }
  };

  const handleVoiceSelection = (voiceName: string) => {
    const success = realtimeVoiceService.setVoice(voiceName);
    if (success) {
      setSelectedVoice(voiceName);
      console.log('🎤 Voice changed to:', voiceName);
    }
    setShowVoiceSelection(false);
  };

  const stopPushToTalkRecording = async () => {
    try {
      const { VoiceService } = await import('../../services/voiceService');
      const voiceService = new VoiceService();
      
      const audioUri = await voiceService.stopRecording();
      setIsRecordingVoice(false);
      
      if (audioUri && currentSession?.id) {
        console.log('🎤 Processing voice message with audioUri:', audioUri);
        
        // Process the voice message
        const result = await VoiceService.processVoiceMessage(audioUri);
        
        console.log('📤 Voice processing result:', {
          success: result.success,
          hasUserText: !!result.userText,
          hasAiText: !!result.aiText,
          hasAudioData: !!result.audioData,
          error: result.error
        });
        
        if (result.success && result.userText && result.aiText) {
          console.log('✅ Adding voice messages to chat...');
          // Add messages to chat
          await handleVoiceMessage(result.userText, result.aiText, result.audioData || new ArrayBuffer(0));
          
          // Play the audio response if available
          if (result.audioData) {
            try {
              console.log('🔊 Playing AI audio response...');
              await VoiceService.playAudioResponse(result.audioData);
            } catch (audioError) {
              console.error('❌ Error playing audio response:', audioError);
            }
          }
        } else {
          console.error('❌ Voice processing failed or missing data:', result.error);
          Alert.alert('Voice Processing Error', result.error || 'Failed to process voice message');
        }
      } else {
        console.warn('⚠️ No audio URI or session available');
      }
      
      // Hide the popup after recording
      setShowVoicePopup(false);
      
    } catch (error) {
      console.error('❌ Error stopping push-to-talk recording:', error);
      setIsRecordingVoice(false);
      setShowVoicePopup(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setIsSessionLoading(true);
      const session = await SessionService.getSession(sessionId);
      setCurrentSession(session);
      await AsyncStorage.setItem(CURRENT_SESSION_KEY, sessionId);
      await loadSessionMessages(sessionId);
      setShowSessions(false); // Close sessions sidebar
    } catch (error) {
      Alert.alert('Error', 'Failed to load session');
      console.error('❌ Error selecting session:', error);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const getMessageIcon = (type: ChatMessage['type'], metadata?: any) => {
    if (metadata?.loading) return 'hourglass-outline';
    if (metadata?.error) return 'alert-circle-outline';

    switch (type) {
      case 'user': return 'person-outline';
      case 'assistant': return 'chatbubble-ellipses-outline';
      case 'system': return 'settings-outline';
      case 'tool': return 'construct-outline';
      default: return 'chatbubble-outline';
    }
  };

  const getMessageColor = (type: ChatMessage['type'], metadata?: any) => {
    if (metadata?.error) return '#dc3545';
    if (metadata?.loading) return '#ffc107';

    switch (type) {
      case 'user': return '#fff';
      case 'assistant': return '#4285F4';
      case 'system': return '#6c757d';
      case 'tool': return '#28a745';
      default: return '#4285F4';
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.type === 'user';
    const isSystem = item.type === 'system';
    const isTool = item.type === 'tool';
    const isFile = item.type === 'file';
    const isDocument = item.type === 'document';

    // Handle specialized card types
    if (isFile && item.metadata?.toolData) {
      return (
        <View style={[styles.messageContainer, styles.assistantMessage]}>
          <FileOperationCard
            result={item.metadata.toolData}
            operation={item.metadata.toolName || 'File Operation'}
            onOpenFile={(filePath) => {
              console.log('Open file:', filePath);
              // TODO: Implement file opening
            }}
            onShareFile={(filePath) => {
              console.log('Share file:', filePath);
              // TODO: Implement file sharing
            }}
          />
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      );
    }

    if (isDocument && item.metadata?.toolData) {
      return (
        <View style={[styles.messageContainer, styles.assistantMessage]}>
          <DocumentAnalysisCard
            result={item.metadata.toolData}
            onViewFullDocument={() => {
              console.log('View full document');
              // TODO: Implement full document viewing
            }}
          />
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      );
    }

    // Handle Google Drive search results
    if (item.metadata?.toolName?.includes('Drive') && item.metadata?.toolData) {
      return (
        <View style={[styles.messageContainer, styles.assistantMessage]}>
          <DriveFileCard
            result = {{
              success: true,
              data: item.metadata.toolData
            }}
            
            onOpenFile={(fileId) => {
              console.log('Open Drive file:', fileId);
              // TODO: Implement Drive file opening
            }}
            onDownloadFile={(fileId) => {
              console.log('Download Drive file:', fileId);
              // TODO: Implement Drive file download
            }}
            onShareFile={(fileId) => {
              console.log('Share Drive file:', fileId);
              // TODO: Implement Drive file sharing
            }}
          />
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.assistantMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble :
            isSystem ? styles.systemBubble :
              isTool ? styles.toolBubble :
                styles.assistantBubble
        ]}>
          {!isUser && (
            <View style={styles.messageHeader}>
              <Ionicons
                name={getMessageIcon(item.type, item.metadata)}
                size={16}
                color={getMessageColor(item.type, item.metadata)}
              />
              <Text style={[
                styles.messageRole,
                { color: getMessageColor(item.type, item.metadata) }
              ]}>
                {isSystem ? 'System' : isTool ? 'Tool' : 'Assistant'}
              </Text>
              {/* {item.metadata?.loading && (
                <ActivityIndicator size="small" color={colors.warning} style={styles.loadingSpinner} />
              )} */}
            </View>
          )}

          {renderFormattedText(item.content, [
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
            item.metadata?.error && styles.errorText
          ])}

          {/* Voice message indicator */}
          {item.metadata?.isVoice && (
            <View style={styles.voiceBadge}>
              <MaterialIcons name="mic" size={12} color={colors.primary} />
              <Text style={styles.voiceText}>Voice</Text>
            </View>
          )}

          {item.metadata?.toolName && !item.metadata?.isVoice && (
            <View style={styles.toolBadge}>
              <MaterialIcons name="build" size={12} color={colors.success} />
              <Text style={styles.toolText}>{item.metadata.toolName}</Text>
            </View>
          )}
        </View>

        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  const suggestedCommands = ['/connect', '/status', '/help', '/calendar', '/emails'];

  // Function to render text with basic markdown formatting
  const renderFormattedText = (content: string, baseStyle: any[]) => {
    // Process line by line for better structure
    const lines = content.split('\n');

    return (
      <View>
        {lines.map((line, lineIndex) => {
          // Handle headers (# ## ###)
          const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const headerText = headerMatch[2];
            return (
              <Text key={lineIndex} style={[
                ...baseStyle,
                {
                  fontWeight: 'bold',
                  fontSize: level === 1 ? 20 : level === 2 ? 18 : 16,
                  marginTop: lineIndex > 0 ? 8 : 0,
                  marginBottom: 4
                }
              ]}>
                {renderInlineFormatting(headerText, baseStyle)}
              </Text>
            );
          }

          // Handle bullet points (- or *)
          const bulletMatch = line.match(/^[-*]\s+(.+)$/);
          if (bulletMatch) {
            const bulletText = bulletMatch[1];
            return (
              <Text key={lineIndex} style={baseStyle}>
                • {renderInlineFormatting(bulletText, baseStyle)}
              </Text>
            );
          }

          // Handle numbered lists (1. 2. etc)
          const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
          if (numberedMatch) {
            const number = numberedMatch[1];
            const listText = numberedMatch[2];
            return (
              <Text key={lineIndex} style={baseStyle}>
                {number}. {renderInlineFormatting(listText, baseStyle)}
              </Text>
            );
          }

          // Regular line
          return (
            <Text key={lineIndex} style={baseStyle}>
              {renderInlineFormatting(line, baseStyle)}
            </Text>
          );
        })}
      </View>
    );
  };

  // Helper function to render inline formatting (bold, italic, code)
  const renderInlineFormatting = (text: string, baseStyle: any[]) => {
    // Split text by markdown patterns while preserving the markers
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return parts.map((part, index) => {
      // Handle bold text **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} style={{ fontWeight: 'bold' }}>
            {boldText}
          </Text>
        );
      }
      // Handle italic text *text*
      else if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
        const italicText = part.slice(1, -1);
        return (
          <Text key={index} style={{ fontStyle: 'italic' }}>
            {italicText}
          </Text>
        );
      }
      // Handle inline code `text`
      else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        const codeText = part.slice(1, -1);
        return (
          <Text key={index} style={{
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            backgroundColor: colors.surfaceVariant,
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4
          }}>
            {codeText}
          </Text>
        );
      }
      // Regular text
      else {
        return part;
      }
    });
  };

  if (isSessionLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Initializing chat session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (

    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.gradientBackground} style={styles.container}>
        {/* Header with session info and controls */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.sessionsToggle}
            onPress={() => setShowSessions(!showSessions)}
          >
            <MaterialIcons
              name={showSessions ? "close" : "menu"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          
          <View style={styles.sessionInfo}>
            <MaterialIcons name="chat" size={20} color={colors.primary} />
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {currentSession?.title || 'Chat Session'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.newChatButton} onPress={handleNewSession}>
            <MaterialIcons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Sessions Sidebar */}
        {showSessions && (
          <View style={styles.sessionsOverlay}>
            <TouchableOpacity
              style={styles.overlay}
              onPress={() => setShowSessions(false)}
            />
            <View style={styles.sessionsSidebar}>
              <SessionList

                onSelectSession={handleSelectSession}
                currentSessionId={currentSession?.id}
                onNewSession={handleNewSession}
              />
            </View>
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {
            messages.length > 0 ? (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={20}
                windowSize={10}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>🔥 How can I help you today?</Text>
              </View>
            )
          }

          {/* Note: Removed streaming message and thinking animation for cleaner voice experience */}



          {/* Voice Chat Component */}
          

          <View style={styles.inputContainer}>
            {/* Voice Button - Left of input */}
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={() => setShowVoicePopup(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="mic" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TextInput
              style={[
                styles.textInput,
                isVoiceModeEnabled && { opacity: 0.6 }
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isVoiceModeEnabled ? "Voice mode active - use mic above" : "Type a message or /command..."}
              placeholderTextColor="#8e8e93"
              multiline
              maxLength={500}
              editable={!isLoading && !isVoiceModeEnabled}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading || isVoiceModeEnabled) && styles.sendButtonDisabled
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading || isVoiceModeEnabled}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <MaterialIcons
                  name="send"
                  size={20}
                  color={(!inputText.trim() || isLoading || isVoiceModeEnabled) ? colors.primary : "white"}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Floating Action Button for Document Creation */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowDocumentModal(true)}
          >
            <MaterialIcons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Document Creation Modal */}
        <DocumentCreationModal
          visible={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
        />

        {/* Push-to-Talk Modal */}
        <Modal
          visible={showVoicePopup}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseVoiceModal}
        >
          <View style={styles.voiceModalOverlay}>
            <TouchableOpacity
              style={styles.voiceModalBackdrop}
              onPress={handleCloseVoiceModal}
            />
            <View style={styles.voiceModalContainer}>
              {/* Modal Header with Voice Selection Button */}
              <View style={styles.voiceModalHeader}>
                <Text style={styles.voiceModalTitle}>Voice Chat</Text>
                <TouchableOpacity
                  style={styles.voiceSelectionButton}
                  onPress={() => setShowVoiceSelection(true)}
                >
                  <Ionicons name="person-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Big Push-to-Talk Button with Fire Wave Effects */}
              <View style={styles.voiceButtonContainer}>
                {/* Fire Wave Effects */}
            
              <View style={{marginTop:10}}>

                <RealtimeVoiceChat
                  sessionId={currentSession?.id}
                  onVoiceMessage={handleVoiceMessage}
                  onRecordingStateChange={setIsRecordingVoice}
                  disabled={isLoading}
                  autoRecording={autoRecord}
                  naturalConversation={autoRecord}
                  forceStop={forceStopVoice}
                />
              </View>
              </View>
              
              <TouchableOpacity
                style={styles.voiceModalCancelButton}
                onPress={handleCloseVoiceModal}
              >
                <Text style={styles.voiceModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Voice Selection Modal */}
        <Modal
          visible={showVoiceSelection}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowVoiceSelection(false)}
        >
          <View style={styles.voiceModalOverlay}>
            <View style={styles.voiceSelectionModal}>
              <Text style={styles.voiceSelectionTitle}>Select Voice</Text>

              <FlatList
                data={availableVoices}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.voiceItem,
                      selectedVoice === item.name && styles.selectedVoiceItem
                    ]}
                    onPress={() => handleVoiceSelection(item.name)}
                  >
                    <Ionicons
                      name={selectedVoice === item.name ? "checkmark-circle" : "person-outline"}
                      size={24}
                      color={selectedVoice === item.name ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.voiceInfo}>
                      <Text style={styles.voiceName}>{item.name}</Text>
                      <Text style={styles.voiceLanguage}>
                        {item.lang} • {item.localService ? 'Local' : 'Remote'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                maxToRenderPerBatch={10}
                windowSize={10}
              />

              <TouchableOpacity
                style={styles.voiceSelectionClose}
                onPress={() => setShowVoiceSelection(false)}
              >
                <Text style={styles.voiceSelectionCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}
