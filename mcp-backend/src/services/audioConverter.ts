import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { Readable, PassThrough } from 'stream';
import { Buffer } from 'buffer';

// Set the ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

export interface AudioConversionResult {
  success: boolean;
  audioBuffer?: Buffer;
  error?: string;
}

export class AudioConverter {
  /**
   * Convert WebM audio to WAV format suitable for Azure Speech Service
   * Azure Speech Service requires: PCM WAV, 16kHz, 16-bit, mono
   */
  static async webmToWav(webmBuffer: Buffer): Promise<AudioConversionResult> {
    return new Promise((resolve) => {
      try {
        console.log('🔄 Converting WebM to WAV...');
        console.log('📊 Input WebM size:', webmBuffer.length, 'bytes');

        // Create readable stream from buffer
        const inputStream = new Readable();
        inputStream.push(webmBuffer);
        inputStream.push(null); // End the stream

        // Create output stream to collect converted data
        const outputStream = new PassThrough();
        const chunks: Buffer[] = [];

        outputStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        outputStream.on('end', () => {
          const wavBuffer = Buffer.concat(chunks);
          console.log('✅ WebM to WAV conversion completed');
          console.log('📊 Output WAV size:', wavBuffer.length, 'bytes');
          resolve({ success: true, audioBuffer: wavBuffer });
        });

        outputStream.on('error', (error) => {
          console.error('❌ Output stream error:', error);
          resolve({ success: false, error: error.message });
        });

        // Configure ffmpeg for Azure Speech Service requirements
        ffmpeg(inputStream)
          .inputFormat('webm') // Input format
          .audioCodec('pcm_s16le') // PCM 16-bit little-endian
          .audioChannels(1) // Mono
          .audioFrequency(16000) // 16kHz sample rate
          .format('wav') // Output format
          .on('start', (commandLine) => {
            console.log('🎵 FFmpeg conversion started:', commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log('📈 Conversion progress:', Math.round(progress.percent), '%');
            }
          })
          .on('end', () => {
            console.log('🎉 FFmpeg conversion finished successfully');
          })
          .on('error', (error, stdout, stderr) => {
            console.error('❌ FFmpeg conversion error:', error.message);
            console.error('❌ FFmpeg stderr:', stderr);
            console.error('❌ FFmpeg stdout:', stdout);
            resolve({ 
              success: false, 
              error: `FFmpeg conversion failed: ${error.message}` 
            });
          })
          .pipe(outputStream, { end: true });

      } catch (error) {
        console.error('❌ WebM to WAV conversion error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown conversion error'
        });
      }
    });
  }

  /**
   * Convert various audio formats to WAV
   */
  static async convertToWav(audioBuffer: Buffer, inputFormat: string): Promise<AudioConversionResult> {
    return new Promise((resolve) => {
      try {
        console.log(`🔄 Converting ${inputFormat} to WAV...`);
        console.log('📊 Input size:', audioBuffer.length, 'bytes');

        const inputStream = new Readable();
        inputStream.push(audioBuffer);
        inputStream.push(null);

        const outputStream = new PassThrough();
        const chunks: Buffer[] = [];

        outputStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        outputStream.on('end', () => {
          const wavBuffer = Buffer.concat(chunks);
          console.log(`✅ ${inputFormat} to WAV conversion completed`);
          console.log('📊 Output WAV size:', wavBuffer.length, 'bytes');
          resolve({ success: true, audioBuffer: wavBuffer });
        });

        outputStream.on('error', (error) => {
          console.error('❌ Output stream error:', error);
          resolve({ success: false, error: error.message });
        });

        // Detect input format and configure conversion
        let ffmpegCommand = ffmpeg(inputStream);

        // Set input format if specified
        if (inputFormat && inputFormat !== 'auto') {
          ffmpegCommand = ffmpegCommand.inputFormat(inputFormat);
        }

        ffmpegCommand
          .audioCodec('pcm_s16le') // PCM 16-bit
          .audioChannels(1) // Mono
          .audioFrequency(16000) // 16kHz
          .format('wav') // Output WAV
          .on('start', (commandLine) => {
            console.log('🎵 FFmpeg started:', commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log('📈 Progress:', Math.round(progress.percent), '%');
            }
          })
          .on('end', () => {
            console.log('🎉 Conversion finished successfully');
          })
          .on('error', (error, stdout, stderr) => {
            console.error('❌ Conversion error:', error.message);
            console.error('❌ stderr:', stderr);
            resolve({ 
              success: false, 
              error: `Conversion failed: ${error.message}` 
            });
          })
          .pipe(outputStream, { end: true });

      } catch (error) {
        console.error('❌ Audio conversion error:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown conversion error'
        });
      }
    });
  }

  /**
   * Get audio format from MIME type
   */
  static getFormatFromMimeType(mimeType: string): string {
    const formatMap: { [key: string]: string } = {
      'audio/webm': 'webm',
      'audio/webm;codecs=opus': 'webm',
      'audio/mp4': 'mp4',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
    };

    return formatMap[mimeType.toLowerCase()] || 'auto';
  }

  /**
   * Check if conversion is needed for Azure Speech Service
   */
  static needsConversion(mimeType: string): boolean {
    // Azure Speech Service natively supports WAV, so only convert if not WAV
    const wavFormats = [
      'audio/wav',
      'audio/wave', 
      'audio/x-wav'
    ];
    
    return !wavFormats.includes(mimeType.toLowerCase());
  }

  /**
   * Convert audio buffer to Azure Speech Service compatible format
   */
  static async convertForAzure(audioBuffer: Buffer, mimeType: string): Promise<AudioConversionResult> {
    try {
      console.log('🔍 Checking if conversion needed for:', mimeType);
      
      if (!this.needsConversion(mimeType)) {
        console.log('✅ Audio is already in compatible format');
        return { success: true, audioBuffer };
      }

      console.log('🔄 Conversion needed, processing...');
      const inputFormat = this.getFormatFromMimeType(mimeType);
      
      if (mimeType.includes('webm')) {
        return await this.webmToWav(audioBuffer);
      } else {
        return await this.convertToWav(audioBuffer, inputFormat);
      }
    } catch (error) {
      console.error('❌ convertForAzure error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion error'
      };
    }
  }
}