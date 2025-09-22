import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { AzureSpeechService } from '../services/azureSpeechService';
import { AIService, AIModelType } from '../services/aiService';
import { SessionService } from '../services/sessionService';
import { UserContext } from '../types/aiTools';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../services/supabase';

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files including common mobile formats
    const allowedMimeTypes = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/m4a',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
      'application/octet-stream' // Sometimes mobile uploads come as this
    ];
    
    if (file.mimetype.startsWith('audio/') || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Audio file type not supported: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  },
});

const speechService = AzureSpeechService.getInstance();

/**
 * Helper function to get user's preferred AI model and create appropriate AIService instance
 */
async function createAIServiceForUser(userId: string): Promise<AIService> {
  try {
    // Get user preferences from Supabase
    const { data: preferencesData, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error || !preferencesData?.preferences?.assistantBehavior?.preferred_model) {
      // Default to gemini if no preference is set
      console.log(`🤖 Using default model (Gemini) for user ${userId}`);
      return new AIService('gemini');
    }

    const preferredModel = preferencesData.preferences.assistantBehavior.preferred_model as AIModelType;
    console.log(`🤖 Using preferred model (${preferredModel}) for user ${userId}`);
    return new AIService(preferredModel);
  } catch (error) {
    console.error('❌ Error fetching user preferences, defaulting to Gemini:', error);
    return new AIService('gemini');
  }
}

/**
 * Enable conversational mode for a user
 * POST /api/conversation/enable
 */
router.post('/enable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    const { sessionId } = req.body;
    
    speechService.enableConversationMode(req.user.id, sessionId);
    
    res.json({
      success: true,
      message: 'Conversational mode enabled',
      userId: req.user.id,
      sessionId,
    });
    
    console.log(`🗣️ Conversational mode enabled for user: ${req.user.email}`);
    
  } catch (error) {
    console.error('❌ Error enabling conversational mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable conversational mode',
    });
  }
});

/**
 * Disable conversational mode for a user
 * POST /api/conversation/disable
 */
router.post('/disable', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    speechService.disableConversationMode(req.user.id);
    
    res.json({
      success: true,
      message: 'Conversational mode disabled',
      userId: req.user.id,
    });
    
    console.log(`🔇 Conversational mode disabled for user: ${req.user.email}`);
    
  } catch (error) {
    console.error('❌ Error disabling conversational mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable conversational mode',
    });
  }
});

/**
 * Get conversational mode status
 * GET /api/conversation/status
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    const isEnabled = speechService.isConversationMode(req.user.id);
    const mode = speechService.getConversationMode(req.user.id);
    
    res.json({
      success: true,
      conversationMode: {
        enabled: isEnabled,
        ...mode,
      },
    });
    
  } catch (error) {
    console.error('❌ Error getting conversation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation status',
    });
  }
});

/**
 * Process speech-to-text and return AI response with text-to-speech
 * POST /api/conversation/speak
 */
