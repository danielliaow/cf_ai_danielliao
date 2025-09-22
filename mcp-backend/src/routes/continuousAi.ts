import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { ContinuousAIController } from '../controllers/continuousAiController';

const router = express.Router();

// Apply auth middleware
router.use(authenticateToken);

// Continuous processing endpoint
router.post('/continuous-query', ContinuousAIController.continuousQuery);

// Get processing status
router.get('/processing/:streamId/status', ContinuousAIController.getProcessingStatus);

// Stop processing stream
router.delete('/processing/:streamId', ContinuousAIController.stopProcessing);

export default router;