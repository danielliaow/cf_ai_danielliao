import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FileOperationResult } from '../types/chat';
import { FileViewerService } from '../services/fileViewerService';

interface FileOperationCardProps {
  result: FileOperationResult;
  operation: string;
  onOpenFile?: (filePath: string) => void;
  onShareFile?: (filePath: string) => void;
}

export const FileOperationCard: React.FC<FileOperationCardProps> = ({
  result,
  operation,
  onOpenFile,
  onShareFile
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    errorCard: {
      borderColor: colors.error + '40',
      backgroundColor: colors.error + '10',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    operationType: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
      flex: 1,
    },
    actionButtons: {
      flexDirection: 'row',
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      marginLeft: 8,
    },
    content: {
      gap: 8,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    filePath: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
    fileStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    stat: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    errorText: {
      fontSize: 14,
      color: colors.error,
    },
    previewContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
    },
    previewTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    previewContent: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
      fontFamily: 'monospace',
    },
  });

  const getOperationIcon = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'read':
      case 'readfile':
        return 'document-text-outline';
      case 'write':
      case 'writefile':
        return 'create-outline';
      case 'list':
      case 'listdirectory':
        return 'folder-open-outline';
      case 'search':
        return 'search-outline';
      default:
        return 'document-outline';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileAction = async (action: 'open' | 'share') => {
    if (!result.data?.filePath) {
      Alert.alert('Error', 'No file path available');
      return;
    }

    try {
      if (action === 'open') {
        const success = await FileViewerService.openFile(result.data.filePath, result.data.fileName);
        if (success && onOpenFile) {
          onOpenFile(result.data.filePath);
        }
      } else if (action === 'share') {
        const success = await FileViewerService.shareFile(result.data.filePath, result.data.fileName);
        if (success && onShareFile) {
          onShareFile(result.data.filePath);
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} file:`, error);
      Alert.alert('Error', `Failed to ${action} file`);
    }
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!result.success) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={[styles.operationType, { color: colors.error }]}>
              {operation} Failed
            </Text>
          </View>
        </View>
        <Text style={styles.errorText}>{result.error || 'Unknown error occurred'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={getOperationIcon(operation)} size={20} color={colors.primary} />
          <Text style={styles.operationType}>
            {operation} Successful
          </Text>
        </View>
        
        {result.data?.filePath && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleFileAction('open')}
            >
              <MaterialIcons name="open-in-new" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleFileAction('share')}
            >
              <MaterialIcons name="share" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {result.data?.fileName && (
          <Text style={styles.fileName}>{result.data.fileName}</Text>
        )}
        
        {result.data?.filePath && (
          <Text style={styles.filePath}>{result.data.filePath}</Text>
        )}

        {(result.data?.size || result.data?.wordCount) && (
          <View style={styles.fileStats}>
            {result.data.size && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatFileSize(result.data.size)}</Text>
                <Text style={styles.statLabel}>File Size</Text>
              </View>
            )}
            {result.data.wordCount && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{result.data.wordCount.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Words</Text>
              </View>
            )}
          </View>
        )}

        {result.data?.content && operation.toLowerCase().includes('read') && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Content Preview</Text>
            <Text style={styles.previewContent}>
              {truncateContent(result.data.content)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};