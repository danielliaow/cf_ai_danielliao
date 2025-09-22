import { MCPTool, MCPToolResponse } from '../types';
import { AIToolMetadata } from '../types/aiTools';
// Use undici for typed, standards-compliant fetch in Node (Node 18+ ships undici under the hood)
// npm i undici
import { fetch } from 'undici';

export interface ExternalMCPServer {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  apiKey?: string;
  description?: string;
  enabled: boolean;
  healthCheckEndpoint?: string;
  toolsEndpoint?: string;
  executeEndpoint?: string;
  lastHealthCheck?: Date;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  error?: string;
}

export interface ExternalToolResponse {
  tools: Array<{
    name: string;
    description: string;
    parameters?: any;
    category?: string;
    examples?: Array<{
      query: string;
      expectedParams: any;
      description: string;
    }>;
  }>;
}

/**
 * Fetch with timeout using AbortController (works with undici & WHATWG fetch)
 */
async function fetchJSON<T>(
  url: string,
  opts: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const { method = 'GET', headers, body, timeoutMs = 10_000, signal } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: signal ?? controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Some endpoints may return empty body (e.g., health checks)
    const text = await response.text();
    return (text ? (JSON.parse(text) as T) : (undefined as unknown as T));
  } finally {
    clearTimeout(timeout);
  }
}

