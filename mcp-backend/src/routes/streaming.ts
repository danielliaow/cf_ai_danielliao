import express from 'express';
import { StreamingController } from '../controllers/streamingController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Streaming AI query endpoint (protected)
router.post('/query', authenticateToken, StreamingController.streamQuery);

// Streaming health check endpoint (public for testing)
router.get('/health', StreamingController.streamHealth);

export default router;