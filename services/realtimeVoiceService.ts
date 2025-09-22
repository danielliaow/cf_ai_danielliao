import { Platform } from 'react-native';
import { ChatService } from './chatService';

// Import platform-specific voice libraries
let Voice: any = null;
let Tts: any = null;

// For mobile
if (Platform.OS !== 'web') {
  try {
    Voice = require('@react-native-voice/voice').default;
    Tts = require('react-native-tts').default;
  } catch (error) {
    console.warn('Voice libraries not available:', error);
  }
}

export interface VoiceRecognitionResult {
  text: string;
  confidence?: number;
}

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export interface ConversationCallbacks {
  onListening?: () => void;
  onResults?: (results: string[]) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: any) => void;
  onAIThinking?: () => void;
  onAIResponse?: (aiText: string, userText: string) => void;
  onAISpeaking?: () => void;
  onConversationEnd?: () => void;
}

class RealtimeVoiceService {
  private isListening = false;
  private isSpeaking = false;
  private isWebSpeechSupported = false;
  private webRecognition: any = null;
  private webSynthesis: any = null;
  private sessionId: string | null = null;
  private callbacks: ConversationCallbacks = {};
  private conversationActive = false;
  private currentUtterance: any = null;
  private recognitionTimeoutId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private lastSpeechTime = 0;
  private speechTimeout: NodeJS.Timeout | null = null;
  private hasPermission = false;
  private hasTTSPermission = false;
  private userHasInteracted = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initializeAPIs();
  }

  private async initializeAPIs() {
    try {
      if (Platform.OS === 'web') {
        await this.initializeWebAPIs();
      } else {
        await this.initializeMobileAPIs();
      }
    } catch (error) {
      console.error('❌ Error initializing voice APIs:', error);
    }
  }

  private async initializeWebAPIs() {
    if (typeof window === 'undefined') return;

    // Check for Web Speech API support
    this.isWebSpeechSupported = !!(
      window.SpeechRecognition || window.webkitSpeechRecognition
    );

    if (this.isWebSpeechSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.webRecognition = new SpeechRecognition();

      // Configure recognition settings
      this.webRecognition.continuous = true;
      this.webRecognition.interimResults = false; // Only final results
      this.webRecognition.lang = 'en-US';
      this.webRecognition.maxAlternatives = 1;

      // Set up event listeners
      this.webRecognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        this.isListening = true;
        this.callbacks.onListening?.();
      };

      this.webRecognition.onresult = (event: any) => {
        try {
          const results = Array.from(event.results);
          const lastResult = results[results.length - 1];

          if (lastResult && lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim();
            console.log('📝 Final speech result:', transcript);

            if (transcript && transcript.length > 0) {
              this.handleSpeechResult(transcript);
            }
          }
        } catch (error) {
          console.error('❌ Error processing speech result:', error);
        }
      };

      this.webRecognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        this.isListening = false;

        // Handle specific errors
        if (event.error === 'not-allowed') {
          this.callbacks.onError?.('Microphone permission denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          // Restart listening if no speech detected and conversation is active
          if (this.conversationActive && !this.isProcessing && !this.isSpeaking) {
            setTimeout(() => this.restartListening(), 1000);
          }
        } else {
          this.callbacks.onError?.(event.error);
        }
      };

      this.webRecognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        this.isListening = false;
        this.callbacks.onSpeechEnd?.();

        // Auto-restart if conversation is active and not processing
        if (this.conversationActive && !this.isProcessing && !this.isSpeaking) {
          setTimeout(() => this.restartListening(), 500);
        }
      };

      // Initialize Web Speech Synthesis
      this.webSynthesis = window.speechSynthesis;

      // Load available voices
      this.loadAvailableVoices();

      // Test TTS availability and prepare for user interaction
      if (this.webSynthesis) {
        this.prepareTTSForUserInteraction();
      }
    }

    // Request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.hasPermission = true;
      stream.getTracks().forEach(track => track.stop()); // Stop the stream
    } catch (error) {
      console.warn('⚠️ Microphone permission not granted:', error);
      this.hasPermission = false;
    }
  }

  private async initializeMobileAPIs() {
    if (!Voice || !Tts) return;

    try {
      // Initialize Voice Recognition
      Voice.onSpeechStart = () => {
        console.log('🗣️ User started speaking');
        this.callbacks.onSpeechStart?.();
      };

      Voice.onSpeechEnd = () => {
        console.log('🤐 User stopped speaking');
        this.isListening = false;
        this.callbacks.onSpeechEnd?.();
      };

      Voice.onSpeechError = (error: any) => {
        console.error('❌ Speech recognition error:', error);
        this.isListening = false;
        this.callbacks.onError?.(error.error?.message || 'Speech recognition error');
      };

      Voice.onSpeechResults = (event: any) => {
        try {
          const results = event.value || [];
          if (results.length > 0) {
            const transcript = results[0].trim();
            console.log('📝 Mobile speech result:', transcript);

            if (transcript && transcript.length > 0) {
              this.handleSpeechResult(transcript);
            }
          }
        } catch (error) {
          console.error('❌ Error processing mobile speech result:', error);
        }
      };

      // Initialize TTS
      Tts.addEventListener('tts-start', () => {
        console.log('🔊 TTS started');
        this.isSpeaking = true;
        this.callbacks.onAISpeaking?.();
      });

      Tts.addEventListener('tts-finish', () => {
        console.log('✅ TTS finished');
        this.isSpeaking = false;

        // Restart listening after TTS finishes
        if (this.conversationActive && !this.isProcessing) {
          setTimeout(() => this.restartListening(), 1000);
        }
      });

      Tts.addEventListener('tts-cancel', () => {
        console.log('🛑 TTS cancelled');
        this.isSpeaking = false;
      });

      this.hasPermission = true;
    } catch (error) {
      console.error('❌ Error initializing mobile voice APIs:', error);
      this.hasPermission = false;
    }
  }

  private loadAvailableVoices() {
    if (Platform.OS !== 'web' || !this.webSynthesis) return;

    const loadVoices = () => {
      const voices = this.webSynthesis.getVoices();
      if (voices.length > 0) {
        this.availableVoices = voices.filter(voice => voice.lang.startsWith('en'));

        // Select default voice with priority for Google UK English female voices
        const preferredVoice = this.availableVoices.find(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();

          // Priority 1: Google UK English female voices (highest priority)
          if (name.includes('google') &&
              (lang.includes('gb') || lang.includes('uk') || lang === 'en-gb') &&
              (name.includes('female') || !name.includes('male'))) {
            return true;
          }

          // Priority 2: Any Google UK English voices
          if (name.includes('google') && (lang.includes('gb') || lang.includes('uk') || lang === 'en-gb')) {
            return true;
          }

          // // Priority 3: Google female voices (any English)
          // if (name.includes('google') && (name.includes('female') || !name.includes('male'))) {
          //   return true;
          // }

          // // Priority 4: Any Google voices
          // if (name.includes('google')) return true;

          // // Priority 5: High-quality neural/premium voices
          // if (name.includes('neural') || name.includes('premium') || name.includes('enhanced')) return true;

          // // Priority 6: Female voices that sound assistant-like
          // if (name.includes('zira') || name.includes('eva') || name.includes('samantha')) return true;
          // if (name.includes('siri') || name.includes('female')) return true;

          // // Priority 7: Other known good voices
          // if (name.includes('microsoft') || name.includes('alex')) return true;

          return false;
        }) ||
        // Fallback: prefer female voices in general (tend to sound more assistant-like)
        this.availableVoices.find(voice =>
          voice.name.toLowerCase().includes('female') ||
          !voice.name.toLowerCase().includes('male')
        );

        this.selectedVoice = preferredVoice || this.availableVoices[0] || null;
        console.log('🔊 Available voices:', this.availableVoices.length, 'Selected:', this.selectedVoice?.name);
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Also listen for voices changed event (some browsers load voices asynchronously)
    this.webSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  private prepareTTSForUserInteraction() {
    if (Platform.OS !== 'web' || !this.webSynthesis) return;

    // Add click listener to enable TTS on first user interaction
    const enableTTS = () => {
      if (!this.userHasInteracted) {
        console.log('🔊 Enabling TTS after user interaction');
        this.userHasInteracted = true;

        // Test TTS with a silent utterance to "prime" the system
        try {
          const testUtterance = new SpeechSynthesisUtterance('');
          testUtterance.volume = 0;
          testUtterance.onstart = () => {
            this.hasTTSPermission = true;
            console.log('✅ TTS permission granted');
          };
          testUtterance.onerror = (error) => {
            console.warn('⚠️ TTS test failed:', error);
            this.hasTTSPermission = false;
          };
          this.webSynthesis.speak(testUtterance);
        } catch (error) {
          console.warn('⚠️ TTS test error:', error);
          this.hasTTSPermission = false;
        }
      }
    };

    // Add listeners for user interaction
    if (typeof document !== 'undefined') {
      document.addEventListener('click', enableTTS, { once: true });
      document.addEventListener('keydown', enableTTS, { once: true });
      document.addEventListener('touchstart', enableTTS, { once: true });
    }
  }

  private async handleSpeechResult(text: string) {
    if (!text.trim() || !this.sessionId || this.isProcessing) {
      console.log('⚠️ Ignoring speech result:', { text: text.substring(0, 30), sessionId: !!this.sessionId, isProcessing: this.isProcessing });
      return;
    }

    console.log('🎯 Processing speech result:', text);
    this.callbacks.onResults?.([text]);

    // Stop listening while processing
    await this.stopListening();
    this.isProcessing = true;

    try {
      // Indicate AI is thinking
      this.callbacks.onAIThinking?.();

      // Process the message with AI
      console.log('🤔 Sending to AI:', text);
      const responses = await ChatService.processMessage(text, this.sessionId);

      if (responses.length > 0) {
        const aiResponse = responses[responses.length - 1];
        console.log('💬 AI response received:', aiResponse.content.substring(0, 50));

        this.callbacks.onAIResponse?.(aiResponse.content, text);

        // Speak the AI response
        await this.speak(aiResponse.content);
      } else {
        console.warn('⚠️ No AI response received');
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('❌ Error processing voice message:', error);
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      this.isProcessing = false;
    }
  }

  private async restartListening() {
    if (!this.conversationActive || this.isListening || this.isProcessing || this.isSpeaking) {
      return;
    }

    try {
      console.log('🔄 Restarting listening...');
      await this.startListening();
    } catch (error) {
      console.error('❌ Error restarting listening:', error);
    }
  }

  private preprocessTextForSpeech(text: string): string {
    return text
      // Remove markdown formatting that sounds weird when spoken
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code backticks
      .replace(/#{1,6}\s*/g, '') // Remove markdown headers

      // Replace common symbols with spoken equivalents
      .replace(/&/g, ' and ')
      .replace(/@/g, ' at ')
      .replace(/#/g, ' hashtag ')
      .replace(/\$/g, ' dollars ')
      .replace(/%/g, ' percent ')
      .replace(/\+/g, ' plus ')
      .replace(/=/g, ' equals ')

      // Improve pronunciation of common terms
      .replace(/\bAPI\b/g, 'A P I')
      .replace(/\bURL\b/g, 'U R L')
      .replace(/\bHTML\b/g, 'H T M L')
      .replace(/\bCSS\b/g, 'C S S')
      .replace(/\bJS\b/g, 'JavaScript')
      .replace(/\bUI\b/g, 'user interface')
      .replace(/\bUX\b/g, 'user experience')

      // Add natural pauses
      .replace(/\.\s+/g, '. ') // Ensure pause after periods
      .replace(/,\s+/g, ', ') // Ensure pause after commas
      .replace(/:\s+/g, ': ') // Ensure pause after colons

      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  async startListening(): Promise<void> {
    if (this.isListening || this.isSpeaking || !this.hasPermission) {
      console.log('⚠️ Cannot start listening:', { isListening: this.isListening, isSpeaking: this.isSpeaking, hasPermission: this.hasPermission });
      return;
    }

    try {
      console.log('🎤 Starting speech recognition...');

      if (Platform.OS === 'web' && this.webRecognition) {
        this.webRecognition.start();
      } else if (Voice) {
        await Voice.start('en-US');
      }

      this.isListening = true;
      this.callbacks.onListening?.();
    } catch (error) {
      console.error('❌ Error starting speech recognition:', error);
      this.isListening = false;

      // Provide specific error messages
      if (error instanceof Error) {
        if (error.name === 'InvalidStateError') {
          // Recognition is already started, just update state
          this.isListening = true;
          this.callbacks.onListening?.();
          return;
        }
      }

      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to start listening');
    }
  }


  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      console.log('🛑 Stopping speech recognition...');

      if (Platform.OS === 'web' && this.webRecognition) {
        this.webRecognition.stop();
      } else if (Voice) {
        await Voice.stop();
      }

      this.isListening = false;
    } catch (error) {
      console.error('❌ Error stopping speech recognition:', error);
      this.isListening = false;
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (this.isSpeaking) {
      await this.stopSpeaking();
    }

    if (!text.trim()) {
      console.warn('⚠️ Empty text provided for speech');
      return;
    }

    // Preprocess text for better speech synthesis
    const processedText = this.preprocessTextForSpeech(text);

    try {
      console.log('🔊 Speaking:', processedText.substring(0, 50));

      if (Platform.OS === 'web' && this.webSynthesis) {
        // Check if user has interacted and TTS is available
        if (!this.userHasInteracted) {
          console.warn('⚠️ TTS requires user interaction first. Skipping speech but continuing conversation.');
          // Continue the conversation without speech
          this.callbacks.onAISpeaking?.();
          setTimeout(() => {
            this.isSpeaking = false;
          }, 1000); // Simulate speech time
          return;
        }

        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(processedText);
          console.log(options,'ssdd')
          // Optimized speech parameters for more natural, assistant-like voice
          utterance.rate = options.rate || 1.0; // Slightly slower for clearer speech
          utterance.pitch = options.pitch || 1.1; // Slightly lower pitch for warmer tone
          utterance.volume = options.volume || 0.9; // Higher volume for clarity
          utterance.lang = options.language || 'en-US';

          // Use selected voice if available
          if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
          }

          let hasStarted = false;

          utterance.onstart = () => {
            console.log('🔊 Web TTS started');
            hasStarted = true;
            this.isSpeaking = true;
            this.isProcessing = false;
            this.callbacks.onAISpeaking?.();
          };

          utterance.onend = () => {
            console.log('✅ Web TTS finished');
            this.isProcessing = false;
            this.isSpeaking = false;

            // Auto-restart listening after a brief pause for truly conversational experience
            console.log(this.conversationActive, this.isProcessing,'kkkkkkk');
            if (this.conversationActive && !this.isProcessing) {
              console.log(this.conversationActive && !this.isListening && !this.isProcessing,',mmmmmmm')
                if (this.conversationActive && !this.isListening && !this.isProcessing) {
                  console.log('🔄 Auto-restarting listening after TTS...');
                  this.restartListening();
                }
             
            }

            resolve();
          };

          utterance.onerror = (error) => {
            console.error('❌ Web TTS error:', error);
            this.isSpeaking = false;

            // Handle specific TTS errors
            if (error.error === 'not-allowed') {
              console.warn('🚫 TTS not allowed. Continuing without speech.');
              // Don't reject, just resolve to continue conversation
              resolve();
            } else if (error.error === 'network') {
              console.warn('🌐 TTS network error. Continuing without speech.');
              resolve();
            } else {
              reject(error);
            }
          };

          // Set a timeout to handle cases where TTS doesn't start
          const startTimeout = setTimeout(() => {
            if (!hasStarted) {
              console.warn('⏰ TTS start timeout. Continuing without speech.');
              this.isSpeaking = false;
              resolve();
            }
          }, 2000);

          utterance.onstart = () => {
            clearTimeout(startTimeout);
            console.log('🔊 Web TTS started');
            hasStarted = true;
            this.isSpeaking = true;
            this.callbacks.onAISpeaking?.();
          };

          this.currentUtterance = utterance;

          try {
            this.webSynthesis.speak(utterance);
          } catch (speakError) {
            clearTimeout(startTimeout);
            console.error('❌ Error calling speak():', speakError);
            this.isSpeaking = false;
            resolve(); // Continue without speech
          }
        });
      } else if (Tts) {
        this.isSpeaking = true;
        this.callbacks.onAISpeaking?.();

        await Tts.speak(processedText, {
          androidParams: {
            KEY_PARAM_PAN: 0, // Center audio
            KEY_PARAM_VOLUME: options.volume || 0.9,
            KEY_PARAM_STREAM: 'STREAM_MUSIC',
          },
          // Use higher quality iOS voices - prefer natural female voices
          iosVoiceId: options.language?.includes('UK') ?
            'com.apple.ttsbundle.Kate-compact' :
            'com.apple.ttsbundle.Samantha-compact', // Samantha is more natural than Moira
          rate: options.rate || 0.6, // Slightly slower for mobile clarity
          pitch: options.pitch || 0.95, // Slightly lower pitch for warmer tone
        });
      } else {
        // No TTS available, just simulate speaking
        console.warn('⚠️ No TTS available. Continuing conversation without speech.');
        this.callbacks.onAISpeaking?.();
        setTimeout(() => {
          this.isSpeaking = false;
        }, Math.min(processedText.length * 50, 3000)); // Simulate reading time
      }
    } catch (error) {
      console.error('❌ Error speaking text:', error);
      this.isSpeaking = false;
      // Don't throw error, continue conversation
      console.warn('🔄 Continuing conversation despite TTS error');
    }
  }

  async stopSpeaking(): Promise<void> {
    if (!this.isSpeaking) return;

    try {
      console.log('🛑 Stopping speech...');

      if (Platform.OS === 'web' && this.webSynthesis) {
        this.webSynthesis.cancel();
        if (this.currentUtterance) {
          this.currentUtterance = null;
        }
      } else if (Tts) {
        await Tts.stop();
      }

      this.isSpeaking = false;
    } catch (error) {
      console.error('❌ Error stopping speech:', error);
      this.isSpeaking = false;
    }
  }

  async startConversation(sessionId: string, callbacks: ConversationCallbacks): Promise<void> {
    if (this.conversationActive) {
      console.log('⚠️ Conversation already active');
      return;
    }

    if (!this.hasPermission) {
      throw new Error('Microphone permission required');
    }

    this.sessionId = sessionId;
    this.callbacks = callbacks;
    this.conversationActive = true;
    this.isProcessing = false;

    console.log('🗣️ Starting real-time conversation mode');

    // Mark that user has interacted (starting conversation is a user action)
    this.userHasInteracted = true;

    // Try to enable TTS if on web
    if (Platform.OS === 'web' && this.webSynthesis && !this.hasTTSPermission) {
      try {
        // Test with a very short, quiet utterance
        const testUtterance = new SpeechSynthesisUtterance('test');
        testUtterance.volume = 0.01;
        testUtterance.rate = 10; // Very fast
        testUtterance.onstart = () => {
          this.hasTTSPermission = true;
          console.log('✅ TTS enabled for conversation');
        };
        testUtterance.onerror = () => {
          console.warn('⚠️ TTS not available, conversation will continue without speech');
          this.hasTTSPermission = false;
        };
        this.webSynthesis.speak(testUtterance);
      } catch (error) {
        console.warn('⚠️ Could not test TTS:', error);
        this.hasTTSPermission = false;
      }
    }

    // Start listening
    await this.startListening();
  }

  async stopConversation(): Promise<void> {
    if (!this.conversationActive) return;

    console.log('🛑 Stopping conversation mode');
    this.conversationActive = false;

    // Stop all activities
    await this.stopListening();
    await this.stopSpeaking();

    // Clear timeouts
    if (this.recognitionTimeoutId) {
      clearTimeout(this.recognitionTimeoutId);
      this.recognitionTimeoutId = null;
    }

    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }

    this.callbacks.onConversationEnd?.();
    this.callbacks = {};
    this.sessionId = null;
    this.isProcessing = false;
  }

  isConversationActive(): boolean {
    return this.conversationActive;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  hasAudioPermission(): boolean {
    return this.hasPermission;
  }

  isSupported(): boolean {
    if (Platform.OS === 'web') {
      return this.isWebSpeechSupported && !!this.webSynthesis;
    }
    return !!(Voice && Tts);
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (Platform.OS === 'web') {
      return this.availableVoices;
    }
    return []; // Mobile TTS voices handled differently
  }

  setVoice(voiceName: string): boolean {
    if (Platform.OS === 'web') {
      const voice = this.availableVoices.find(v => v.name === voiceName);
      if (voice) {
        this.selectedVoice = voice;
        console.log('🎤 Voice changed to:', voice.name);
        return true;
      }
    }
    return false;
  }

  getCurrentVoice(): string | null {
    if (Platform.OS === 'web' && this.selectedVoice) {
      return this.selectedVoice.name;
    }
    return null;
  }

  async destroy(): Promise<void> {
    await this.stopConversation();

    if (Platform.OS !== 'web' && Voice) {
      try {
        await Voice.destroy();
      } catch (error) {
        console.warn('⚠️ Error destroying Voice:', error);
      }
    }
  }
}

export const realtimeVoiceService = new RealtimeVoiceService();
export { RealtimeVoiceService };