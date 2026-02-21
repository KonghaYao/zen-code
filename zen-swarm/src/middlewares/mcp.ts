/**
 * MCP Middleware with Config Integration
 *
 * Zen Swarm 特定的 MCP 中间件，集成 MCP 配置存储。
 * 继承 standard-agent 的基础 MCPMiddleware，支持项目配置加载。
 *
 * ## Usage
 *
 * ```typescript
 * import { MCPWithConfigMiddleware } from './middlewares/mcp.js';
 *
 * // 自动加载默认配置存储
 * const mcpMiddleware = new MCPWithConfigMiddleware();
 *
 * const agent = createAgent({
 *   model,
 *   systemPrompt,
 *   tools,
 *   middleware: [mcpMiddleware]
 * });
 * ```
 */

import { MCPMiddleware, MCPConfig } from '@langgraph-js/standard-agent';
import { getMcpConfigFromStorage } from '../config/mcpProvider.js';

/**
 * MCP Middleware with Config Integration
 *
 * 扩展基础 MCPMiddleware 从 zen-swarm 数据库加载 MCP 配置。
 */
export class MCPWithConfigMiddleware extends MCPMiddleware {
    constructor(cache?: { ttl?: number; reconnectDelay?: number }) {
        super({
            configProvider: getMcpConfigFromStorage,
            cache,
        });
    }

    /**
     * Execute method for AgentPackage compatibility
     * Returns self to support initialization without parameters
     */
    async execute(): Promise<this> {
        return this;
    }
}
