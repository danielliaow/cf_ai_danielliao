import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { Readable } from 'stream';
import { AudioConverter } from './audioConverter';

export interface SpeechConfig {
  subscriptionKey: string;
  region: string;
  language?: string;
  voiceName?: string;
}

export interface ConversationMode {
  enabled: boolean;
  sessionId?: string;
  userId: string;
}

export class AzureSpeechService {
  private static instance: AzureSpeechService;
  private speechConfig: sdk.SpeechConfig;
  private conversationModes = new Map<string, ConversationMode>();

  private constructor() {
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';

    if (!subscriptionKey) {
      throw new Error('AZURE_SPEECH_KEY environment variable is required');
    }

    this.speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
    this.speechConfig.speechRecognitionLanguage = 'en-US';
    this.speechConfig.speechSynthesisVoiceName = 'en-US-JennyMultilingualNeural'; // High-quality neural voice
    
    console.log('🎤 Azure Speech Service initialized successfully');
  }

  static getInstance(): AzureSpeechService {
    if (!AzureSpeechService.instance) {
      AzureSpeechService.instance = new AzureSpeechService();
    }
    return AzureSpeechService.instance;
  }

  /**
   * Enable conversational mode for a user session
   */
  enableConversationMode(userId: string, sessionId?: string): void {
    this.conversationModes.set(userId, {
      enabled: true,
      sessionId,
      userId
    });
    console.log(`🗣️ Conversational mode enabled for user: ${userId}`);
  }

  /**
   * Disable conversational mode for a user
   */
  disableConversationMode(userId: string): void {
    this.conversationModes.delete(userId);
    console.log(`🔇 Conversational mode disabled for user: ${userId}`);
  }

  /**
   * Check if user is in conversational mode
   */
  isConversationMode(userId: string): boolean {
    return this.conversationModes.has(userId);
  }

  /**
   * Get conversation mode details for a user
   */
  getConversationMode(userId: string): ConversationMode | null {
    return this.conversationModes.get(userId) || null;
  }

