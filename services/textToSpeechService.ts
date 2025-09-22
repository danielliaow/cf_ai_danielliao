import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: any) => void;
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentText: string | null;
}

class TextToSpeechService {
  private state: TTSState = {
    isSpeaking: false,
    isPaused: false,
    currentText: null,
  };

  private listeners: Set<(state: TTSState) => void> = new Set();

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      console.log('🔊 Initializing Text-to-Speech service...');
      
      // Check if TTS is available
      const available = await this.isAvailable();
      if (!available) {
        console.warn('⚠️ Text-to-Speech is not available on this device');
        return;
      }

      // Get available voices
      const voices = await Speech.getAvailableVoicesAsync();
      console.log('🎤 Available TTS voices:', voices.length);
      
      if (voices.length > 0) {
        console.log('🎤 Sample voices:', voices.slice(0, 3).map(v => ({ name: v.name, language: v.language })));
      }
      
      console.log('✅ TTS service initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing TTS service:', error);
    }
  }

  /**
   * Check if TTS is available on the device
   */
  async isAvailable(): Promise<boolean> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get available voices for TTS
   */
  async getAvailableVoices() {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.error('❌ Error getting available voices:', error);
      return [];
    }
  }

  /**
   * Speak text using TTS
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    try {
      if (!text || text.trim().length === 0) {
        console.warn('⚠️ No text provided for TTS');
        return;
      }

      console.log('🔊 Speaking text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

      // Stop any current speech
      await this.stop();

      // Update state
      this.updateState({
        isSpeaking: true,
        isPaused: false,
        currentText: text,
      });

      // Default options
      const speechOptions: Speech.SpeechOptions = {
        language: options.language || (Platform.OS === 'ios' ? 'en-US' : 'en_US'),
        pitch: options.pitch || 1.5,
        rate: options.rate || 1.2, // Slightly slower for better comprehension
        voice: options.voice,
        onStart: () => {
          console.log('🔊 TTS started speaking');
          options.onStart?.();
        },
        onDone: () => {
          console.log('✅ TTS finished speaking');
          this.updateState({
            isSpeaking: false,
            isPaused: false,
            currentText: null,
          });
          options.onDone?.();
        },
        onStopped: () => {
          console.log('⏹️ TTS stopped');
          this.updateState({
            isSpeaking: false,
            isPaused: false,
            currentText: null,
          });
          options.onStopped?.();
        },
        onError: (error) => {
          console.error('❌ TTS error:', error);
          this.updateState({
            isSpeaking: false,
            isPaused: false,
            currentText: null,
          });
          options.onError?.(error);
        },
      };

      // Start speaking
      await Speech.speak(text, speechOptions);

    } catch (error) {
      console.error('❌ Error in TTS speak:', error);
      this.updateState({
        isSpeaking: false,
        isPaused: false,
        currentText: null,
      });
      options.onError?.(error);
    }
  }

  /**
   * Speak text with streaming capability (for long responses)
   */
  async speakWithStreaming(text: string, options: TTSOptions = {}): Promise<void> {
    // For streaming, we can split long text into sentences and speak them sequentially
    const sentences = this.splitIntoSentences(text);
    
    console.log(`🔊 Speaking ${sentences.length} sentences with streaming...`);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length === 0) continue;

      try {
        // Only call onStart for the first sentence
        const isFirst = i === 0;
        const isLast = i === sentences.length - 1;

        await new Promise<void>((resolve, reject) => {
          Speech.speak(sentence, {
            ...options,
            language: options.language || (Platform.OS === 'ios' ? 'en-US' : 'en_US'),
            pitch: options.pitch || 1.0,
            rate: options.rate || 0.8,
            onStart: isFirst ? options.onStart : undefined,
            onDone: () => {
              if (isLast) {
                this.updateState({
                  isSpeaking: false,
                  isPaused: false,
                  currentText: null,
                });
                options.onDone?.();
              }
              resolve();
            },
            onStopped: options.onStopped,
            onError: (error) => {
              options.onError?.(error);
              reject(error);
            },
          });
        });

        // Small delay between sentences for natural flow
        if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        console.error(`❌ Error speaking sentence ${i}:`, error);
        break;
      }
    }
  }

  /**
   * Stop current TTS
   */
  async stop(): Promise<void> {
    try {
      if (this.state.isSpeaking) {
        console.log('⏹️ Stopping TTS...');
        await Speech.stop();
        
        this.updateState({
          isSpeaking: false,
          isPaused: false,
          currentText: null,
        });
      }
    } catch (error) {
      console.error('❌ Error stopping TTS:', error);
    }
  }

  /**
   * Pause current TTS (if supported)
   */
  async pause(): Promise<void> {
    try {
      if (this.state.isSpeaking) {
        console.log('⏸️ Pausing TTS...');
        // Note: Speech.pause() may not be available in all versions
        await Speech.stop(); // Fallback to stop
        
        this.updateState({
          isSpeaking: false,
          isPaused: true,
        });
      }
    } catch (error) {
      console.error('❌ Error pausing TTS:', error);
    }
  }

  /**
   * Get current TTS state
   */
  getState(): TTSState {
    return { ...this.state };
  }

  /**
   * Subscribe to TTS state changes
   */
  subscribe(listener: (state: TTSState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(newState: Partial<TTSState>): void {
    this.state = { ...this.state, ...newState };
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('❌ Error in TTS state listener:', error);
      }
    });
  }

  /**
   * Split text into sentences for streaming
   */
  private splitIntoSentences(text: string): string[] {
    // Split by sentence endings, keeping the punctuation
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim());
  }
}

// Export singleton instance
export const textToSpeechService = new TextToSpeechService();
export default textToSpeechService;