import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { ImplementationPlanController } from '../controllers/implementationPlanController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Generate and stream implementation plan
router.post('/generate', ImplementationPlanController.generatePlan);

// Execute implementation plan step by step
router.post('/execute/:planId', ImplementationPlanController.executePlan);

// Get implementation plan status
router.get('/:planId/status', ImplementationPlanController.getPlanStatus);

// Stream implementation plan progress
router.get('/:planId/stream', ImplementationPlanController.streamPlanProgress);

export default router;