  /**
   * Speech-to-text with streaming support
   */
  async speechToText(audioStream: Readable): Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      try {
        console.log('🔧 Processing audio stream for speech-to-text...');
        // Convert stream to audio config with specific format
        console.log('🎤 Creating audio stream for Azure Speech recognition...');
        const pushStream = sdk.AudioInputStream.createPushStream();
        
        audioStream.on('data', (chunk: Buffer) => {
          const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
          pushStream.write(arrayBuffer);
        });

        audioStream.on('end', () => {
          pushStream.close();
        });

        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
        console.log(recognizer)
        let finalText = '';

        recognizer.recognizeOnceAsync(
          (result) => {
            console.log('🎤 Azure Speech result reason:', result.reason);
            console.log('🎤 Azure Speech result text:', result.text);
            console.log('🎤 Azure Speech result duration:', result.duration);
            console.log('🎤 Azure Speech result offset:', result.offset);
            
            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              finalText = result.text;
              console.log('✅ Speech recognized from stream:', finalText);
              resolve({ success: true, text: finalText });
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              console.log('❌ No speech could be recognized from stream');
              console.log('🔍 NoMatch details:', result);
              resolve({ success: false, error: 'No speech recognized' });
            } else {
              console.log('❌ Speech recognition error from stream:', result.errorDetails);
              console.log('🔍 Error result:', result);
              resolve({ success: false, error: result.errorDetails });
            }
            recognizer.close();
          },
          (error) => {
            console.error('🎤 Speech recognition failed:', error);
            resolve({ success: false, error: error.toString() });
            recognizer.close();
          }
        );
      } catch (error) {
        console.error('🎤 Speech-to-text error:', error);
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }

  /**
   * Text-to-speech with streaming support
   */
  async textToSpeech(text: string): Promise<{
    success: boolean;
    audioData?: Buffer;
    error?: string;
  }> {
    return new Promise((resolve) => {
      try {
        // Clean text for speech (remove markdown, emojis, etc.)
        const cleanText = this.cleanTextForSpeech(text);
        
        const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);

        synthesizer.speakTextAsync(
          cleanText,
          (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              console.log('🔊 Speech synthesis completed');
              const audioData = Buffer.from(result.audioData);
              resolve({ success: true, audioData });
            } else {
              console.error('🔊 Speech synthesis failed:', result.errorDetails);
              resolve({ success: false, error: result.errorDetails });
            }
            synthesizer.close();
          },
          (error) => {
            console.error('🔊 Speech synthesis error:', error);
            resolve({ success: false, error: error.toString() });
            synthesizer.close();
          }
        );
      } catch (error) {
        console.error('🔊 Text-to-speech error:', error);
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }

  /**
   * Real-time continuous speech recognition
   */
  createContinuousRecognition(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): {
    start: () => void;
    stop: () => void;
    pushAudio: (audioData: Buffer) => void;
  } {
    const pushStream = sdk.AudioInputStream.createPushStream();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

    // Continuous recognition events
    recognizer.recognizing = (s, e) => {
      if (e.result.text) {
        onResult(e.result.text, false); // Interim result
      }
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        onResult(e.result.text, true); // Final result
      }
    };

    recognizer.canceled = (s, e) => {
      console.log('🎤 Recognition canceled:', e.reason);
      if (e.reason === sdk.CancellationReason.Error) {
        onError(e.errorDetails);
      }
    };

    return {
      start: () => {
        recognizer.startContinuousRecognitionAsync(
          () => console.log('🎤 Continuous recognition started'),
          (error) => onError(error)
        );
      },
      stop: () => {
        recognizer.stopContinuousRecognitionAsync(
          () => {
            console.log('🎤 Continuous recognition stopped');
            pushStream.close();
            recognizer.close();
          },
          (error) => onError(error)
        );
      },
      pushAudio: (audioData: Buffer) => {
        const arrayBuffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength) as ArrayBuffer;
        pushStream.write(arrayBuffer);
      }
    };
  }

  /**
   * Speech-to-text with format conversion support
   * Handles various audio formats (WebM, MP3, WAV, etc.) and converts them for Azure Speech
   */
  async speechToTextWithConversion(audioBuffer: Buffer, mimeType: string): Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }> {
    try {
      console.log('🔧 Processing audio with format conversion...');
      console.log('📊 Audio details:', { size: audioBuffer.length, mimeType });
      
      // Convert audio to WAV format if needed
      console.log('🔄 Converting audio to Azure-compatible format...');
      const conversionResult = await AudioConverter.convertForAzure(audioBuffer, mimeType);
      
      if (!conversionResult.success || !conversionResult.audioBuffer) {
        console.error('❌ Audio conversion failed:', conversionResult.error);
        return {
          success: false,
          error: `Audio conversion failed: ${conversionResult.error}`
        };
      }
      
      console.log('✅ Audio converted successfully');
      console.log('📊 Converted audio size:', conversionResult.audioBuffer.length, 'bytes');
      
      // Process the converted WAV audio with Azure Speech Service
      return this.processWAVAudio(conversionResult.audioBuffer);
      
    } catch (error) {
      console.error('❌ speechToTextWithConversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processWAVAudio(audioBuffer: Buffer): Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      try {
        console.log('🎤 Processing converted WAV audio with Azure Speech Service...');
        
        // Configure for WAV format (16kHz, 16-bit, mono PCM)
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
        const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
        
        // Push the WAV audio data
        const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
        pushStream.write(arrayBuffer);
        pushStream.close();
        
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
        
        recognizer.recognizeOnceAsync(
          (result) => {
            console.log('🎤 WAV Audio result reason:', result.reason);
            console.log('🎤 WAV Audio result text:', result.text);
            console.log('🎤 WAV Audio result duration:', result.duration);
            
            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              console.log('✅ WAV Speech recognized successfully:', result.text);
              resolve({ success: true, text: result.text });
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              console.log('❌ No speech recognized in converted WAV audio');
              console.log('🔍 NoMatch details:', result);
              resolve({ success: false, error: 'No speech could be recognized from the audio' });
            } else {
              console.log('❌ WAV Speech recognition error:', result.errorDetails);
              resolve({ success: false, error: result.errorDetails || 'Speech recognition failed' });
            }
            recognizer.close();
          },
          (error) => {
            console.error('❌ WAV Speech recognition failed:', error);
            resolve({ success: false, error: error.toString() });
            recognizer.close();
          }
        );
      } catch (error) {
        console.error('❌ processWAVAudio error:', error);
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'WAV processing error' 
        });
      }
    });
  }

  /**
   * Speech-to-text from base64 audio data
   */
  async speechToTextFromBase64(base64Audio: string): Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      try {
        console.log('🔧 Processing base64 audio, length:', base64Audio.length);
        
        const pushStream = sdk.AudioInputStream.createPushStream();

        // Convert base64 → Buffer → ArrayBuffer and push
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        console.log('📊 Converted to buffer, size:', audioBuffer.length, 'bytes');
        
        pushStream.write(
          audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
          )
        );
        pushStream.close();

        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
        console.log('🎙️ Created speech recognizer for base64 audio');

        recognizer.recognizeOnceAsync(
          (result) => {
            console.log('🎤 Azure Speech result reason:', result.reason);
            console.log('🎤 Azure Speech result text:', result.text);
            
            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              console.log('✅ Speech recognized from base64:', result.text);
              resolve({ success: true, text: result.text });
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              console.log('❌ No speech could be recognized from base64');
              console.log('🔍 Result details:', result);
              resolve({ success: false, error: 'No speech recognized' });
            } else {
              console.log('❌ Speech recognition error from base64:', result.errorDetails);
              resolve({ success: false, error: result.errorDetails });
            }
            recognizer.close();
          },
          (error) => {
            console.error('❌ Speech recognition failed for base64:', error);
            resolve({ success: false, error: error.toString() });
            recognizer.close();
          }
        );
      } catch (error) {
        console.error('❌ Base64 speech-to-text error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Clean text for speech synthesis (remove markdown, emojis, etc.)
   */
  private cleanTextForSpeech(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
      .replace(/!\[.*?\]\(.*?\)/g, '') // Images
      // Remove emojis
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      // Remove bullet points and list markers
      .replace(/^[\s]*[-•*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Set voice for speech synthesis
   */
  setVoice(voiceName: string): void {
    this.speechConfig.speechSynthesisVoiceName = voiceName;
    console.log(`🔊 Voice changed to: ${voiceName}`);
  }

  /**
   * Set language for recognition and synthesis
   */
  setLanguage(language: string): void {
    this.speechConfig.speechRecognitionLanguage = language;
    console.log(`🌐 Language changed to: ${language}`);
  }

  /**
   * Get available voices (this would typically call Azure API)
   */
  getAvailableVoices(): string[] {
    return [
      'en-US-JennyMultilingualNeural',
      'en-US-GuyNeural',
      'en-US-AriaNeural',
      'en-US-DavisNeural',
      'en-US-AmberNeural',
      'en-US-AnaNeural',
      'en-US-AndrewNeural',
      'en-US-EmmaNeural',
      'en-US-BrianNeural',
      'en-US-ChristopherNeural'
    ];
  }
}