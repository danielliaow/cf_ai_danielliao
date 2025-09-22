import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { MCPToolRegistry } from '../services/mcpToolRegistry';

export class MCPController {
  static async listTools(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tools = MCPToolRegistry.listTools();
      
      res.json({
        success: true,
        data: {
          tools,
          count: tools.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error listing MCP tools:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list MCP tools',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async executeTool(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { toolName } = req.params;
      const params = req.body.params || {};

      if (!toolName) {
        res.status(400).json({
          success: false,
          error: 'Tool name is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`User ${req.user.id} executing tool: ${toolName}`);
      
      const result = await MCPToolRegistry.executeTool(
        toolName,
        req.user.id,
        params
      );

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Error executing MCP tool:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while executing tool',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async getToolDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { toolName } = req.params;

      if (!toolName) {
        res.status(400).json({
          success: false,
          error: 'Tool name is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const tool = MCPToolRegistry.getTool(toolName);

      if (!tool) {
        res.status(404).json({
          success: false,
          error: `Tool '${toolName}' not found`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: {
          name: tool.name,
          description: tool.description,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting tool details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tool details',
        timestamp: new Date().toISOString(),
      });
    }
  }
}