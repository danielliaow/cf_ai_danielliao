import { Router } from 'express';
import { MCPServerManager } from '../services/mcpServerManager';
import { fetch } from 'undici';

const router = Router();
const serverManager = MCPServerManager.getInstance();

/**
 * Add an external MCP server
 * POST /api/external-mcp/servers
 */
router.post('/servers', async (req, res) => {
  try {
    const {
      name,
      host,
      port,
      protocol = 'http',
      apiKey,
      description,
      healthCheckEndpoint,
      toolsEndpoint,
      executeEndpoint,
    } = req.body;

    // Validate required fields
    if (!name || !host || !port) {
      return res.status(400).json({
        error: 'Missing required fields: name, host, and port are required',
      });
    }

    // Validate port
    if (typeof port !== 'number' || port < 1 || port > 65535) {
      return res.status(400).json({
        error: 'Port must be a number between 1 and 65535',
      });
    }

    // Validate protocol
    if (!['http', 'https'].includes(protocol)) {
      return res.status(400).json({
        error: 'Protocol must be either "http" or "https"',
      });
    }

    const serverId = await serverManager.addExternalServer({
      name,
      host,
      port,
      protocol,
      apiKey,
      description,
      healthCheckEndpoint,
      toolsEndpoint,
      executeEndpoint,
    });

    res.status(201).json({
      success: true,
      serverId,
      message: `External MCP server "${name}" added successfully`,
    });

  } catch (error) {
    console.error('Error adding external MCP server:', error);
    res.status(500).json({
      error: 'Failed to add external MCP server',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get all external MCP servers
 * GET /api/external-mcp/servers
 */
router.get('/servers', async (req, res) => {
  try {
    const servers = serverManager.getExternalServers();
    res.json({
      success: true,
      servers,
    });
  } catch (error) {
    console.error('Error getting external MCP servers:', error);
    res.status(500).json({
      error: 'Failed to get external MCP servers',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get a specific external MCP server
 * GET /api/external-mcp/servers/:serverId
 */
router.get('/servers/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = serverManager.getExternalServer(serverId);
    
    if (!server) {
      return res.status(404).json({
        error: 'External MCP server not found',
      });
    }

    res.json({
      success: true,
      server,
    });
  } catch (error) {
    console.error('Error getting external MCP server:', error);
    res.status(500).json({
      error: 'Failed to get external MCP server',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update external MCP server status (enable/disable)
 * PATCH /api/external-mcp/servers/:serverId
 */
router.patch('/servers/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Field "enabled" must be a boolean',
      });
    }

    const server = serverManager.getExternalServer(serverId);
    if (!server) {
      return res.status(404).json({
        error: 'External MCP server not found',
      });
    }

    serverManager.setExternalServerEnabled(serverId, enabled);

    res.json({
      success: true,
      message: `Server ${server.name} ${enabled ? 'enabled' : 'disabled'} successfully`,
    });

  } catch (error) {
    console.error('Error updating external MCP server:', error);
    res.status(500).json({
      error: 'Failed to update external MCP server',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Remove an external MCP server
 * DELETE /api/external-mcp/servers/:serverId
 */
router.delete('/servers/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = serverManager.getExternalServer(serverId);
    
    if (!server) {
      return res.status(404).json({
        error: 'External MCP server not found',
      });
    }

    const removed = serverManager.removeExternalServer(serverId);
    
    if (removed) {
      res.json({
        success: true,
        message: `Server ${server.name} removed successfully`,
      });
    } else {
      res.status(500).json({
        error: 'Failed to remove server',
      });
    }

  } catch (error) {
    console.error('Error removing external MCP server:', error);
    res.status(500).json({
      error: 'Failed to remove external MCP server',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get tools from a specific external server
 * GET /api/external-mcp/servers/:serverId/tools
 */
router.get('/servers/:serverId/tools', async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = serverManager.getExternalServer(serverId);
    
    if (!server) {
      return res.status(404).json({
        error: 'External MCP server not found',
      });
    }

    const connector = serverManager.getExternalConnector();
    const tools = await connector.getServerTools(serverId);
    const metadata = await connector.getServerToolMetadata(serverId);

    res.json({
      success: true,
      server: {
        id: server.id,
        name: server.name,
        status: server.status,
      },
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        metadata: metadata[tool.name],
      })),
    });

  } catch (error) {
    console.error('Error getting tools from external server:', error);
    res.status(500).json({
      error: 'Failed to get tools from external server',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get comprehensive statistics
 * GET /api/external-mcp/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await serverManager.getComprehensiveStats();
    
    res.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Error getting comprehensive stats:', error);
    res.status(500).json({
      error: 'Failed to get comprehensive stats',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Test connection to an external server
 * POST /api/external-mcp/test-connection
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { host, port, protocol = 'http', healthCheckEndpoint = '/health' } = req.body;

    if (!host || !port) {
      return res.status(400).json({
        error: 'Missing required fields: host and port are required',
      });
    }

    const url = `${protocol}://${host}:${port}${healthCheckEndpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      res.json({
        success: true,
        connection: {
          status: response.ok ? 'connected' : 'error',
          statusCode: response.status,
          statusText: response.statusText,
          url,
        },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      res.json({
        success: true,
        connection: {
          status: 'disconnected',
          error: fetchError instanceof Error ? fetchError.message : 'Connection failed',
          url,
        },
      });
    }

    } catch (error) {
      console.error('Error testing connection:', error);
    res.status(500).json({
      error: 'Failed to test connection',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;