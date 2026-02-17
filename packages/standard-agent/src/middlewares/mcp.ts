/**
 * MCP Middleware
 *
 * Base middleware for managing MCP (Model Context Protocol) server connections and tool execution.
 *
 * This is a framework-agnostic implementation that provides:
 * - Automatic MCP server initialization via a config provider
 * - load_mcp_tools tool: Query available MCP tools
 * - execute_mcp_tool tool: Execute MCP tools (supports batch execution)
 * - Internal integration with MultiServerMCPClient and tool caching
 *
 * ## Usage
 *
 * ```typescript
 * import { createMCPMiddleware } from '@langgraph-js/standard-agent';
 *
 * // Create with config provider
 * const mcpMiddleware = createMCPMiddleware({
 *   configProvider: async () => {
 *     // Return MCP server configuration
 *     return {
 *       servers: {
 *         filesystem: {
 *           command: 'npx',
 *           args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/directory']
 *         }
 *       }
 *     };
 *   },
 *   cache: {
 *     ttl: 300,  // 5 minutes
 *   }
 * });
 *
 * const agent = createAgent({
 *   model,
 *   systemPrompt,
 *   tools,
 *   middleware: [mcpMiddleware]
 * });
 * ```
 */

import { AgentMiddleware } from 'langchain';
import { tool, StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AIMessage } from '@langchain/core/messages';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';

// ============================================
// Type Definitions
// ============================================

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
}

/**
 * MCP Configuration
 */
export interface MCPConfig {
    servers: Record<string, MCPServerConfig>;
}

/**
 * MCP Middleware Options
 */
export interface MCPMiddlewareOptions {
    /**
     * Async function that provides MCP configuration
     */
    configProvider: () => Promise<MCPConfig | null | undefined>;

    /**
     * Cache configuration
     */
    cache?: {
        ttl?: number; // Tool cache TTL in seconds (default: 300)
        reconnectDelay?: number; // Reconnect delay in milliseconds (default: 5000)
    };
}

/**
 * MCP Status Information
 */
export interface MCPStatus {
    isInitialized: boolean;
    toolCount: number;
    lastRefresh: number | null;
    servers: string[];
}

/**
 * MCP Server Status
 */
export interface MCPServerStatus {
    name: string;
    isConnected: boolean;
    toolCount: number;
    error?: string;
}

// ============================================
// Schemas
// ============================================

/**
 * Schema for load_mcp_tools tool
 */
export const LoadMcpToolsSchema = z.object({});

/**
 * Schema for execute_mcp_tool tool
 */
export const ExecuteMcpToolSchema = z.object({
    commands: z
        .array(
            z.object({
                name: z.string().describe('MCP tool name'),
                args: z.record(z.string(), z.any()).describe('Tool parameters in JSON object format'),
            }),
        )
        .describe('List of MCP tools to execute'),
});

export type ExecuteMcpTool = z.infer<typeof ExecuteMcpToolSchema>;

// ============================================
// MCP Middleware
// ============================================

/**
 * MCP Middleware Implementation
 *
 * Manages MCP server connections and provides tools for:
 * - Querying available MCP tools
 * - Executing MCP tools (including batch execution)
 */
export class MCPMiddleware implements AgentMiddleware {
    name = 'MCPMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    // MCP Client
    private mcpClient: MultiServerMCPClient | null = null;
    private cacheTools: any[] = [];
    private configProvider: () => Promise<MCPConfig | null | undefined>;

    private lastRefresh: number | null = null;
    private serverStatuses: Map<string, MCPServerStatus> = new Map();
    private initializing: boolean = false;
    private initializationPromise: Promise<void> | null = null;

    // Tools
    private loadMcpToolsTool: StructuredTool;
    private executeMcpToolTool: StructuredTool;

    /**
     * Create MCP middleware
     *
     * @param options - Middleware configuration options
     */
    constructor(options: MCPMiddlewareOptions) {
        this.configProvider = options.configProvider;

        // Auto-initialize
        this.initialize().catch((error) => {
            console.error('Failed to initialize MCPMiddleware:', error);
        });

        // Create tools
        this.createTools();
    }

    /**
     * Get configuration from provider
     */
    private async getConfig(): Promise<MCPConfig | null | undefined> {
        return await this.configProvider();
    }

    /**
     * Initialize MultiServerMCPClient
     */
    private async initialize(): Promise<void> {
        if (this.initializing) {
            return this.initializationPromise as Promise<void>;
        }

        this.initializing = true;
        this.initializationPromise = (async () => {
            try {
                const mcpConfig = await this.getConfig();

                if (!mcpConfig || !mcpConfig.servers || Object.keys(mcpConfig.servers).length === 0) {
                    this.mcpClient = null;
                    this.serverStatuses.clear();
                    this.cacheTools = [];
                    return;
                }

                this.mcpClient = new MultiServerMCPClient({
                    throwOnLoadError: true,
                    prefixToolNameWithServerName: false,
                    additionalToolNamePrefix: '',
                    useStandardContentBlocks: true,
                    onConnectionError: 'ignore',
                    /** @ts-ignore */
                    mcpServers: mcpConfig.servers,
                });

                // Pre-load tool list
                await this.refreshAll();
            } finally {
                this.initializing = false;
            }
        })();

        return this.initializationPromise;
    }

    /**
     * Get all MCP tools (with caching)
     */
    private async getAllTools(): Promise<any[]> {
        // Wait for initialization
        if (this.initializing && this.initializationPromise) {
            await this.initializationPromise;
        }

        if (!this.mcpClient) {
            await this.initialize();
        }

        if (!this.mcpClient) {
            return [];
        }

        // Get tool list from client
        const tools = await this.mcpClient.getTools();
        this.cacheTools = tools;
        return tools;
    }