export class ExternalMCPConnector {
  private static instance: ExternalMCPConnector;
  private servers: Map<string, ExternalMCPServer> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHealthChecking();
  }

  static getInstance(): ExternalMCPConnector {
    if (!ExternalMCPConnector.instance) {
      ExternalMCPConnector.instance = new ExternalMCPConnector();
    }
    return ExternalMCPConnector.instance;
  }

  /** Add an external MCP server */
  async addServer(config: {
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
    const id = this.generateServerId(config.name, config.host, config.port);

    const server: ExternalMCPServer = {
      id,
      name: config.name,
      host: config.host,
      port: config.port,
      protocol: config.protocol ?? 'http',
      apiKey: config.apiKey,
      description: config.description,
      enabled: true,
      healthCheckEndpoint: config.healthCheckEndpoint ?? '/health',
      toolsEndpoint: config.toolsEndpoint ?? '/tools',
      executeEndpoint: config.executeEndpoint ?? '/execute',
      status: 'unknown',
    };

    this.servers.set(id, server);  

    await this.performHealthCheck(id);

    console.log(`🔌 Added external MCP server: ${server.name} at ${server.protocol}://${server.host}:${server.port}`);

    return id;
  }

  /** Remove an external MCP server */
  removeServer(serverId: string): boolean {
    const removed = this.servers.delete(serverId);
    if (removed) {
      console.log(`🔌 Removed external MCP server: ${serverId}`);
    }
    return removed;
  }

  /** Get all external servers */
  getServers(): ExternalMCPServer[] {
    return Array.from(this.servers.values());
  }

  /** Get server by ID */
  getServer(serverId: string): ExternalMCPServer | undefined {
    return this.servers.get(serverId);
  }

  /** Enable/disable a server */
  setServerEnabled(serverId: string, enabled: boolean): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.enabled = enabled;
      console.log(`${enabled ? '✅ Enabled' : '⏸️ Disabled'} external server: ${server.name}`);
    }
  }

  /** Get tools from an external server */
  async getServerTools(serverId: string): Promise<MCPTool[]> {
    const server = this.servers.get(serverId);
    if (!server || !server.enabled) return [];

    if (server.status !== 'connected') {
      console.warn(`⚠️ Server ${server?.name} is not connected, skipping tool retrieval`);
      return [];
    }

    try {
      const url = `${server.protocol}://${server.host}:${server.port}${server.toolsEndpoint}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (server.apiKey) headers['Authorization'] = `Bearer ${server.apiKey}`;

      const data = await fetchJSON<ExternalToolResponse>(url, { method: 'GET', headers, timeoutMs: 10_000 });

      const tools: MCPTool[] = (data?.tools ?? []).map((externalTool) => ({
        name: `${server.name}_${externalTool.name}`,
        description: externalTool.description,
        execute: async (userId: string, params?: any): Promise<MCPToolResponse> =>
          this.executeExternalTool(serverId, externalTool.name, userId, params),
      }));

      console.log(`📋 Retrieved ${tools.length} tools from external server: ${server.name}`);
      return tools;
    } catch (error) {
      console.error(`❌ Error retrieving tools from server ${server?.name}:`, error);
      if (server) {
        server.status = 'error';
        server.error = error instanceof Error ? error.message : 'Unknown error';
      }
      return [];
    }
  }

  /** Get tool metadata from an external server */
  async getServerToolMetadata(serverId: string): Promise<Record<string, AIToolMetadata>> {
    const server = this.servers.get(serverId);
    if (!server || !server.enabled || server.status !== 'connected') return {};

    try {
      const url = `${server.protocol}://${server.host}:${server.port}${server.toolsEndpoint}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (server.apiKey) headers['Authorization'] = `Bearer ${server.apiKey}`;

      const data = await fetchJSON<ExternalToolResponse>(url, { method: 'GET', headers, timeoutMs: 10_000 });

      const metadata: Record<string, AIToolMetadata> = {};
      for (const externalTool of data?.tools ?? []) {
        const toolName = `${server.name}_${externalTool.name}`;
        metadata[toolName] = {
          name: toolName,
          description: externalTool.description,
          category: externalTool.category || 'external',
          parameters: this.convertParameters(externalTool.parameters),
          examples: externalTool.examples || [],
          timeContext: 'any',
          dataAccess: 'read',
        } as AIToolMetadata;
      }
      return metadata;
    } catch (error) {
      console.error(`❌ Error retrieving metadata from server ${server?.name}:`, error);
      return {};
    }
  }

  /** Execute a tool on an external server */
  private async executeExternalTool(
    serverId: string,
    toolName: string,
    userId: string,
    params?: any
  ): Promise<MCPToolResponse> {
    const server = this.servers.get(serverId);
    if (!server) {
      return { success: false, error: `External server ${serverId} not found`, timestamp: new Date().toISOString() };
    }

    if (!server.enabled || server.status !== 'connected') {
      return { success: false, error: `External server ${server.name} is not available`, timestamp: new Date().toISOString() };
    }

    try {
      const url = `${server.protocol}://${server.host}:${server.port}${server.executeEndpoint}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (server.apiKey) headers['Authorization'] = `Bearer ${server.apiKey}`;

      const result = await fetchJSON<any>(url, {
        method: 'POST',
        headers,
        body: { tool: toolName, userId, params: params ?? {} },
        timeoutMs: 30_000,
      });

      return { success: true, data: result, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error(`❌ Error executing tool ${toolName} on server ${server.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** Perform health check on a server */
  private async performHealthCheck(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    try {
      const url = `${server.protocol}://${server.host}:${server.port}${server.healthCheckEndpoint}`;
      const headers: Record<string, string> = {};
      if (server.apiKey) headers['Authorization'] = `Bearer ${server.apiKey}`;

      // Health endpoints often return empty body; just ensure 2xx
      await fetchJSON<unknown>(url, { method: 'GET', headers, timeoutMs: 5_000 });

      server.status = 'connected';
      server.error = undefined;
      server.lastHealthCheck = new Date();
    } catch (error) {
      server.status = 'disconnected';
      server.error = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Health check failed for ${server.name}: ${server.error}`);
    }
  }

  /** Start periodic health checking */
  private startHealthChecking(): void {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

    this.healthCheckInterval = setInterval(() => {
      const serverIds = Array.from(this.servers.keys());
      // Fire-and-forget; we intentionally do not await inside setInterval
      Promise.allSettled(serverIds.map((id) => this.performHealthCheck(id))).catch(() => {
        // swallow
      });
    }, 30_000);

    console.log('🔍 Started health check monitoring for external MCP servers');
  }

  /** Stop health checking */
  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🔍 Stopped health check monitoring');
    }
  }

  /** Generate a unique server ID */
  private generateServerId(name: string, host: string, port: number): string {
    return `${name.toLowerCase().replace(/\s+/g, '_')}_${host}_${port}`;
  }

  /** Convert external parameters to internal format */
  private convertParameters(externalParams: any): any[] {
    if (!externalParams || typeof externalParams !== 'object') return [];
    if (Array.isArray(externalParams)) return externalParams;

    return Object.entries(externalParams).map(([name, config]: [string, any]) => ({
      name,
      type: config?.type ?? 'string',
      description: config?.description ?? '',
      required: Boolean(config?.required),
      examples: config?.examples ?? [],
    }));
  }

  /** Stats about external servers */
  getStats(): {
    totalServers: number;
    connectedServers: number;
    disconnectedServers: number;
    errorServers: number;
  } {
    const servers = Array.from(this.servers.values());
    return {
      totalServers: servers.length,
      connectedServers: servers.filter((s) => s.status === 'connected').length,
      disconnectedServers: servers.filter((s) => s.status === 'disconnected').length,
      errorServers: servers.filter((s) => s.status === 'error').length,
    };
  }

  /** Get all tools from all connected external servers */
  async getAllExternalTools(): Promise<MCPTool[]> {
    const results = await Promise.all(
      Array.from(this.servers.keys()).map((id) => this.getServerTools(id))
    );
    return results.flat();
  }

  /** Get all tool metadata from all connected external servers */
  async getAllExternalToolMetadata(): Promise<Record<string, AIToolMetadata>> {
    const entries = await Promise.all(
      Array.from(this.servers.keys()).map(async (id) => this.getServerToolMetadata(id))
    );
    return Object.assign({}, ...entries);
  }
}
