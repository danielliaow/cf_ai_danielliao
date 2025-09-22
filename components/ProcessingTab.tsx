import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ProcessingEvent {
  id: string;
  timestamp: Date;
  type: 'plan_generation' | 'tool_execution' | 'step_progress' | 'completion' | 'error';
  title: string;
  description?: string;
  progress?: number;
  data?: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolName?: string;
  stepId?: string;
  duration?: number;
}

interface ProcessingTabProps {
  isProcessing: boolean;
  events: ProcessingEvent[];
  currentQuery?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  minimized?: boolean;
}

export default function ProcessingTab({
  isProcessing,
  events,
  currentQuery,
  onClose,
  onMinimize,
  minimized = false
}: ProcessingTabProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showLogs, setShowLogs] = useState(true);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (events.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [events.length]);

  // Pulse animation for processing indicator
  useEffect(() => {
    if (isProcessing) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isProcessing) pulse();
        });
      };
      pulse();
    }
  }, [isProcessing, pulseAnim]);

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (event: ProcessingEvent) => {
    switch (event.type) {
      case 'plan_generation':
        return event.status === 'in_progress' ? 
          <ActivityIndicator size="small" color="#2196F3" /> :
          <Ionicons name="list-outline" size={16} color="#2196F3" />;
      case 'tool_execution':
        return event.status === 'in_progress' ?
          <ActivityIndicator size="small" color="#FF9800" /> :
          <MaterialIcons name="build" size={16} color="#FF9800" />;
      case 'step_progress':
        return event.status === 'completed' ?
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> :
          <ActivityIndicator size="small" color="#2196F3" />;
      case 'completion':
        return <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />;
      case 'error':
        return <Ionicons name="close-circle" size={16} color="#F44336" />;
      default:
        return <Ionicons name="information-circle" size={16} color="#666" />;
    }
  };

  const getEventStatusColor = (status: ProcessingEvent['status']) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'failed': return '#F44336';
      case 'in_progress': return '#2196F3';
      default: return '#666';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getActiveTools = () => {
    return events
      .filter(e => e.type === 'tool_execution' && e.status === 'in_progress')
      .map(e => e.toolName)
      .filter(Boolean);
  };

  const getCompletedSteps = () => {
    return events.filter(e => e.status === 'completed').length;
  };

  const getTotalSteps = () => {
    return events.filter(e => e.type === 'step_progress').length;
  };

  if (minimized) {
    return (
      <TouchableOpacity style={styles.minimizedContainer} onPress={onMinimize}>
        <LinearGradient
          colors={isProcessing ? ['#2196F3', '#1976D2'] : ['#4CAF50', '#388E3C']}
          style={styles.minimizedGradient}
        >
          <Animated.View style={[styles.minimizedContent, { transform: [{ scale: pulseAnim }] }]}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
            <Text style={styles.minimizedText}>
              {isProcessing ? `Processing... (${getCompletedSteps()}/${getTotalSteps()})` : 'Complete'}
            </Text>
            {getActiveTools().length > 0 && (
              <Text style={styles.minimizedTools}>
                {getActiveTools().join(', ')}
              </Text>
            )}
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={isProcessing ? ['#2196F3', '#1976D2'] : ['#4CAF50', '#388E3C']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              )}
            </Animated.View>
            <Text style={styles.headerTitle}>
              {isProcessing ? 'Processing...' : 'Processing Complete'}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowLogs(!showLogs)} style={styles.headerButton}>
              <Ionicons 
                name={showLogs ? "eye-off" : "eye"} 
                size={18} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onMinimize} style={styles.headerButton}>
              <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {currentQuery && (
          <Text style={styles.queryText} numberOfLines={2}>
            "{currentQuery}"
          </Text>
        )}

        {/* Progress Summary */}
        <View style={styles.progressSummary}>
          <Text style={styles.progressText}>
            {getCompletedSteps()}/{getTotalSteps()} steps completed
          </Text>
          {getActiveTools().length > 0 && (
            <Text style={styles.activeTools}>
              Active: {getActiveTools().join(', ')}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* Event Stream */}
      {showLogs && (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.eventsContainer}
          showsVerticalScrollIndicator={false}
        >
          {events.map((event, index) => (
            <TouchableOpacity
              key={event.id}
              style={[
                styles.eventItem,
                event.status === 'in_progress' && styles.activeEvent,
                event.status === 'failed' && styles.errorEvent,
              ]}
              onPress={() => toggleEventExpansion(event.id)}
            >
              {/* Event Timeline Connector */}
              {index > 0 && <View style={styles.timelineConnector} />}
              
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventLeft}>
                    <View style={[
                      styles.eventIcon,
                      { backgroundColor: getEventStatusColor(event.status) + '20' }
                    ]}>
                      {getEventIcon(event)}
                    </View>
                    
                    <View style={styles.eventInfo}>
                      <Text style={[
                        styles.eventTitle,
                        { color: getEventStatusColor(event.status) }
                      ]}>
                        {event.title}
                      </Text>
                      <Text style={styles.eventTime}>
                        {event.timestamp.toLocaleTimeString()}
                        {event.duration && ` • ${formatDuration(event.duration)}`}
                      </Text>
                    </View>
                  </View>

                  {event.progress !== undefined && (
                    <Text style={styles.progressPercentage}>
                      {Math.round(event.progress * 100)}%
                    </Text>
                  )}

                  <Ionicons 
                    name={expandedEvents.has(event.id) ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#666" 
                  />
                </View>

                {/* Progress Bar */}
                {event.progress !== undefined && event.status === 'in_progress' && (
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill,
                          { 
                            width: `${event.progress * 100}%`,
                            backgroundColor: getEventStatusColor(event.status)
                          }
                        ]} 
                      />
                    </View>
                  </View>
                )}

                {/* Expanded Details */}
                {expandedEvents.has(event.id) && (
                  <View style={styles.eventDetails}>
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                    
                    {event.toolName && (
                      <View style={styles.toolBadge}>
                        <MaterialIcons name="build" size={12} color="#FF9800" />
                        <Text style={styles.toolName}>{event.toolName}</Text>
                      </View>
                    )}

                    {event.data && (
                      <View style={styles.eventDataContainer}>
                        <Text style={styles.eventDataLabel}>Data:</Text>
                        <ScrollView 
                          horizontal 
                          style={styles.eventDataScroll}
                          showsHorizontalScrollIndicator={false}
                        >
                          <Text style={styles.eventData}>
                            {typeof event.data === 'string' 
                              ? event.data 
                              : JSON.stringify(event.data, null, 2)
                            }
                          </Text>
                        </ScrollView>
                      </View>
                    )}

                    {event.status === 'failed' && event.data?.error && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="warning" size={14} color="#F44336" />
                        <Text style={styles.errorText}>{event.data.error}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Processing Indicator */}
          {isProcessing && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator size="small" color="#2196F3" />
              <Text style={styles.processingText}>Processing continues...</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Footer Stats */}
      <View style={styles.footer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{events.length}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{getActiveTools().length}</Text>
          <Text style={styles.statLabel}>Active Tools</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {events.filter(e => e.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {events.filter(e => e.status === 'failed').length}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  minimizedContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  minimizedGradient: {
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minimizedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  minimizedTools: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
    marginLeft: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  queryText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  progressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  activeTools: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  eventItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  errorEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  timelineConnector: {
    position: 'absolute',
    left: 32,
    top: -4,
    width: 2,
    height: 8,
    backgroundColor: '#E0E0E0',
  },
  eventContent: {
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginRight: 8,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  eventDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  eventDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  toolName: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
    marginLeft: 4,
  },
  eventDataContainer: {
    marginTop: 8,
  },
  eventDataLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDataScroll: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    maxHeight: 80,
  },
  eventData: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'monospace',
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 6,
    flex: 1,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  processingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
});