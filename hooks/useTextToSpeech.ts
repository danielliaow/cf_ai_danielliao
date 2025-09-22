import { useState, useEffect, useCallback } from 'react';
import textToSpeechService, { TTSOptions, TTSState } from '../services/textToSpeechService';

interface UseTextToSpeechResult extends TTSState {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  speakWithStreaming: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  isAvailable: () => Promise<boolean>;
}

export const useTextToSpeech = (): UseTextToSpeechResult => {
  const [ttsState, setTtsState] = useState<TTSState>(textToSpeechService.getState());

  useEffect(() => {
    // Subscribe to TTS state changes
    const unsubscribe = textToSpeechService.subscribe(setTtsState);
    
    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const speak = useCallback(async (text: string, options?: TTSOptions): Promise<void> => {
    try {
      await textToSpeechService.speak(text, options);
    } catch (error) {
      console.error('❌ Error in useTextToSpeech.speak:', error);
      throw error;
    }
  }, []);

  const speakWithStreaming = useCallback(async (text: string, options?: TTSOptions): Promise<void> => {
    try {
      await textToSpeechService.speakWithStreaming(text, options);
    } catch (error) {
      console.error('❌ Error in useTextToSpeech.speakWithStreaming:', error);
      throw error;
    }
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    try {
      await textToSpeechService.stop();
    } catch (error) {
      console.error('❌ Error in useTextToSpeech.stop:', error);
      throw error;
    }
  }, []);

  const pause = useCallback(async (): Promise<void> => {
    try {
      await textToSpeechService.pause();
    } catch (error) {
      console.error('❌ Error in useTextToSpeech.pause:', error);
      throw error;
    }
  }, []);

  const isAvailable = useCallback(async (): Promise<boolean> => {
    try {
      return await textToSpeechService.isAvailable();
    } catch (error) {
      console.error('❌ Error checking TTS availability:', error);
      return false;
    }
  }, []);

  return {
    // State
    isSpeaking: ttsState.isSpeaking,
    isPaused: ttsState.isPaused,
    currentText: ttsState.currentText,
    
    // Actions
    speak,
    speakWithStreaming,
    stop,
    pause,
    isAvailable,
  };
};