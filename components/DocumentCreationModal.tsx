import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DocumentCreationService, DocumentCreationRequest } from '../services/documentCreationService';
import { FileViewerService } from '../services/fileViewerService';

interface DocumentCreationModalProps {
  visible: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialPrompt?: string;
}

export const DocumentCreationModal: React.FC<DocumentCreationModalProps> = ({
  visible,
  onClose,
  initialTitle = '',
  initialPrompt = '',
}) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedType, setSelectedType] = useState<'text' | 'markdown' | 'html' | 'json'>('text');
  const [saveLocation, setSaveLocation] = useState<'local' | 'drive' | 'both'>('both');
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    multilineInput: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedOption: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    optionText: {
      fontSize: 14,
      color: colors.text,
    },
    selectedOptionText: {
      color: colors.primary,
      fontWeight: '600',
    },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 20,
    },
    advancedText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    quickTemplates: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    templateButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.primary + '10',
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    templateText: {
      fontSize: 12,
      color: colors.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    cancelButton: {
      backgroundColor: colors.surfaceVariant,
    },
    createButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    createButtonText: {
      color: '#fff',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  });

  const documentTypes = [
    { id: 'text', name: 'Text', icon: 'description' },
    { id: 'markdown', name: 'Markdown', icon: 'code' },
    { id: 'html', name: 'HTML', icon: 'web' },
    { id: 'json', name: 'JSON', icon: 'data-object' },
  ];

  const saveLocations = [
    { id: 'local', name: 'Local Only', icon: 'phone-android' },
    { id: 'drive', name: 'Google Drive', icon: 'cloud' },
    { id: 'both', name: 'Both', icon: 'sync' },
  ];

  const quickTemplates = [
    { type: 'note', name: 'Quick Note' },
    { type: 'meeting', name: 'Meeting Notes' },
    { type: 'report', name: 'Report' },
    { type: 'todo', name: 'Todo List' },
  ];

  const handleQuickTemplate = (templateType: string) => {
    const templates = {
      note: 'Write a quick note or reminder',
      meeting: 'Meeting with team about project updates',
      report: 'Weekly status report for the project',
      todo: 'Complete project documentation\nReview code changes\nPrepare for presentation',
    };

    setPrompt(templates[templateType as keyof typeof templates] || '');
    setTitle(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} - ${new Date().toLocaleDateString()}`);
  };

  const handleCreateDocument = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a document title');
      return;
    }

    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter document content or prompt');
      return;
    }

    setIsCreating(true);

    try {
      // First, try to generate content with AI if it looks like a prompt
      let finalContent = prompt;
      
      if (prompt.length < 500 && !prompt.includes('\n\n')) {
        // Looks like a prompt, generate content
        const generatedResult = await DocumentCreationService.generateDocument(
          prompt,
          selectedType === 'text' ? 'document' : selectedType
        );
        
        if (generatedResult.success && generatedResult.content) {
          finalContent = generatedResult.content;
        }
      }

      // Create the document
      const request: DocumentCreationRequest = {
        title: title.trim(),
        content: finalContent,
        type: selectedType,
        saveLocation,
      };

      const result = await DocumentCreationService.createDocument(request);

      if (result.success) {
        DocumentCreationService.showCreationSuccess(result, title);
        
        // If saved to Drive and has a link, offer to open it
        if (result.driveWebViewLink) {
          setTimeout(() => {
            Alert.alert(
              'Open Document?',
              'Would you like to open the document in Google Drive?',
              [
                { text: 'Later', style: 'cancel' },
                { 
                  text: 'Open', 
                  onPress: () => FileViewerService.openFile(result.driveWebViewLink!, title)
                }
              ]
            );
          }, 1000);
        }
        
        onClose();
        resetForm();
      } else {
        Alert.alert('Error', result.error || 'Failed to create document');
      }
    } catch (error) {
      console.error('❌ Error creating document:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setPrompt('');
    setSelectedType('text');
    setSaveLocation('both');
    setShowAdvanced(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Document</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Document Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter document title..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Content / Prompt</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Enter content or describe what you want to create..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              
              <View style={styles.quickTemplates}>
                {quickTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.type}
                    style={styles.templateButton}
                    onPress={() => handleQuickTemplate(template.type)}
                  >
                    <Text style={styles.templateText}>{template.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedText}>Advanced Options</Text>
              <MaterialIcons
                name={showAdvanced ? 'expand-less' : 'expand-more'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showAdvanced && (
              <>
                <View style={styles.section}>
                  <Text style={styles.label}>Document Type</Text>
                  <View style={styles.optionsContainer}>
                    {documentTypes.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.optionButton,
                          selectedType === type.id && styles.selectedOption,
                        ]}
                        onPress={() => setSelectedType(type.id as any)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedType === type.id && styles.selectedOptionText,
                          ]}
                        >
                          {type.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Save Location</Text>
                  <View style={styles.optionsContainer}>
                    {saveLocations.map((location) => (
                      <TouchableOpacity
                        key={location.id}
                        style={[
                          styles.optionButton,
                          saveLocation === location.id && styles.selectedOption,
                        ]}
                        onPress={() => setSaveLocation(location.id as any)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            saveLocation === location.id && styles.selectedOptionText,
                          ]}
                        >
                          {location.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateDocument}
              disabled={isCreating}
            >
              {isCreating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>Creating...</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, styles.createButtonText]}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};