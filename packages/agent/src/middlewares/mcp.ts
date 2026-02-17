/**
 * MCP Middleware
 *
 * 统一管理 MCP 服务器连接和工具执行。
 *
 * 特性：
 * - 自动初始化 MCP 服务器
 * - 提供 load_mcp_tools 工具：查询 MCP 工具列表
 * - 提供 execute_mcp_tool 工具：执行 MCP 工具（支持批量）
 * - 内部集成 MultiServerMCPClient 和工具缓存
 */

import { AgentMiddleware } from 'langchain';
import { tool, StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AIMessage } from '@langchain/core/messages';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { FileSystemConfigStore } from '@codegraph/config';

// Config Types
export interface MCPConfig {
    cache?: {
        ttl?: number; // 工具缓存时间（秒），默认 300
        reconnectDelay?: number; // 重连延迟（毫秒），默认 5000
    };
}

export interface MCPStatus {
    isInitialized: boolean;
    toolCount: number;
    lastRefresh: number | null;
    servers: string[];
}

export interface MCPServerStatus {
    name: string;
    isConnected: boolean;
    toolCount: number;
    error?: string;
}

// Schemas
export const LoadMcpToolsSchema = z.object({});

export const ExecuteMcpToolSchema = z.object({
    commands: z
        .array(
            z.object({
                name: z.string().describe('MCP 工具名称'),
                args: z.record(z.string(), z.any()).describe('工具参数，JSON 对象格式'),
            }),
        )
        .describe('要执行的 MCP 工具列表'),
});

export type ExecuteMcpTool = z.infer<typeof ExecuteMcpToolSchema>;

/**
 * MCP Middleware
 *
 * 统一管理 MCP 服务器连接和工具执行。
 */
export class MCPMiddleware implements AgentMiddleware {
    name = 'MCPMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    // MCP Client
    private mcpClient: MultiServerMCPClient | null = null;
    private cacheTools: any[] = [];
    private config: MCPConfig | null = null;
    private lastRefresh: number | null = null;
    private serverStatuses: Map<string, MCPServerStatus> = new Map();
    private initializing: boolean = false;
    private initializationPromise: Promise<void> | null = null;

    // 工具
    private loadMcpToolsTool: StructuredTool;
    private executeMcpToolTool: StructuredTool;

    constructor() {
        // 自动初始化
        this.initialize().catch((error) => {
            console.error('Failed to initialize MCPMiddleware:', error);
        });

        // 创建工具
        this.createTools();
    }

    /**
     * 获取配置
     */
    private async getConfig() {
        const store = new FileSystemConfigStore();
        await store.initialize();
        return store.getConfig();
    }

    /**
     * 初始化 MultiServerMCPClient
     */
    private async initialize(): Promise<void> {
        if (this.initializing) {
            return this.initializationPromise;
        }

        this.initializing = true;
        this.initializationPromise = (async () => {
            try {
                const globalConfig = await this.getConfig();
                if (!globalConfig.mcp_config || Object.keys(globalConfig.mcp_config).length === 0) {
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
                    mcpServers: globalConfig.mcp_config,
                });

                // 预加载工具列表
                await this.refreshAll();
            } finally {
                this.initializing = false;
            }
        })();

        return this.initializationPromise;
    }

    /**
     * 获取所有 MCP 工具（带缓存）
     */
    private async getAllTools(): Promise<any[]> {
        // 等待初始化完成
        if (this.initializing && this.initializationPromise) {
            await this.initializationPromise;
        }

        if (!this.mcpClient) {
            await this.initialize();
        }

        if (!this.mcpClient) {
            return [];
        }

        // 从 client 获取工具列表
        const tools = await this.mcpClient.getTools();
        this.cacheTools = tools;
        return tools;
    }

    /**
     * 刷新所有服务器
     */
    private async refreshAll(): Promise<void> {
        if (!this.config) {
            return;
        }

        // 关闭旧连接
        if (this.mcpClient) {
            try {
                await this.mcpClient.close();
            } catch (error) {
                console.warn('Failed to close MCP client:', error);
            }
        }

        // 重新初始化
        await this.initialize();
        this.lastRefresh = Date.now();
    }

    /**
     * 清理连接
     */
    private async cleanup(): Promise<void> {
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
     * 获取 MCP 状态信息
     */
    private async getStatus(): Promise<MCPStatus> {
        const tools = this.cacheTools;
        const globalConfig = await this.getConfig();
        const servers = globalConfig.mcp_config ? Object.keys(globalConfig.mcp_config) : [];

        return {
            isInitialized: this.mcpClient !== null,
            toolCount: tools.length,
            lastRefresh: this.lastRefresh,
            servers,
        };
    }

    /**
     * 执行单个 MCP 工具
     */
    private async executeTool(toolName: string, args: any): Promise<any> {
        // 等待初始化完成
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
     * 创建工具
     */
    private createTools(): void {
        // load_mcp_tools 工具
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
                description: `加载并查询所有可用的 MCP 工具列表。

返回：
- tools: MCP 工具列表，每个工具包含 name, description, schema
- status: MCP 连接状态，包含 toolCount, servers 等

使用场景：
- 查询当前有哪些 MCP 工具可用
- 获取工具的参数格式
- 检查 MCP 连接状态

重要：工具列表是动态的，建议在需要时调用此命令获取最新信息。`,
                schema: LoadMcpToolsSchema,
            },
        );

        // execute_mcp_tool 工具
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
                description: `执行一个或多个 MCP 工具。

使用格式：
- commands: MCP 工具数组，每个工具包含 name 和 args

示例：
- 执行单个工具: {commands: [{name: "filesystem.read_file", args: {path: "/path/to/file"}}]}
- 执行多个工具: {commands: [{name: "tool1", args: {...}}, {name: "tool2", args: {...}}]}

重要：
- 所有工具独立执行，失败不影响其他工具
- 返回结果按命令顺序排列
- 适合批量执行 MCP 相关操作`,
                schema: ExecuteMcpToolSchema,
            },
        );
    }

    /**
     * 获取 middleware 提供的工具
     */
    get tools(): StructuredTool[] {
        return [this.loadMcpToolsTool, this.executeMcpToolTool];
    }

    /**
     * 包装模型调用，注入系统提示词
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        const systemPromptAddon = `
## MCP Tools

使用 MCP 工具需要两步：

1. **load_mcp_tools** - 查询可用的 MCP 工具
   - 返回所有 MCP 工具的列表和参数格式
   - 包含 MCP 连接状态

2. **execute_mcp_tool** - 执行 MCP 工具
   - 支持单个或多个工具批量执行
   - 格式：{commands: [{name, args}, ...]}

**重要**：
- 标准工具（read_file, glob_files）直接调用，不需要通过 MCP 命令
- MCP 工具需要先调用 load_mcp_tools 查询
- 再调用 execute_mcp_tool 执行
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