    /**
     * Refresh all servers
     */
    private async refreshAll(): Promise<void> {
        // Close old connection
        if (this.mcpClient) {
            try {
                await this.mcpClient.close();
            } catch (error) {
                console.warn('Failed to close MCP client:', error);
            }
        }

        // Re-initialize
        await this.initialize();
        this.lastRefresh = Date.now();
    }

    /**
     * Cleanup connections
     */
    async cleanup(): Promise<void> {
        if (this.mcpClient) {
            try {
                await this.mcpClient.close();
            } catch (error) {
                console.warn('Failed to close MCP client during cleanup:', error);
            }
            this.mcpClient = null;
        }
        this.lastRefresh = null;
        this.serverStatuses.clear();
        this.cacheTools = [];
    }

    /**
     * Get MCP status information
     */
    private async getStatus(): Promise<MCPStatus> {
        const tools = this.cacheTools;
        const mcpConfig = await this.getConfig();
        const servers = mcpConfig?.servers ? Object.keys(mcpConfig.servers) : [];

        return {
            isInitialized: this.mcpClient !== null,
            toolCount: tools.length,
            lastRefresh: this.lastRefresh,
            servers,
        };
    }

    /**
     * Execute a single MCP tool
     */
    private async executeTool(toolName: string, args: any): Promise<any> {
        // Wait for initialization
        if (this.initializing && this.initializationPromise) {
            await this.initializationPromise;
        }

        if (!this.mcpClient) {
            await this.initialize();
        }

        if (!this.mcpClient) {
            throw new Error('MCP client not initialized. No MCP configuration found.');
        }

        const tools = await this.getAllTools();
        const targetTool = tools.find((t) => t.name === toolName);

        if (!targetTool) {
            const availableTools = tools.map((t) => t.name).join(', ');
            throw new Error(`Tool not found: ${toolName}. Available: ${availableTools || 'none'}`);
        }

        try {
            return await targetTool.invoke(args);
        } catch (error: any) {
            throw new Error(`Failed to execute MCP tool '${toolName}': ${error.message || String(error)}`);
        }
    }

    /**
     * Create middleware tools
     */
    private createTools(): void {
        // load_mcp_tools tool
        this.loadMcpToolsTool = tool(
            async () => {
                const status = await this.getStatus();
                const tools = await this.getAllTools();

                return JSON.stringify(
                    {
                        tools: tools.map((t) => ({
                            name: t.name,
                            description: t.description,
                            schema: t.schema,
                        })),
                        status,
                    },
                    null,
                    2,
                );
            },
            {
                name: 'load_mcp_tools',
                description: `Load and query all available MCP tools.

Returns:
- tools: List of MCP tools, each containing name, description, schema
- status: MCP connection status, including toolCount, servers, etc.

Use cases:
- Query which MCP tools are available
- Get tool parameter formats
- Check MCP connection status

Important: The tool list is dynamic. Call this command when needed to get the latest information.`,
                schema: LoadMcpToolsSchema,
            },
        );

        // execute_mcp_tool tool
        this.executeMcpToolTool = tool(
            async ({ commands }) => {
                const results: Array<{ tool: string; result: any; error?: string }> = [];

                for (const cmd of commands) {
                    const { name, args } = cmd;

                    try {
                        const result = await this.executeTool(name, args);
                        results.push({ tool: name, result });
                    } catch (error: any) {
                        results.push({
                            tool: name,
                            result: null,
                            error: error.message || String(error),
                        });
                    }
                }

                return JSON.stringify(
                    {
                        results,
                    },
                    null,
                    2,
                );
            },
            {
                name: 'execute_mcp_tool',
                description: `Execute one or more MCP tools.

Usage format:
- commands: Array of MCP tools, each containing name and args

Examples:
- Single tool: {commands: [{name: "filesystem.read_file", args: {path: "/path/to/file"}}]}
- Multiple tools: {commands: [{name: "tool1", args: {...}}, {name: "tool2", args: {...}}]}

Important:
- All tools execute independently; failure of one does not affect others
- Results are returned in command order
- Suitable for batch execution of MCP-related operations`,
                schema: ExecuteMcpToolSchema,
            },
        );
    }

    /**
     * Get middleware tools
     */
    get tools(): StructuredTool[] {
        return [this.loadMcpToolsTool, this.executeMcpToolTool];
    }

    /**
     * Wrap model call to inject system prompt
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        const systemPromptAddon = `
## MCP Tools

Using MCP tools requires two steps:

1. **load_mcp_tools** - Query available MCP tools
   - Returns list of all MCP tools and their parameter formats
   - Includes MCP connection status

2. **execute_mcp_tool** - Execute MCP tools
   - Supports single or multiple batch execution
   - Format: {commands: [{name, args}, ...]}

**Important**:
- Standard tools (read_file, glob_files) are called directly, no MCP commands needed
- MCP tools require first calling load_mcp_tools to query
- Then call execute_mcp_tool to execute
`;

        let newSystemPrompt: string;
        if (request.systemPrompt) {
            newSystemPrompt = request.systemPrompt + systemPromptAddon;
        } else {
            newSystemPrompt = systemPromptAddon;
        }

        const modifiedRequest = {
            ...request,
            systemPrompt: newSystemPrompt,
        };

        return await handler(modifiedRequest);
    }
}

/**
 * Factory function to create MCP middleware
 *
 * @param options - Middleware configuration options
 * @returns MCP middleware instance
 */
export function createMCPMiddleware(options: MCPMiddlewareOptions): MCPMiddleware {
    return new MCPMiddleware(options);
}
