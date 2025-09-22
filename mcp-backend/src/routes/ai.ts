import express from 'express';
import { AIController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Natural language query processing (main AI endpoint)
router.post('/query', authenticateToken, AIController.processNaturalLanguageQuery);

// Tool discovery endpoints
router.get('/tools', AIController.getAvailableTools);
router.get('/tools/category/:category', AIController.getToolsByCategory);

export default router;