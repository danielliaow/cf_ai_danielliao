import express from 'express';
import { SessionController } from '../controllers/sessionController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Session management routes
router.post('/', SessionController.createSession);
router.get('/', SessionController.getUserSessions);
router.get('/:sessionId', SessionController.getSession);
router.put('/:sessionId', SessionController.updateSession);
router.delete('/:sessionId', SessionController.deleteSession);
router.post('/:sessionId/archive', SessionController.archiveSession);

// Message management routes
router.get('/:sessionId/messages', SessionController.getSessionMessages);
router.post('/:sessionId/messages', SessionController.addMessage);

// Context management routes  
router.get('/:sessionId/context', SessionController.getConversationContext);

export default router;