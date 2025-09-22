import express from 'express';
import { MCPController } from '../controllers/mcpController';
import { authenticateToken, requireGoogleAuth } from '../middleware/auth';

const router = express.Router();

// All MCP routes require authentication
router.use(authenticateToken);

// List available tools
router.get('/tools', MCPController.listTools);

// Get tool details
router.get('/tools/:toolName', MCPController.getToolDetails);

// Execute tools (requires Google authentication)
router.post(
  '/tools/:toolName/execute',
  requireGoogleAuth,
  MCPController.executeTool
);

export default router;