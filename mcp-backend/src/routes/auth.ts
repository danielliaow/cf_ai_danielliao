import express from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/google', AuthController.getGoogleAuthUrl);

// Protected routes (require Supabase authentication)
router.get('/google/callback', authenticateToken, AuthController.handleGoogleCallback);
router.get('/status', authenticateToken, AuthController.getAuthStatus);
router.post('/google/revoke', authenticateToken, AuthController.revokeGoogleAccess);
router.post('/google/sync-tokens', authenticateToken, AuthController.syncGoogleTokens);

export default router;