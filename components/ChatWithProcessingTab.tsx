import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProcessingTab from './ProcessingTab';
import continuousStreamingService, { StreamEvent, ContinuousStreamCallbacks } from '../services/continuousStreamingService';
import { useAuth } from '../contexts/AuthContext';

const { height: screenHeight } = Dimensions.get('window');

interface ChatWithProcessingTabProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export default function ChatWithProcessingTab({ 
  sessionId,
  onSessionCreated 
}: ChatWithProcessingTabProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingEvents, setProcessingEvents] = useState<StreamEvent[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showProcessingTab, setShowProcessingTab] = useState(false);
  const [processingTabMinimized, setProcessingTabMinimized] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  
  const textInputRef = useRef<TextInput>(null);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      continuousStreamingService.stopAllStreams();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const query = message.trim();
    setCurrentQuery(query);
    setMessage('');
    setIsProcessing(true);
    setProcessingEvents([]);
    setShowProcessingTab(true);
    setProcessingTabMinimized(false);

    try {
      const callbacks: ContinuousStreamCallbacks = {
        onEvent: (event: StreamEvent) => {
          console.log('📡 Processing Event:', event);
          setProcessingEvents(prev => [...prev, event]);
        },
        onError: (error: Error) => {
          console.error('❌ Processing Error:', error);
          setProcessingEvents(prev => [...prev, {
            id: `error-${Date.now()}`,
            timestamp: new Date(),
            type: 'error',
            title: `Error: ${error.message}`,
            status: 'failed',
            data: { error: error.message }
          }]);
          setIsProcessing(false);
          Alert.alert('Processing Error', error.message);
        },
        onComplete: () => {
          console.log('✅ Processing Complete');
          setIsProcessing(false);
          setProcessingEvents(prev => [...prev, {
            id: `complete-${Date.now()}`,
            timestamp: new Date(),
            type: 'completion',
            title: '🎉 Processing completed successfully',
            status: 'completed',
            data: { message: 'All tasks completed successfully' }
          }]);
        },
        onToolStart: (toolName: string, params: any) => {
          console.log('🔧 Tool Started:', toolName, params);
        },
        onToolProgress: (toolName: string, progress: number, data?: any) => {
          console.log('📊 Tool Progress:', toolName, progress, data);
        },
        onToolComplete: (toolName: string, result: any, duration?: number) => {
          console.log('✅ Tool Complete:', toolName, result, duration);
        }
      };

      const streamId = await continuousStreamingService.processQueryContinuously(
        query,
        {
          timestamp: new Date().toISOString(),
          userId: user?.id,
        },
        callbacks,
        sessionId
      );

      setActiveStreamId(streamId);

    } catch (error) {
      console.error('Failed to start processing:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to start processing your request');
    }
  };

  const handleStopProcessing = () => {
    if (activeStreamId) {
      continuousStreamingService.stopStream(activeStreamId);
      setIsProcessing(false);
      setActiveStreamId(null);
      
      setProcessingEvents(prev => [...prev, {
        id: `stopped-${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        title: '⏹️ Processing stopped by user',
        status: 'failed',
        data: { message: 'Processing was manually stopped' }
      }]);
    }
  };

  const handleCloseProcessingTab = () => {
    if (isProcessing && activeStreamId) {
      Alert.alert(
        'Stop Processing?',
        'This will stop the current processing. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Stop', 
            style: 'destructive',
            onPress: () => {
              handleStopProcessing();
              setShowProcessingTab(false);
            }
          }
        ]
      );
    } else {
      setShowProcessingTab(false);
    }
  };

  const handleMinimizeProcessingTab = () => {
    setProcessingTabMinimized(!processingTabMinimized);
  };

  if (showProcessingTab && !processingTabMinimized) {
    return (
      <View style={styles.container}>
        <ProcessingTab
          isProcessing={isProcessing}
          events={processingEvents}
          currentQuery={currentQuery}
          onClose={handleCloseProcessingTab}
          onMinimize={handleMinimizeProcessingTab}
          minimized={false}
        />
        
        {/* Input overlay */}
        <View style={styles.inputOverlay}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder={isProcessing ? "Processing..." : "Ask me anything..."}
              placeholderTextColor="#999"
              multiline
              maxLength={2000}
              editable={!isProcessing}
            />
            
            <View style={styles.inputActions}>
              {isProcessing ? (
                <TouchableOpacity 
                  style={styles.stopButton}
                  onPress={handleStopProcessing}
                >
                  <Ionicons name="stop" size={20} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={!message.trim()}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Main Chat Interface */}
      <View style={styles.mainChatContainer}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>AI Assistant</Text>
          <Text style={styles.welcomeSubtitle}>
            Send complex queries to see real-time processing with tools and implementation plans
          </Text>
          
          <View style={styles.exampleQueries}>
            <Text style={styles.exampleTitle}>Try these examples:</Text>
            
            <TouchableOpacity 
              style={styles.exampleQuery}
              onPress={() => setMessage("Get my emails from today and save a summary to my Google Drive")}
            >
              <Text style={styles.exampleText}>
                "Get my emails from today and save a summary to my Google Drive"
              </Text>
              <Ionicons name="add" size={16} color="#2196F3" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.exampleQuery}
              onPress={() => setMessage("Create a comprehensive weekly report from my calendar and emails")}
            >
              <Text style={styles.exampleText}>
                "Create a comprehensive weekly report from my calendar and emails"
              </Text>
              <Ionicons name="add" size={16} color="#2196F3" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.exampleQuery}
              onPress={() => setMessage("Analyze my productivity data and set up automated workflows")}
            >
              <Text style={styles.exampleText}>
                "Analyze my productivity data and set up automated workflows"
              </Text>
              <Ionicons name="add" size={16} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Ask me anything..."
          placeholderTextColor="#999"
          multiline
          maxLength={2000}
        />
        
        <View style={styles.inputActions}>
          <TouchableOpacity 
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Minimized Processing Tab */}
      {showProcessingTab && processingTabMinimized && (
        <ProcessingTab
          isProcessing={isProcessing}
          events={processingEvents}
          currentQuery={currentQuery}
          onClose={handleCloseProcessingTab}
          onMinimize={handleMinimizeProcessingTab}
          minimized={true}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mainChatContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exampleQueries: {
    width: '100%',
    maxWidth: 400,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exampleQuery: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    maxHeight: 120,
    fontSize: 16,
    color: '#333',
    marginRight: 12,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  stopButton: {
    backgroundColor: '#F44336',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});