router.post('/speak', authenticateToken, upload.single('audio'), async (req: AuthenticatedRequest, res) => {
  console.log("🎤 Processing /speak endpoint")
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required',
      });
    }

    console.log(`🎤 Processing speech for user: ${req.user?.email}`);
    console.log(`📁 File info:`, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length
    });

    // Log first few bytes to identify file format
    const firstBytes = req.file.buffer.slice(0, 16);
    console.log('🔍 File header (first 16 bytes):', firstBytes.toString('hex'));
    console.log('🔍 File header as text:', firstBytes.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
    
    // Detect audio format based on magic bytes
    let detectedFormat = 'unknown';
    if (firstBytes.slice(0, 4).toString('hex') === '52494646') {
      detectedFormat = 'WAV (RIFF)';
    } else if (firstBytes.slice(4, 8).toString('ascii') === 'ftyp') {
      detectedFormat = 'MP4/M4A';
    } else if (firstBytes.slice(0, 3).toString('hex') === 'fff8' || firstBytes.slice(0, 3).toString('hex') === 'fff9') {
      detectedFormat = 'MP3';
    }
    console.log('🔍 Detected audio format:', detectedFormat);
    
    // Use enhanced speech processing with automatic format conversion
    console.log('🔧 Using enhanced audio processing with format conversion...');
    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    console.log('📊 Audio details:', { size: audioBuffer.length, mimeType });
    
    const speechResult = await (speechService as any).speechToTextWithConversion(audioBuffer, mimeType);
    
    if (!speechResult.success || !speechResult.text) {
      return res.status(400).json({
        success: false,
        error: speechResult.error || 'Failed to recognize speech',
      });
    }

    console.log(`🎤 Speech recognized: "${speechResult.text}"`);

    // Get conversation mode info
    const conversationMode = speechService.getConversationMode(req.user.id);
    
    // Process AI query with conversation context
    const context: UserContext = {
      query: speechResult.text,
      timestamp: new Date().toISOString(),
      timezone: req.headers['x-timezone'] as string || 'UTC',
      sessionId: conversationMode?.sessionId,
      preferences: {
        responseStyle: 'conversational',
        includeActions: false, // Disable suggested actions in voice mode
        isVoiceQuery: true, // Flag to enable enhanced web scraping for voice queries
        isVoiceMode: true,  // Flag for voice-specific response formatting
      },
    };

    // Create AI service instance with user's preferred model
    const aiService = await createAIServiceForUser(req.user.id);
    const aiResponse = await aiService.processQuery(context, req.user.id);
    
    if (!aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse.error || 'AI processing failed',
      });
    }

    console.log(`🧠 AI response: "${aiResponse.naturalResponse}"`);

    // Convert AI response to speech
    const ttsResult = await speechService.textToSpeech(aiResponse.naturalResponse);
    
    if (!ttsResult.success || !ttsResult.audioData) {
      return res.status(500).json({
        success: false,
        error: ttsResult.error || 'Failed to synthesize speech',
      });
    }

    // Save conversation to session if session ID is provided
    if (conversationMode?.sessionId) {
      try {
        await SessionService.addMessage({
          session_id: conversationMode.sessionId,
          role: 'user',
          content: speechResult.text,
          metadata: { isVoice: true }
        });
        
        await SessionService.addMessage({
          session_id: conversationMode.sessionId,
          role: 'assistant',
          content: aiResponse.naturalResponse,
          metadata: { 
            isVoice: true,
            toolUsed: aiResponse.toolUsed,
            reasoning: aiResponse.reasoning,
          }
        });
      } catch (sessionError) {
        console.warn('⚠️ Failed to save conversation to session:', sessionError);
      }
    }

    console.log(`🔊 Speech synthesis completed, returning ${ttsResult.audioData.length} bytes`);

    // Sanitize header values to prevent invalid characters (increased limit for better UX)
    const sanitizeHeader = (text: string) => {
      const cleaned = text.replace(/[^\x20-\x7E]/g, '');
      // Use larger limit and add truncation indicator
      return cleaned.length > 1000 ? cleaned.substring(0, 1000) + '...' : cleaned;
    };

    // Create response object with full content
    const responseData = {
      audioData: ttsResult.audioData,
      userText: speechResult.text,
      aiResponse: aiResponse.naturalResponse,
      toolUsed: aiResponse.toolUsed || '',
      rawData: aiResponse.rawData
    };

    // Return multipart response with both audio and full text
    res.set({
      'Content-Type': 'application/json',
      'X-User-Text': sanitizeHeader(speechResult.text),
      'X-AI-Text': sanitizeHeader(aiResponse.naturalResponse),
      'X-Tool-Used': sanitizeHeader(aiResponse.toolUsed || ''),
      'X-Has-Audio': 'true',
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error in speech processing:', error);
    res.status(500).json({
      success: false,
      error: 'Speech processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Process text query in conversational mode (returns clean text without formatting)
 * POST /api/conversation/text
 */
router.post('/text', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    const { query, sessionId } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string',
      });
    }

    console.log(`💬 Processing text query in conversation mode: "${query}"`);

    // Process AI query with conversational formatting
    const context: UserContext = {
      query: query.trim(),
      timestamp: new Date().toISOString(),
      timezone: req.headers['x-timezone'] as string || 'UTC',
      sessionId: sessionId || speechService.getConversationMode(req.user.id)?.sessionId,
      preferences: {
        responseStyle: 'conversational',
        includeActions: false, // No suggested actions in conversation mode
        isVoiceQuery: true, // Enable enhanced web scraping for conversational queries
        isVoiceMode: false, // Text mode, not audio
      },
    };

    // Create AI service instance with user's preferred model
    const aiService = await createAIServiceForUser(req.user.id);
    const aiResponse = await aiService.processQuery(context, req.user.id);

    if (!aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse.error || 'AI processing failed',
      });
    }

    // Clean response for conversational mode
    const cleanResponse = speechService['cleanTextForSpeech'](aiResponse.naturalResponse);

    res.json({
      success: true,
      data: {
        query: context.query,
        response: cleanResponse,
        originalResponse: aiResponse.naturalResponse,
        toolUsed: aiResponse.toolUsed,
        reasoning: aiResponse.reasoning,
        chainedTools: aiResponse.chainedTools,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`💬 Conversational text response: "${cleanResponse}"`);

  } catch (error) {
    console.error('❌ Error in conversational text processing:', error);
    res.status(500).json({
      success: false,
      error: 'Conversational text processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Text-to-speech endpoint
 * POST /api/conversation/tts
 */
router.post('/tts', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required and must be a string',
      });
    }

    console.log(`🔊 Converting text to speech: "${text.substring(0, 50)}..."`);

    const ttsResult = await speechService.textToSpeech(text);
    
    if (!ttsResult.success || !ttsResult.audioData) {
      return res.status(500).json({
        success: false,
        error: ttsResult.error || 'Failed to synthesize speech',
      });
    }

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': ttsResult.audioData.length.toString(),
    });

    res.send(ttsResult.audioData);

  } catch (error) {
    console.error('❌ Error in text-to-speech:', error);
    res.status(500).json({
      success: false,
      error: 'Text-to-speech failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get available voices
 * GET /api/conversation/voices
 */
router.get('/voices', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const voices = speechService.getAvailableVoices();
    
    res.json({
      success: true,
      voices: voices.map(voice => ({
        name: voice,
        displayName: voice.replace('en-US-', '').replace('Neural', '').replace('Multilingual', ''),
      })),
    });

  } catch (error) {
    console.error('❌ Error getting voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available voices',
    });
  }
});

