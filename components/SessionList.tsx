import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SessionService } from '../services/sessionService';
import { SessionWithStats } from '../types/session';
import { useTheme } from '../contexts/ThemeContext';

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string;
  onNewSession: () => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  onSelectSession,
  currentSessionId,
  onNewSession,
}) => {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    newSessionButton: {
      padding: 4,
    },
    sessionsList: {
      flex: 1,
    },
    sessionItem: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 12,
      marginVertical: 6,
      borderRadius: 12,
      shadowColor: colors.shadow, // add this in your theme if needed
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    activeSession: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sessionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    deleteButton: {
      padding: 4,
      marginLeft: 8,
    },
    sessionPreview: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    sessionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    sessionStats: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    messageCount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '85%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: colors.text,
    },
    titleInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 20,
      color: colors.text,

    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      marginHorizontal: 6,
    },
    cancelButton: {
      backgroundColor: colors.surfaceVariant, // e.g. lighter/darker depending on theme
    },
    createButton: {
      backgroundColor: colors.primary,
    },
    cancelButtonText: {
      textAlign: 'center',
      fontSize: 16,
      color: colors.textSecondary,
    },
    createButtonText: {
      textAlign: 'center',
      fontSize: 16,
      color: colors.onPrimary, // white on dark blue, black on light yellow, etc.
      fontWeight: '600',
    },
  });


  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading sessions...');
      const userSessions = await SessionService.getUserSessions();
      console.log(userSessions,'wdef')
      console.log('✅ Loaded sessions:', userSessions.count, 'sessions');
      setSessions(userSessions.sessions);
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) {
      Alert.alert('Error', 'Please enter a session title');
      return;
    }

    try {
      const newSession = await SessionService.createSession({
        title: newSessionTitle.trim(),
      });
      
      // Refresh the sessions list
      await loadSessions();
      
      // Select the new session
      onSelectSession(newSession.id);
      
      // Close modal and reset
      setShowNewSessionModal(false);
      setNewSessionTitle('');
      
      onNewSession();
    } catch (error) {
      console.error('Error creating session:', error);
      Alert.alert('Error', 'Failed to create session');
    }
  };

  const handleDeleteSession = (sessionId: string, title: string) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await SessionService.deleteSession(sessionId);
              await loadSessions();
              
              // If this was the current session, trigger new session
              if (currentSessionId === sessionId) {
                onNewSession();
              }
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderSessionItem = ({ item }: { item: SessionWithStats }) => (
    <TouchableOpacity
      style={[
        styles.sessionItem,
        item.id === currentSessionId && styles.activeSession,
      ]}
      onPress={() => onSelectSession(item.id)}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <TouchableOpacity
          onPress={() => handleDeleteSession(item.id, item.title)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sessionPreview} numberOfLines={2}>
        {item.last_message_preview}
      </Text>
      
      <View style={styles.sessionFooter}>
        <Text style={styles.sessionDate}>
          {formatDate(item.updated_at)}
        </Text>
        <View style={styles.sessionStats}>
          <Ionicons name="chatbubble" size={12} color="#666" />
          <Text style={styles.messageCount}>{item.message_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Sessions</Text>
        <TouchableOpacity
          onPress={() => setShowNewSessionModal(true)}
          style={styles.newSessionButton}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSessionItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        style={styles.sessionsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles" size={48} color="#999" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start a new chat to see it here
            </Text>
          </View>
        }
      />

      {/* New Session Modal */}
      <Modal
        visible={showNewSessionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewSessionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Chat Session</Text>
            
            <TextInput
              style={styles.titleInput}
              placeholder="Enter session title..."
              value={newSessionTitle}
              onChangeText={setNewSessionTitle}
              autoFocus
              maxLength={100}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowNewSessionModal(false);
                  setNewSessionTitle('');
                }}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleCreateSession}
                style={[styles.modalButton, styles.createButton]}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

