import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DriveSearchResult } from '../types/chat';
import { FileViewerService } from '../services/fileViewerService';

interface DriveFileCardProps {
  result: DriveSearchResult;
  onOpenFile?: (fileId: string) => void;
  onDownloadFile?: (fileId: string) => void;
  onShareFile?: (fileId: string) => void;
}

export const DriveFileCard: React.FC<DriveFileCardProps> = ({
  result,
  onOpenFile,
  onDownloadFile,
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
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 8,
      flex: 1,
    },
    searchQuery: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 12,
    },
    filesList: {
      gap: 12,
    },
    fileItem: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      padding: 12,
    },
    fileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    fileNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginLeft: 8,
      flex: 1,
    },
    fileActions: {
      flexDirection: 'row',
      gap: 4,
    },
    actionButton: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: colors.surface,
    },
    fileDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    fileDetail: {
      alignItems: 'center',
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
    },
    detailLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    contentPreview: {
      marginTop: 8,
      padding: 8,
      backgroundColor: colors.surface,
      borderRadius: 6,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    previewTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    previewContent: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    noResultsContainer: {
      alignItems: 'center',
      padding: 20,
    },
    noResultsText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    totalCount: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    errorText: {
      fontSize: 14,
      color: colors.error,
    },
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document') || mimeType.includes('text')) return 'description';
    if (mimeType.includes('spreadsheet')) return 'table-chart';
    if (mimeType.includes('presentation')) return 'slideshow';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('video')) return 'video-file';
    if (mimeType.includes('audio')) return 'audio-file';
    if (mimeType.includes('pdf')) return 'picture-as-pdf';
    return 'insert-drive-file';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFileAction = async (file: any, action: 'open' | 'download' | 'share') => {
    try {
      switch (action) {
        case 'open':
          if (file.webViewLink) {
            const success = await FileViewerService.openFile(file.webViewLink, file.name);
            if (success) {
              onOpenFile?.(file.id);
            }
          } else {
            const success = await FileViewerService.openFile(file.id, file.name);
            if (success) {
              onOpenFile?.(file.id);
            }
          }
          break;
        case 'download':
          // For download, we could implement downloading the file content
          Alert.alert('Download', 'Download functionality will be implemented soon');
          onDownloadFile?.(file.id);
          break;
        case 'share':
          if (file.webViewLink) {
            const success = await FileViewerService.shareFile(file.webViewLink, file.name);
            if (success) {
              onShareFile?.(file.id);
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} file:`, error);
      Alert.alert('Error', `Failed to ${action} file`);
    }
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!result.success) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={[styles.title, { color: colors.error }]}>
              Drive Search Failed
            </Text>
          </View>
        </View>
        <Text style={styles.errorText}>{result.error|| 'Unknown error occurred'}</Text>
      </View>
    );
  }

  const { files, totalCount, query } = result.data!;

  if (files && files.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="cloud-off" size={20} color={colors.textSecondary} />
            <Text style={styles.title}>No Files Found</Text>
          </View>
        </View>
        {query && (
          <Text style={styles.searchQuery}>Searched for: "{query}"</Text>
        )}
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            No files found matching your search criteria.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="cloud" size={20} color={colors.primary} />
          <Text style={styles.title}>Google Drive Files</Text>
        </View>
      </View>

      {query && (
        <Text style={styles.searchQuery}>Searched for: "{query}"</Text>
      )}

      <View style={styles.filesList}>
        {files && files.map((file) => (
          <View key={file.id} style={styles.fileItem}>
            <View style={styles.fileHeader}>
              <View style={styles.fileNameContainer}>
                <MaterialIcons
                  name={getFileIcon(file.mimeType)}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.fileName} numberOfLines={2}>
                  {file.name}
                </Text>
              </View>

              <View style={styles.fileActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleFileAction(file, 'open')}
                >
                  <MaterialIcons name="open-in-new" size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleFileAction(file, 'download')}
                >
                  <MaterialIcons name="download" size={14} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleFileAction(file, 'share')}
                >
                  <MaterialIcons name="share" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fileDetails}>
              <View style={styles.fileDetail}>
                <Text style={styles.detailValue}>{formatFileSize(file.size)}</Text>
                <Text style={styles.detailLabel}>Size</Text>
              </View>
              <View style={styles.fileDetail}>
                <Text style={styles.detailValue}>{formatDate(file.modifiedTime)}</Text>
                <Text style={styles.detailLabel}>Modified</Text>
              </View>
              {file.wordCount && (
                <View style={styles.fileDetail}>
                  <Text style={styles.detailValue}>{file.wordCount.toLocaleString()}</Text>
                  <Text style={styles.detailLabel}>Words</Text>
                </View>
              )}
            </View>

            {file.content && (
              <View style={styles.contentPreview}>
                <Text style={styles.previewTitle}>Content Preview</Text>
                <Text style={styles.previewContent}>
                  {truncateContent(file.content)}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      { files && totalCount > files.length && (
        <Text style={styles.totalCount}>
          Showing {files.length} of {totalCount} files
        </Text>
      )}
    </View>
  );
};