/**
 * Test audio processing directly (for debugging)
 * POST /api/conversation/test-audio
 */
router.post('/test-audio', authenticateToken, upload.single('audio'), async (req: AuthenticatedRequest, res) => {
  console.log("🧪 Testing audio processing endpoint")
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required',
      });
    }

    console.log(`🧪 Testing audio for user: ${req.user?.email}`);
    console.log(`📁 Test file info:`, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer.length,
      hasBase64: !!req.body.base64String,
      base64Length: req.body.base64String ? req.body.base64String.length : 0
    });
    
    // Test enhanced audio processing
    const results = {
      enhanced: null as any,
      bufferStream: null as any,
      base64: null as any,
    };
    
    // Test enhanced approach with format conversion
    try {
      console.log('🧪 Testing enhanced audio processing...');
      const audioBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      results.enhanced = await (speechService as any).speechToTextWithConversion(audioBuffer, mimeType);
    } catch (error) {
      console.error('❌ Enhanced test failed:', error);
      results.enhanced = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test buffer stream approach
    try {
      const audioBuffer = req.file.buffer;
      const audioStream = require('stream').Readable.from(audioBuffer);
      console.log('🧪 Testing buffer stream approach...');
      results.bufferStream = await speechService.speechToText(audioStream);
    } catch (error) {
      console.error('❌ Buffer stream test failed:', error);
      results.bufferStream = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test base64 approach if available
    if (req.body.base64String) {
      try {
        console.log('🧪 Testing base64 approach...');
        results.base64 = await speechService.speechToTextFromBase64(req.body.base64String);
      } catch (error) {
        console.error('❌ Base64 test failed:', error);
        results.base64 = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    res.json({
      success: true,
      message: 'Audio processing test completed',
      results: results,
      fileInfo: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
    });

  } catch (error) {
    console.error('❌ Error in audio test:', error);
    res.status(500).json({
      success: false,
      error: 'Audio test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Set voice for TTS
 * POST /api/conversation/voice
 */
router.post('/voice', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    const { voiceName } = req.body;

    if (!voiceName || typeof voiceName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Voice name is required and must be a string',
      });
    }

    speechService.setVoice(voiceName);
    
    res.json({
      success: true,
      message: `Voice changed to ${voiceName}`,
      voiceName,
    });

  } catch (error) {
    console.error('❌ Error setting voice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set voice',
    });
  }
});

export default router;