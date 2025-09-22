import { MCPTool } from '../types';
import { AIToolMetadata } from '../types/aiTools';
import { ExternalMCPConnector } from './externalMcpConnector';

export interface MCPServer {
  name: string;
  description: string;
  category: string;
  tools: MCPTool[];
  metadata: Record<string, AIToolMetadata>;
  enabled: boolean;
}

export interface ServerConfig {
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  toolFactory: () => Promise<{
    tools: MCPTool[];
    metadata: Record<string, AIToolMetadata>;
  }>;
}

export class MCPServerManager {
  private servers: Map<string, MCPServer> = new Map();
  private static instance: MCPServerManager;
  private externalConnector: ExternalMCPConnector;

  private constructor() {
    this.externalConnector = ExternalMCPConnector.getInstance();
  }

  static getInstance(): MCPServerManager {
    if (!MCPServerManager.instance) {
      MCPServerManager.instance = new MCPServerManager();
    }
    return MCPServerManager.instance;
  }

  /**
   * Register a new MCP server with its tools
   */
  async registerServer(config: ServerConfig): Promise<void> {
    try {
      console.log(`🔌 Registering MCP server: ${config.name}`);
      
      if (!config.enabled) {
        console.log(`⏸️ Server ${config.name} is disabled, skipping registration`);
        return;
      }

      // Load tools from the server
      const { tools, metadata } = await config.toolFactory();
      
      const server: MCPServer = {
        name: config.name,
        description: config.description,
        category: config.category,
        tools,
        metadata,
        enabled: true,
      };

      this.servers.set(config.name, server);
      
      console.log(`✅ Registered server ${config.name} with ${tools.length} tools:`, 
        tools.map(t => t.name).join(', '));

    } catch (error) {
      console.error(`❌ Failed to register server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Get all tools from all enabled servers (internal + external)
   */
  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];
    
    // Get internal server tools
    for (const server of this.servers.values()) {
      if (server.enabled) {
        allTools.push(...server.tools);
      }
    }
    
    // Get external server tools
    const externalTools = await this.externalConnector.getAllExternalTools();
    allTools.push(...externalTools);
    
    return allTools;
  }

  /**
   * Get all tool metadata from all enabled servers (internal + external)
   */
  async getAllToolMetadata(): Promise<AIToolMetadata[]> {
    const allMetadata: AIToolMetadata[] = [];
    
    // Get internal server metadata
    for (const server of this.servers.values()) {
      if (server.enabled) {
        allMetadata.push(...Object.values(server.metadata));
      }
    }
    
    // Get external server metadata
    const externalMetadata = await this.externalConnector.getAllExternalToolMetadata();
    allMetadata.push(...Object.values(externalMetadata));
    
    return allMetadata;
  }

  /**
   * Get a specific tool by name (internal + external)
   */
  async getTool(toolName: string): Promise<MCPTool | undefined> {
    // Check internal servers first
    for (const server of this.servers.values()) {
      if (server.enabled) {
        const tool = server.tools.find(t => t.name === toolName);
        if (tool) {
          return tool;
        }
      }
    }
    
    // Check external servers
    const externalTools = await this.externalConnector.getAllExternalTools();
    return externalTools.find(t => t.name === toolName);
  }

  /**
   * Get tool metadata by name
   */
  getToolMetadata(toolName: string): AIToolMetadata | undefined {
    for (const server of this.servers.values()) {
      if (server.enabled) {
        if (server.metadata[toolName]) {
          return server.metadata[toolName];
        }
      }
    }
    return undefined;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): AIToolMetadata[] {
    const tools: AIToolMetadata[] = [];
    
    for (const server of this.servers.values()) {
      if (server.enabled) {
        for (const metadata of Object.values(server.metadata)) {
          if (metadata.category === category) {
            tools.push(metadata);
          }
        }
      }
    }
    
    return tools;
  }

  /**
   * Get all registered servers
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server by name
   */
  getServer(serverName: string): MCPServer | undefined {
    return this.servers.get(serverName);
  }

  /**
   * Enable/disable a server
   */
  setServerEnabled(serverName: string, enabled: boolean): void {
    const server = this.servers.get(serverName);
    if (server) {
      server.enabled = enabled;
      console.log(`${enabled ? '✅ Enabled' : '⏸️ Disabled'} server: ${serverName}`);
    }
  }

  /**
   * Search tools across all servers
   */
  searchTools(query: string): AIToolMetadata[] {
    const lowerQuery = query.toLowerCase();
    const results: AIToolMetadata[] = [];
    
    for (const server of this.servers.values()) {
      if (server.enabled) {
        for (const metadata of Object.values(server.metadata)) {
          if (
            metadata.name.toLowerCase().includes(lowerQuery) ||
            metadata.description.toLowerCase().includes(lowerQuery) ||
            metadata.examples.some(example => 
              example.query.toLowerCase().includes(lowerQuery)
            )
          ) {
            results.push(metadata);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Get internal server statistics (synchronous)
   */
   getStats(): {
    totalServers: number;
    enabledServers: number;
    totalTools: number;
    toolsByCategory: Record<string, number>;
  } {
    const servers = Array.from(this.servers.values());
    const enabledServers = servers.filter(s => s.enabled);
    
    // Get only internal tools (synchronous)
    const allTools: any[] = [];
    for (const server of enabledServers) {
      allTools.push(...Object.values(server.metadata));
    }
    
    const toolsByCategory: Record<string, number> = {};
    for (const tool of allTools) {
      toolsByCategory[tool.category] = (toolsByCategory[tool.category] || 0) + 1;
    }
    
    return {
      totalServers: servers.length,
      enabledServers: enabledServers.length,
      totalTools: allTools.length,
      toolsByCategory,
    };
  }

  /**
   * Execute a tool by name (internal + external)
   */
  async executeTool(toolName: string, userId: string, params?: any): Promise<any> {
    const tool = await this.getTool(toolName);
    
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }
    
    try {
      console.log(`🔧 Executing tool: ${toolName} for user: ${userId}`);
      return await tool.execute(userId, params);
    } catch (error) {
      console.error(`❌ Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  // External Server Management Methods

  /**
   * Add an external MCP server
   */
  async addExternalServer(config: {
    name: string;
    host: string;
    port: number;
    protocol?: 'http' | 'https';
    apiKey?: string;
    description?: string;
    healthCheckEndpoint?: string;
    toolsEndpoint?: string;
    executeEndpoint?: string;
  }): Promise<string> {
    return await this.externalConnector.addServer(config);
  }

  /**
   * Remove an external MCP server
   */
  removeExternalServer(serverId: string): boolean {
    return this.externalConnector.removeServer(serverId);
  }

  /**
   * Get all external servers
   */
  getExternalServers() {
    return this.externalConnector.getServers();
  }

  /**
   * Get external server by ID
   */
  getExternalServer(serverId: string) {
    return this.externalConnector.getServer(serverId);
  }

  /**
   * Enable/disable an external server
   */
  setExternalServerEnabled(serverId: string, enabled: boolean): void {
    this.externalConnector.setServerEnabled(serverId, enabled);
  }

  /**
   * Get comprehensive statistics including external servers
   */
  async getComprehensiveStats(): Promise<{
    internal: {
      totalServers: number;
      enabledServers: number;
      totalTools: number;
      toolsByCategory: Record<string, number>;
    };
    external: {
      totalServers: number;
      connectedServers: number;
      disconnectedServers: number;
      errorServers: number;
    };
    combined: {
      totalTools: number;
      totalServers: number;
    };
  }> {
    const internalStats = this.getStats();
    const externalStats = this.externalConnector.getStats();
    const allTools = await this.getAllTools();

    return {
      internal: internalStats,
      external: externalStats,
      combined: {
        totalTools: allTools.length,
        totalServers: internalStats.totalServers + externalStats.totalServers,
      },
    };
  }

  /**
   * Get the external connector instance for advanced operations
   */
  getExternalConnector(): ExternalMCPConnector {
    return this.externalConnector;
  }
}