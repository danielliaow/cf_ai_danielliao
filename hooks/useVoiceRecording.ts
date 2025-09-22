import { useState, useEffect } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { Platform, Alert } from 'react-native';

interface VoiceRecordingState {
  isRecording: boolean;
  isListening: boolean;
  transcription: string;
  error: string | null;
  partialResults: string[];
}

interface VoiceRecordingActions {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearTranscription: () => void;
}

export const useVoiceRecording = (
  onTranscriptionComplete?: (text: string) => void
): VoiceRecordingState & VoiceRecordingActions => {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isListening: false,
    transcription: '',
    error: null,
    partialResults: [],
  });

  useEffect(() => {
    // Set up Voice event listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;

    return () => {
      // Cleanup Voice listeners
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStart = () => {
    console.log('🎤 Speech recognition started');
    setState(prev => ({ ...prev, isListening: true, error: null }));
  };

  const onSpeechRecognized = () => {
    console.log('🔊 Speech recognized');
  };

  const onSpeechEnd = () => {
    console.log('🎤 Speech recognition ended');
    setState(prev => ({ ...prev, isRecording: false, isListening: false }));
  };

  const onSpeechError = (error: SpeechErrorEvent) => {
    console.error('❌ Speech recognition error:', error.error);
    setState(prev => ({
      ...prev,
      isRecording: false,
      isListening: false,
      error: `Speech recognition error: ${error.error?.message || error.error}`,
    }));
  };

  const onSpeechResults = (event: SpeechResultsEvent) => {
    console.log('📝 Speech results:', event.value);
    const transcribedText = event.value?.[0] || '';
    
    setState(prev => ({
      ...prev,
      transcription: transcribedText,
      isRecording: false,
      isListening: false,
    }));

    // Call completion callback if provided
    if (transcribedText && onTranscriptionComplete) {
      onTranscriptionComplete(transcribedText);
    }
  };

  const onSpeechPartialResults = (event: SpeechResultsEvent) => {
    console.log('🔄 Partial speech results:', event.value);
    setState(prev => ({
      ...prev,
      partialResults: event.value || [],
    }));
  };

  const onSpeechVolumeChanged = (event: any) => {
    // Volume changes can be used for visual feedback
    // console.log('🔊 Volume changed:', event.value);
  };

  const startRecording = async (): Promise<void> => {
    try {
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null, 
        transcription: '', 
        partialResults: [] 
      }));

      console.log('🎤 Starting voice recording...');
      
      // Check if Voice is available
      const available = await Voice.isAvailable();
      if (!available) {
        throw new Error('Speech recognition is not available on this device');
      }

      // Start speech recognition
      await Voice.start(Platform.OS === 'ios' ? 'en-US' : 'en_US');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: `Failed to start recording: ${error instanceof Error ? error.message : error}`,
      }));
      
      Alert.alert(
        'Recording Error',
        'Failed to start voice recording. Please check your microphone permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopRecording = async (): Promise<void> => {
    try {
      console.log('⏹️ Stopping voice recording...');
      await Voice.stop();
      
      setState(prev => ({ ...prev, isRecording: false }));
      
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: `Failed to stop recording: ${error instanceof Error ? error.message : error}`,
      }));
    }
  };

  const clearTranscription = (): void => {
    setState(prev => ({
      ...prev,
      transcription: '',
      partialResults: [],
      error: null,
    }));
  };

  return {
    // State
    isRecording: state.isRecording,
    isListening: state.isListening,
    transcription: state.transcription,
    error: state.error,
    partialResults: state.partialResults,
    
    // Actions
    startRecording,
    stopRecording,
    clearTranscription,
  };
};