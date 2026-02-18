/**
 * Zen Swarm 配置加载器
 * 使用 AgentPackage + MCP storage 管理配置
 */

import { AgentPackage } from '@langgraph-js/standard-agent';
import { BunSqliteStorage } from '@langgraph-js/standard-agent/src/storage/sqlite.js';
import { ZenSwarmMcpStorage } from './storage.js';
import { setMcpConfigStorage } from './mcpProvider.js';
import { createMiddlewareRegistry } from '../middlewares/registry.js';
import { createToolRegistry } from '../tools/registry.js';

// Agent 存储实例
const agentStorage = new BunSqliteStorage('./data/index.db');
await agentStorage.initialize();

// MCP 存储实例
const mcpStorage = new ZenSwarmMcpStorage('./data/index.db');
await mcpStorage.initialize();

// 设置 MCP config provider
setMcpConfigStorage(mcpStorage);

// 导出单例
export const agentPackage = new AgentPackage(agentStorage);

// 注册中间件实现
await createMiddlewareRegistry(agentPackage);

// 注册工具实现
await createToolRegistry(agentPackage);

// 导出存储实例供外部使用
export { agentStorage, mcpStorage };
