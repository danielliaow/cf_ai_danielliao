import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StreamEvent } from '../services/continuousStreamingService';

interface InlineToolExecutionProps {
  isProcessing: boolean;
  currentEvent?: StreamEvent;
  currentTool?: string;
  progress?: number;
  onToggleDetails?: () => void;
  showDetails?: boolean;
}

export default function InlineToolExecution({
  isProcessing,
  currentEvent,
  currentTool,
  progress = 0,
  onToggleDetails,
  showDetails = false,
}: InlineToolExecutionProps) {
  const [spinValue] = useState(new Animated.Value(0));
  const [pulseValue] = useState(new Animated.Value(1));
  const [progressValue] = useState(new Animated.Value(0));

  // Spinning animation for loading
  useEffect(() => {
    if (isProcessing) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [isProcessing]);

  // Pulse animation
  useEffect(() => {
    if (isProcessing) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isProcessing]);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: progress / 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isProcessing && !currentEvent) {
    return null;
  }

  const getToolIcon = (toolName: string) => {
    const iconMap: { [key: string]: any } = {
      'getEmails': 'mail',
      'getTodaysEvents': 'calendar',
      'searchGoogleDrive': 'cloud-outline',
      'createGoogleDriveFile': 'document',
      'searchWeb': 'search',
      'crawlPage': 'globe',
      'readFile': 'document-text',
      'writeFile': 'create',
      'processDocument': 'document-outline',
      'createDocument': 'add-circle',
      'generateContentWithAI': 'bulb',
    };
    return iconMap[toolName] || 'construct';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'failed': return '#F44336';
      case 'in_progress': return '#2196F3';
      default: return '#FF9800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'failed': return 'close-circle';
      case 'in_progress': return 'time';
      default: return 'ellipsis-horizontal-circle';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.mainCard}
        onPress={onToggleDetails}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            {isProcessing ? (
              <Animated.View style={{ transform: [{ rotate: spin }, { scale: pulseValue }] }}>
                <Ionicons
                  name={getToolIcon(currentTool || '')}
                  size={24}
                  color="#2196F3"
                />
              </Animated.View>
            ) : (
              <Ionicons
                name={getStatusIcon(currentEvent?.status || '')}
                size={24}
                color={getStatusColor(currentEvent?.status || '')}
              />
            )}
          </View>
          
          <View style={styles.content}>
            <Text style={styles.title}>
              {currentEvent?.title || `Executing ${currentTool}`}
            </Text>
            {currentEvent?.description && (
              <Text style={styles.description} numberOfLines={1}>
                {currentEvent.description}
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            {progress > 0 && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
            )}
            
            <Ionicons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </View>
        </View>

        {/* Animated progress bar */}
        {progress > 0 && (
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Expandable details */}
      {showDetails && currentEvent && (
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <Ionicons
                name={getStatusIcon(currentEvent.status)}
                size={12}
                color={getStatusColor(currentEvent.status)}
              />
              <Text style={[styles.statusText, { color: getStatusColor(currentEvent.status) }]}>
                {currentEvent.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {currentEvent.duration && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{currentEvent.duration}ms</Text>
            </View>
          )}

          {currentEvent.toolName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tool:</Text>
              <Text style={styles.detailValue}>{currentEvent.toolName}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {new Date(currentEvent.timestamp).toLocaleTimeString()}
            </Text>
          </View>

          {currentEvent.data && (
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Data:</Text>
              <Text style={styles.dataValue} numberOfLines={3}>
                {typeof currentEvent.data === 'string' 
                  ? currentEvent.data 
                  : JSON.stringify(currentEvent.data, null, 2)
                }
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    marginRight: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  progressBarContainer: {
    marginTop: 12,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  detailsCard: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 70,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  dataContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 11,
    color: '#555',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
});