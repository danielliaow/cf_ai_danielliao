import { Linking, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { AIService } from './aiService';

export class FileViewerService {
  /**
   * Open a file with the appropriate native application
   */
  static async openFile(filePath: string, fileName?: string): Promise<boolean> {
    try {
      console.log('📂 Opening file:', filePath);

      // Check if it's a local file path
      if (filePath.startsWith('/') || filePath.startsWith('file://')) {
        return await this.openLocalFile(filePath, fileName);
      }

      // Check if it's a URL (Google Drive link, etc.)
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return await this.openWebLink(filePath);
      }

      // Check if it's a Google Drive file ID
      if (this.isGoogleDriveFileId(filePath)) {
        return await this.openGoogleDriveFile(filePath);
      }

      Alert.alert('Error', 'Unsupported file path format');
      return false;
    } catch (error) {
      console.error('❌ Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
      return false;
    }
  }

  /**
   * Open a local file with the native application
   */
  private static async openLocalFile(filePath: string, fileName?: string): Promise<boolean> {
    try {
      // Ensure the path is properly formatted
      let normalizedPath = filePath;
      if (!normalizedPath.startsWith('file://')) {
        normalizedPath = `file://${normalizedPath}`;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(normalizedPath);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found');
        return false;
      }

      if (Platform.OS === 'ios') {
        // On iOS, use sharing API to open with appropriate app
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(normalizedPath, {
            dialogTitle: `Open ${fileName || 'file'}`,
            mimeType: this.getMimeType(fileName || filePath),
          });
          return true;
        }
      } else {
        // On Android, try to open directly with Linking
        const canOpen = await Linking.canOpenURL(normalizedPath);
        if (canOpen) {
          await Linking.openURL(normalizedPath);
          return true;
        }

        // Fallback to sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(normalizedPath);
          return true;
        }
      }

      Alert.alert('Error', 'No application available to open this file type');
      return false;
    } catch (error) {
      console.error('❌ Error opening local file:', error);
      throw error;
    }
  }

  /**
   * Open a web link (Google Drive, etc.)
   */
  private static async openWebLink(url: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }

      // Fallback to WebBrowser
      await WebBrowser.openBrowserAsync(url);
      return true;
    } catch (error) {
      console.error('❌ Error opening web link:', error);
      throw error;
    }
  }

  /**
   * Open a Google Drive file by ID
   */
  private static async openGoogleDriveFile(fileId: string): Promise<boolean> {
    try {
      // First, try to get the file details to get the web view link
      const result = await AIService.callMCPTool('getGoogleDriveFile', { 
        fileId, 
        includeContent: false 
      });

      if (result.success && result.data?.webViewLink) {
        return await this.openWebLink(result.data.webViewLink);
      }

      // Fallback to direct Google Drive link
      const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
      return await this.openWebLink(driveUrl);
    } catch (error) {
      console.error('❌ Error opening Google Drive file:', error);
      
      // Final fallback
      const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
      return await this.openWebLink(driveUrl);
    }
  }

  /**
   * Download and open a remote file
   */
  static async downloadAndOpen(url: string, fileName: string): Promise<boolean> {
    try {
      console.log('📥 Downloading file:', fileName);

      // Create download destination
      const downloadPath = `${FileSystem.documentDirectory}${fileName}`;

      // Download file
      const downloadResult = await FileSystem.downloadAsync(url, downloadPath);
      
      if (downloadResult.status === 200) {
        console.log('✅ File downloaded:', downloadResult.uri);
        return await this.openLocalFile(downloadResult.uri, fileName);
      }

      Alert.alert('Error', 'Failed to download file');
      return false;
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      Alert.alert('Error', 'Failed to download and open file');
      return false;
    }
  }

  /**
   * Share a file using the native sharing interface
   */
  static async shareFile(filePath: string, fileName?: string): Promise<boolean> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          dialogTitle: `Share ${fileName || 'file'}`,
          mimeType: this.getMimeType(fileName || filePath),
        });
        return true;
      }

      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    } catch (error) {
      console.error('❌ Error sharing file:', error);
      Alert.alert('Error', 'Failed to share file');
      return false;
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private static getMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    const mimeTypes: { [key: string]: string } = {
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'rtf': 'text/rtf',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      
      // Videos
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4',
      
      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      
      // Other
      'json': 'application/json',
      'xml': 'application/xml',
      'csv': 'text/csv',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Check if a string looks like a Google Drive file ID
   */
  private static isGoogleDriveFileId(str: string): boolean {
    // Google Drive file IDs are typically 33-44 characters long
    // and contain letters, numbers, hyphens, and underscores
    return /^[a-zA-Z0-9_-]{25,}$/.test(str);
  }

  /**
   * Get file type category for UI icons
   */
  static getFileTypeCategory(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }
    
    if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(extension)) {
      return 'audio';
    }
    
    if (['pdf'].includes(extension)) {
      return 'pdf';
    }
    
    if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return 'document';
    }
    
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return 'spreadsheet';
    }
    
    if (['ppt', 'pptx'].includes(extension)) {
      return 'presentation';
    }
    
    if (['zip', 'rar', '7z'].includes(extension)) {
      return 'archive';
    }
    
    return 'file';
  }
}