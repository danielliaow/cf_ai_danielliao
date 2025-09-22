import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  toolName?: string;
  toolStatus?: string;
  onStreamComplete?: () => void;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  isStreaming,
  toolName,
  toolStatus,
  onStreamComplete,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Typing effect
  useEffect(() => {
    if (!content) {
      setDisplayedText('');
      return;
    }

    if (isStreaming) {
      // Character-by-character typing effect
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < content.length) {
          setDisplayedText(content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setShowCursor(false);
          onStreamComplete?.();
        }
      }, 30); // 30ms per character for smooth typing

      return () => clearInterval(typingInterval);
    } else {
      // Instant display for non-streaming
      setDisplayedText(content);
      setShowCursor(false);
    }
  }, [content, isStreaming, onStreamComplete]);

  // Cursor blinking animation
  useEffect(() => {
    if (showCursor && isStreaming) {
      const cursorAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      cursorAnimation.start();

      return () => cursorAnimation.stop();
    }
  }, [showCursor, isStreaming, cursorOpacity]);

  const getToolIcon = (tool?: string, status?: string) => {
    if (status === 'executing' || status === 'analyzing') {
      return <Ionicons name="hourglass" size={14} color="#4285F4" />;
    }
    
    switch (tool) {
      case 'getTodaysEvents':
        return <MaterialIcons name="event" size={14} color="#4285F4" />;
      case 'getEmails':
      case 'getLastTenMails':
        return <MaterialIcons name="email" size={14} color="#4285F4" />;
      default:
        return <Ionicons name="construct" size={14} color="#4285F4" />;
    }
  };

  const getStatusMessage = (tool?: string, status?: string) => {
    if (status === 'analyzing') return 'Analyzing your request...';
    if (status === 'selected') return `Selected: ${tool}`;
    if (status === 'executing') return `Executing ${tool}...`;
    if (status === 'completed') return `Completed: ${tool}`;
    return '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.messageBubble}>
        {(toolName || toolStatus) && (
          <View style={styles.toolHeader}>
            {getToolIcon(toolName, toolStatus)}
            <Text style={styles.toolText}>
              {getStatusMessage(toolName, toolStatus)}
            </Text>
          </View>
        )}
        
        {displayedText && (
          <View style={styles.textContainer}>
            <Text style={styles.messageText}>
              {displayedText}
              {showCursor && isStreaming && (
                <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
                  |
                </Animated.Text>
              )}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  messageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 16,
    padding: 12,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  toolText: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '600',
    marginLeft: 6,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#202124',
    flex: 1,
  },
  cursor: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: 'bold',
  },
});