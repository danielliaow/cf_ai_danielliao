import { supabase } from '../lib/supabase';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';

const MCP_BASE_URL = process.env.EXPO_PUBLIC_MCP_BASE_URL;

export interface VoiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface ConversationStatus {
  enabled: boolean;
  sessionId?: string;
  userId: string;
}

export class VoiceService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isRecording = false;
  private isInitialized = false;
  private lastRecordingUri: string | null = null;
  private isContinuousMode = false;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private volumeThreshold = 0.02; // Improved silence threshold (higher to avoid noise)
  private silenceDelay = 2000; // 2 seconds of silence before auto-processing (faster response)
  private minRecordingDuration = 1000; // Minimum 1 second recording before processing (faster)
  private maxRecordingDuration = 30000; // Maximum 30 seconds per recording (shorter for better UX)
  private recordingStartTime: number = 0;
  private onContinuousMessage?: (message: any) => void;
  private continuousSessionId?: string;
  private lastSpeechDetectedTime: number = 0;
  private recordingStatus: any = null; // Store recording status for voice level monitoring
  private voiceDetectionInterval: NodeJS.Timeout | null = null;
  private recentVolumeReadings: number[] = []; // Rolling average of volume levels
  private volumeHistorySize = 10; // Keep last 10 readings
  private speechStartThreshold = 0.03; // Threshold to detect speech start
  private speechEndThreshold = 0.015; // Lower threshold to detect speech end
  private consecutiveSilentChecks = 0; // Count consecutive silent intervals
  private maxSilentChecks = 6; // Number of consecutive silent checks before processing (2 seconds at 300ms intervals)

  /**
   * Initialize voice service and request microphone permissions
   */
  static async initialize(): Promise<boolean> {
    try {
      // Request microphone permissions automatically
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status === 'granted') {
        // Set optimal audio mode for voice recording and playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        console.log('🎤 Audio permissions granted and optimized mode set');
        return true;
      } else {
        console.error('❌ Microphone access denied:', permission);
        
        // Try requesting again with user-friendly prompting
        console.log('🔄 Trying to request microphone permissions again...');
        const secondTry = await Audio.requestPermissionsAsync();
        if (secondTry.status === 'granted') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          console.log('🎤 Audio permissions granted on second try');
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing audio:', error);
      return false;
    }
  }

  static async stopAudioPlayback(){
    try {
      console.log('🛑 Stopping any ongoing audio playback...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      console.log('✅ Audio playback stopped');
    }
    catch(e){
      console.error('❌ Error stopping audio playback:', e);
    }
  }
  /**
   * Enable conversational mode
   */
  static async enableConversationMode(sessionId?: string): Promise<VoiceResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/enable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error enabling conversation mode:', error);
      throw error;
    }
  }

  /**
   * Disable conversational mode
   */
  static async disableConversationMode(): Promise<VoiceResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error disabling conversation mode:', error);
      throw error;
    }
  }

  /**
   * Get conversational mode status
   */
  static async getConversationStatus(): Promise<{ success: boolean; conversationMode: ConversationStatus | null; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting conversation status:', error);
      return { success: false, conversationMode: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Start recording audio
   */
  
  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) return;
  
      if (!this.isInitialized) {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        this.isInitialized = true;
      }
  
      // Use specific options optimized for Azure Speech Recognition
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000, // Azure Speech optimal
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000, // Azure Speech optimal  
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
  
      this.recording = recording;
      this.isRecording = true;
      console.log("🎤 Started recording");
    } catch (error) {
      console.error("❌ Error starting recording:", error);
      throw error;
    }
  }

  /**
   * Stop recording audio and return file URI
   */
  async stopRecording(): Promise<string> {
    try {
      if (!this.isRecording || !this.recording) {
        throw new Error('Not currently recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isRecording = false;
      
      if (!uri) {
        throw new Error('Recording failed - no URI available');
      }
      
      console.log('🎤 Stopped recording, file URI:', uri);
      
      // Store the last recording for rehear functionality
      this.lastRecordingUri = uri;
      
      // Get file info for debugging
      if (Platform.OS !== 'web') {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          console.log('📁 File info:', {
            exists: fileInfo.exists,
            size: fileInfo.exists ? fileInfo.size : 'N/A',
            uri: uri
          });
        } catch (e) {
          console.warn('⚠️ Could not get file info:', e);
        }
      }
      
      // Clean up the recording object
      this.recording = null;
      
      return uri;
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      this.isRecording = false;
      this.recording = null;
      throw error;
    }
  }

  /**
   * Clean up recording resources
   */
  private cleanup(): void {
    this.isRecording = false;
    if (this.recording) {
      this.recording.stopAndUnloadAsync().catch(console.error);
      this.recording = null;
    }
    if (this.sound) {
      this.sound.unloadAsync().catch(console.error);
      this.sound = null;
    }
    
    // Clean up voice detection
    if (this.voiceDetectionInterval) {
      clearInterval(this.voiceDetectionInterval);
      this.voiceDetectionInterval = null;
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    // Reset voice detection state
    this.consecutiveSilentChecks = 0;
    this.recentVolumeReadings = [];
  }

  /**
   * Cancel current recording
   */
  cancelRecording(): void {
    if (this.isRecording) {
      this.cleanup();
      console.log('🎤 Recording canceled');
    }
  }

  /**
   * Play back the last recorded audio
   */
  async rehearLastRecording(): Promise<void> {
    if (!this.lastRecordingUri) {
      throw new Error('No recording available to rehear');
    }

    try {
      console.log('🔊 Playing back last recording:', this.lastRecordingUri);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: this.lastRecordingUri },
        { shouldPlay: true, volume: 1.0 }
      );

      return new Promise((resolve, reject) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              sound.unloadAsync().catch(console.error);
              resolve();
            }
          } else if (status.error) {
            console.error('❌ Rehear playback error:', status.error);
            sound.unloadAsync().catch(console.error);
            reject(new Error(status.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error rehearing recording:', error);
      throw error;
    }
  }

  /**
   * Get whether there's a recording available to rehear
   */
  hasRecordingToRehear(): boolean {
    return !!this.lastRecordingUri;
  }

  /**
   * Test audio processing without full AI pipeline (for debugging)
   */
  static async testAudioProcessing(audioUri: string): Promise<{
    success: boolean;
    results?: any;
    fileInfo?: any;
    error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🧪 Testing audio processing...', audioUri);

      // Create FormData for file upload
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(audioUri);
        const audioBlob = await response.blob();
        formData.append('audio', audioBlob, 'test-recording.webm');
      } else {
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
          throw new Error('Audio file not found');
        }
        
        const base64String = await FileSystem.readAsStringAsync(audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        formData.append('audio', {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'test-recording.m4a',
        } as any);
        
        formData.append('base64String', base64String);
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/test-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🧪 Audio test results:', result);

      return {
        success: true,
        results: result.results,
        fileInfo: result.fileInfo,
      };
    } catch (error) {
      console.error('❌ Error testing audio processing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio test failed',
      };
    }
  }

// async convertBlobToWav(blob: Blob): Promise<Blob> {
//     const arrayBuffer = await blob.arrayBuffer();
//     const audioContext = new AudioContext();
//     const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
//     const channelData = [];
//     for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
//       channelData.push(audioBuffer.getChannelData(i));
//     }
  
//     const wavBuffer = await WavEncoder.encode({
//       sampleRate: audioBuffer.sampleRate,
//       channelData,
//     });
  
//     return new Blob([wavBuffer], { type: "audio/wav" });
//   }

//   async  convertToWav(inputUri: string): Promise<string> {
//     const outputUri = inputUri.replace(/\.m4a$/, ".wav");
  
//     await FFmpegKit.execute(
//       `-i ${inputUri} -ar 44100 -ac 2 -b:a 192k ${outputUri}`
//     );
  
//     return outputUri;
//   }
  
async speechToTextFromBase64(base64Audio: string): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      const pushStream = sdk.AudioInputStream.createPushStream();

      // Convert base64 → Buffer → ArrayBuffer and push
      const audioBuffer = Buffer.from(base64Audio, "base64");
      pushStream.write(
        audioBuffer.buffer.slice(
          audioBuffer.byteOffset,
          audioBuffer.byteOffset + audioBuffer.byteLength
        )
      );
      pushStream.close();

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
      const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

      recognizer.recognizeOnceAsync(
        (result) => {
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            console.log("🎤 Speech recognized:", result.text);
            resolve({ success: true, text: result.text });
          } else if (result.reason === sdk.ResultReason.NoMatch) {
            console.log("🎤 No speech could be recognized");
            resolve({ success: false, error: "No speech recognized" });
          } else {
            console.log("🎤 Speech recognition error:", result.errorDetails);
            resolve({ success: false, error: result.errorDetails });
          }
          recognizer.close();
        },
        (error) => {
          console.error("🎤 Speech recognition failed:", error);
          resolve({ success: false, error: error.toString() });
          recognizer.close();
        }
      );
    } catch (error) {
      console.error("🎤 Speech-to-text error:", error);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}


  
  /**
   * Send audio file to backend and get response
   */
  static async processVoiceMessage(audioUri: string): Promise<{
    success: boolean;
    audioData?: ArrayBuffer;
    userText?: string;
    aiText?: string;
    toolUsed?: string;
    error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🎤 Sending audio for processing...', audioUri);

      // Create FormData for file upload
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // For web, we need to read the blob from the URI
        const response = await fetch(audioUri);
        const audioBlob = await response.blob();
        formData.append('audio', audioBlob, 'recording.webm');
      } else {
        // For mobile platforms, read file as base64 and send both file and base64
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
          throw new Error('Audio file not found');
        }
        
        console.log('📁 Mobile file info:', {
          exists: fileInfo.exists,
          size: fileInfo.size,
          uri: audioUri
        });
        
        const base64String = await FileSystem.readAsStringAsync(audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('🔧 Base64 string length:', base64String.length);

        // Send the file for multer to handle (use proper format based on recording settings)
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/wav',
          name: 'recording.wav',
        } as any);
        
        // Also send base64 string in the body
        formData.append('base64String', base64String);
      }
     

      const response = await fetch(`${MCP_BASE_URL}/conversation/speak`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle new JSON response format with full content
     
    
      if (response.ok) {
        // New JSON format with full content
        const responseData = await response.json();
        console.log('🔍 Full response data:', responseData);
      
      
        // Handle different possible formats for audioData
        let audioData;
        if (responseData.audioData) {
          if (responseData.audioData.data) {
            // ArrayBuffer serialized as {type: 'Buffer', data: [...]}
            audioData = new Uint8Array(responseData.audioData.data);
          } else if (Array.isArray(responseData.audioData)) {
            // Direct array format
            audioData = new Uint8Array(responseData.audioData);
          } else {
            // Direct buffer format
            audioData = new Uint8Array(responseData.audioData);
          }
        } else {
          throw new Error('No audio data in response');
        }
        
        const userText = responseData.userText || '';
        const aiText = responseData.aiResponse || '';
        const toolUsed = responseData.toolUsed || '';
        
        console.log('📢 Received full voice response:', {
          userTextLength: userText.length,
          aiTextLength: aiText.length,
          audioDataLength: audioData.length,
          toolUsed,
          responseDataKeys: Object.keys(responseData)
        });

        console.log('🔊 Received audio response:', audioData.byteLength, 'bytes');
        console.log('🎤 User said:', userText);
        console.log('🧠 AI responded:', aiText);

        return {
          success: true,
          audioData: audioData.buffer,
          userText,
          aiText,
          toolUsed,
        };
      } else {
        // Fallback to old header-based format
        const audioData = await response.arrayBuffer();
        const userText = response.headers.get('X-User-Text') || '';
        const aiText = response.headers.get('X-AI-Text') || '';
        const toolUsed = response.headers.get('X-Tool-Used') || '';

        console.log('🔊 Received audio response (legacy):', audioData.byteLength, 'bytes');
        console.log('🎤 User said:', userText);
        console.log('🧠 AI responded:', aiText);

        return {
          success: true,
          audioData,
          userText,
          aiText,
          toolUsed,
        };
      }
    } catch (error) {
      console.error('❌ Error processing voice message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice processing failed',
      };
    }
  }

  /**
   * Play audio response using Expo AV
   */
  static async playAudioResponse(audioData: ArrayBuffer): Promise<void> {
    try {
      console.log('🔊 Playing audio response');
      
      // Convert ArrayBuffer to base64 for mobile platforms
      const base64Audio = Buffer.from(audioData).toString('base64');
      const audioUri = `data:audio/wav;base64,${base64Audio}`;
      
      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Wait for playback to complete
      return new Promise((resolve, reject) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              sound.unloadAsync().catch(console.error);
              resolve();
            }
          } else if (status.error) {
            console.error('❌ Audio playback error:', status.error);
            sound.unloadAsync().catch(console.error);
            reject(new Error(status.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Convert text to speech
   */
  static async textToSpeech(text: string): Promise<ArrayBuffer | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('❌ Error in text-to-speech:', error);
      return null;
    }
  }

  /**
   * Process text query in conversational mode
   */
  static async processTextMessage(query: string, sessionId?: string): Promise<VoiceResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/text`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error processing text message:', error);
      throw error;
    }
  }

  /**
   * Get available voices
   */
  static async getAvailableVoices(): Promise<{ success: boolean; voices?: Array<{name: string; displayName: string}>; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/voices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting voices:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Set voice for TTS
   */
  static async setVoice(voiceName: string): Promise<VoiceResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${MCP_BASE_URL}/conversation/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voiceName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error setting voice:', error);
      throw error;
    }
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Start continuous conversation mode
   */
  async startContinuousMode(sessionId: string, onMessage: (message: any) => void): Promise<void> {
    try {
      console.log('🔄 Starting continuous conversation mode...');
      
      this.isContinuousMode = true;
      this.continuousSessionId = sessionId;
      this.onContinuousMessage = onMessage;
      
      // Enable conversation mode on backend
      await VoiceService.enableConversationMode(sessionId);
      
      // Start the first recording cycle
      await this.startContinuousRecording();
      
      console.log('✅ Continuous mode started - listening...');
    } catch (error) {
      console.error('❌ Error starting continuous mode:', error);
      this.isContinuousMode = false;
      throw error;
    }
  }

  /**
   * Stop continuous conversation mode
   */
  async stopContinuousMode(): Promise<void> {
    try {
      console.log('🛑 Stopping continuous conversation mode...');
      
      this.isContinuousMode = false;
      
      // Clear any pending silence timeout
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      
      // Clear voice detection interval
      if (this.voiceDetectionInterval) {
        clearInterval(this.voiceDetectionInterval);
        this.voiceDetectionInterval = null;
      }
      
      // Stop current recording if active
      if (this.isRecording) {
        await this.stopRecording();
      }
      
      // Disable conversation mode on backend
      await VoiceService.disableConversationMode();
      
      console.log('✅ Continuous mode stopped');
    } catch (error) {
      console.error('❌ Error stopping continuous mode:', error);
      throw error;
    }
  }

  /**
   * Start a recording cycle with silence detection
   */
  private async startContinuousRecording(): Promise<void> {
    if (!this.isContinuousMode) return;
    
    try {
      this.recordingStartTime = Date.now();
      this.lastSpeechDetectedTime = Date.now(); // Assume speech starts immediately
      
      await this.startRecording();
      
      // Set up intelligent silence detection
      this.startIntelligentSilenceDetection();
      
    } catch (error) {
      console.error('❌ Error in continuous recording:', error);
      // Retry after a short delay if still in continuous mode
      if (this.isContinuousMode) {
        setTimeout(() => this.startContinuousRecording(), 1000);
      }
    }
  }

  /**
   * Start intelligent silence detection with real voice activity detection
   */
  private startIntelligentSilenceDetection(): void {
    if (!this.recording) return;
    
    console.log('🎤 Starting enhanced voice activity detection...');
    
    // Clear any existing detection interval
    if (this.voiceDetectionInterval) {
      clearInterval(this.voiceDetectionInterval);
    }
    
    // Reset detection state
    this.consecutiveSilentChecks = 0;
    this.recentVolumeReadings = [];
    
    const statusCheckInterval = 300; // Check every 300ms for responsive detection
    
    const checkVoiceActivity = async () => {
      if (!this.isContinuousMode || !this.isRecording || !this.recording) {
        if (this.voiceDetectionInterval) {
          clearInterval(this.voiceDetectionInterval);
          this.voiceDetectionInterval = null;
        }
        return;
      }
      
      try {
        // Get current recording status including audio levels
        const status = await this.recording.getStatusAsync();
        this.recordingStatus = status;
        
        const currentTime = Date.now();
        const recordingDuration = currentTime - this.recordingStartTime;
        
        // Auto-process if recording is getting too long (safety mechanism)
        if (recordingDuration > this.maxRecordingDuration) {
          console.log('⏰ Maximum recording duration reached - processing speech...');
          this.processContinuousRecording();
          return;
        }
        
        // Don't process if recording is too short (minimum duration check)
        if (recordingDuration < this.minRecordingDuration) {
          return;
        }
        
        // Check if recording is actually active
        if (status.isRecording && status.metering !== undefined) {
          // Use actual audio metering if available
          const currentVolume = Math.abs(status.metering || 0);
          
          // Add to volume history (rolling average)
          this.recentVolumeReadings.push(currentVolume);
          if (this.recentVolumeReadings.length > this.volumeHistorySize) {
            this.recentVolumeReadings.shift();
          }
          
          // Calculate average volume over recent readings
          const avgVolume = this.recentVolumeReadings.reduce((a, b) => a + b, 0) / this.recentVolumeReadings.length;
          
          // Enhanced voice activity detection
          const isSpeaking = avgVolume > this.speechEndThreshold;
          
          if (isSpeaking) {
            // Reset silence counter when speech is detected
            this.consecutiveSilentChecks = 0;
            this.lastSpeechDetectedTime = currentTime;
            console.log(`🎙️ Voice activity detected (volume: ${avgVolume.toFixed(4)}) at ${recordingDuration}ms`);
          } else {
            // Increment silence counter
            this.consecutiveSilentChecks++;
            
            // Process after enough consecutive silent checks
            if (this.consecutiveSilentChecks >= this.maxSilentChecks) {
              console.log(`🤫 Silence detected after ${recordingDuration}ms - processing complete speech...`);
              this.processContinuousRecording();
              return;
            }
          }
        } else if (status.isRecording) {
          // Fallback for when metering is not available
          // Use duration-based detection similar to before but with improved timing
          if (status.durationMillis > this.lastSpeechDetectedTime + 800) {
            this.lastSpeechDetectedTime = status.durationMillis;
            this.consecutiveSilentChecks = 0;
            console.log(`🎙️ Voice activity detected (fallback) at ${recordingDuration}ms`);
          } else {
            this.consecutiveSilentChecks++;
            
            if (this.consecutiveSilentChecks >= this.maxSilentChecks) {
              console.log(`🤫 Silence detected (fallback) after ${recordingDuration}ms - processing speech...`);
              this.processContinuousRecording();
              return;
            }
          }
        } else {
          // Recording stopped unexpectedly, process what we have
          console.log('🛑 Recording stopped unexpectedly, processing...');
          this.processContinuousRecording();
        }
        
      } catch (error) {
        console.error('❌ Error checking voice activity:', error);
        // Fallback to processing after a reasonable delay
        setTimeout(() => {
          if (this.isContinuousMode && this.isRecording) {
            this.processContinuousRecording();
          }
        }, 1000);
      }
    };
    
    // Start voice activity detection using interval instead of recursive setTimeout
    this.voiceDetectionInterval = setInterval(checkVoiceActivity, statusCheckInterval);
  }

  /**
   * Process the current recording and restart listening
   */
  private async processContinuousRecording(): Promise<void> {
    try {
      // Stop current recording
      const audioUri = await this.stopRecording();
      
      if (!audioUri || !this.continuousSessionId) return;
      
      console.log('🎤 Processing continuous recording...');
      
      // Process the audio
      const result = await this.sendAudioForProcessing(audioUri, this.continuousSessionId);
      
      // Notify the UI component
      if (this.onContinuousMessage && result.success) {
        this.onContinuousMessage({
          userText: result.userText,
          aiText: result.aiText,
          audioData: result.audioData,
        });
      }
      
      // Play the AI response
      if (result.success && result.audioData) {
        await this.playAudioResponse(result.audioData);
      }
      
      // Restart listening if still in continuous mode
      if (this.isContinuousMode) {
        setTimeout(() => {
          console.log('🔄 Restarting listening...');
          this.startContinuousRecording();
        }, 500); // Small delay before restarting
      }
      
    } catch (error) {
      console.error('❌ Error processing continuous recording:', error);
      
      // Restart listening on error if still in continuous mode
      if (this.isContinuousMode) {
        setTimeout(() => this.startContinuousRecording(), 2000);
      }
    }
  }

  /**
   * Send audio for processing (extracted from existing processVoiceMessage)
   */
  private async sendAudioForProcessing(audioUri: string, sessionId: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const formData = new FormData();

    // Read and convert audio file to base64
    const base64String = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('🔧 Base64 string length:', base64String.length);

    // Send the file for multer to handle (use proper format based on recording settings)
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/wav',
      name: 'recording.wav',
    } as any);
    
    // Also send base64 string in the body
    formData.append('base64String', base64String);

    const response = await fetch(`${MCP_BASE_URL}/conversation/speak`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const audioData = await response.arrayBuffer();
    const userText = response.headers.get('X-User-Text') || '';
    const aiText = response.headers.get('X-AI-Text') || '';
    const toolUsed = response.headers.get('X-Tool-Used') || '';

    console.log('🔊 Received audio response:', audioData.byteLength, 'bytes');
    console.log('🎤 User said:', userText);
    console.log('🧠 AI responded:', aiText);

    return {
      success: true,
      audioData,
      userText,
      aiText,
      toolUsed,
    };
  }

  /**
   * Play audio response
   */
  private async playAudioResponse(audioData: ArrayBuffer): Promise<void> {
    try {
      // Convert ArrayBuffer to base64
      const buffer = Buffer.from(audioData);
      const base64Audio = buffer.toString('base64');
      const audioUri = `data:audio/wav;base64,${base64Audio}`;

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Wait for playback to complete
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            resolve();
          }
        });
      });

    } catch (error) {
      console.error('❌ Error playing audio response:', error);
    }
  }

  /**
   * Check if in continuous mode
   */
  getIsContinuousMode(): boolean {
    return this.isContinuousMode;
  }
}