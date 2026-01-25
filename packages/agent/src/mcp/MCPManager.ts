import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { FileSystemConfigStore } from '@codegraph/config';

const getConfig = async () => {
    const store = new FileSystemConfigStore()
    await store.initialize()
    return store.getConfig()
}

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

/**
 * MCP Manager 单例服务
 * 基于 MultiServerMCPClient 实现，提供缓存和刷新机制
 */
export class MCPManager {
    private static instance: MCPManager;
    private client: MultiServerMCPClient | null = null;
    private config: MCPConfig | null = null;
    private lastRefresh: number | null = null;
    private serverStatuses: Map<string, MCPServerStatus> = new Map();

    private constructor() { }

    static getInstance(): MCPManager {
        if (!this.instance) {
            this.instance = new MCPManager();
        }
        return this.instance;
    }

    /**
     * 初始化 MultiServerMCPClient
     */
    async initialize(): Promise<void> {
        const globalConfig = await getConfig();
        if (!globalConfig.mcp_config || Object.keys(globalConfig.mcp_config).length === 0) {
            this.client = null;
            this.serverStatuses.clear();
            return;
        }

        this.client = new MultiServerMCPClient({
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
    }
    cacheTools: any[] = []
    /**
     * 获取所有 MCP 工具（带缓存）
     */
    async getAllTools() {
        if (!this.client) {
            await this.initialize();
        }

        // 从 client 获取工具列表
        const tools = await this.client!.getTools();
        this.cacheTools = tools
        return tools;
    }



    /**
     * 刷新所有服务器
     * 重新创建 MultiServerMCPClient 实例
     */
    async refreshAll(): Promise<void> {
        if (!this.config) {
            return;
        }

        // 关闭旧连接
        if (this.client) {
            try {
                await this.client.close();
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
    async cleanup(): Promise<void> {
        if (this.client) {
            try {
                await this.client.close();
            } catch (error) {
                console.warn('Failed to close MCP client during cleanup:', error);
            }
            this.client = null;
        }
        this.lastRefresh = null;
        this.serverStatuses.clear();
    }

    /**
     * 获取 MCP 状态信息
     */
    async getStatus(): Promise<MCPStatus> {
        const tools = this.cacheTools;
        const globalConfig = await getConfig();
        const servers = globalConfig.mcp_config ? Object.keys(globalConfig.mcp_config) : [];

        return {
            isInitialized: this.client !== null,
            toolCount: tools.length,
            lastRefresh: this.lastRefresh,
            servers,
        };
    }

}
