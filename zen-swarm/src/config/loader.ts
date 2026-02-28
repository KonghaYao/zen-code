/**
 * Zen Swarm 配置加载器
 * 使用 AgentPackage + MCP storage 管理配置
 */

import Database from 'bun:sqlite';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { BunSqliteStorage } from '@langgraph-js/standard-agent/src/storage/sqlite.js';
import { ZenSwarmMcpStorage } from './storage.js';
import { setMcpConfigStorage } from './mcpProvider.js';
import { createMiddlewareRegistry } from '../middlewares/registry.js';
import { createToolRegistry } from '../tools/registry.js';
import { CronStorage } from '../cron/storage.js';
import { CronScheduler } from '../cron/scheduler.js';
import { CronExecutor } from '../cron/executor.js';
import { SMDatabase, StateMachineManager } from '../middlewares/sm/index.js';

// 共享数据库实例
const sharedDb = new Database('./data/index.db', { create: true });
sharedDb.run('PRAGMA foreign_keys = ON');
sharedDb.run('PRAGMA journal_mode = WAL');

// Agent 存储实例
const agentStorage = new BunSqliteStorage('./data/index.db');
await agentStorage.initialize();

// MCP 存储实例
const mcpStorage = new ZenSwarmMcpStorage('./data/index.db');
await mcpStorage.initialize();

// 设置 MCP config provider
setMcpConfigStorage(mcpStorage);

// State Machine 存储实例（使用共享数据库）
const smDatabase = new SMDatabase({ db: sharedDb });
const stateMachineManager = new StateMachineManager({ database: smDatabase });
await stateMachineManager.initialize();

// ========================================
// Cron 系统
// ========================================

// Cron 存储实例
export const cronStorage = new CronStorage('./data/index.db');
await cronStorage.initialize();

// Cron 执行器
export const cronExecutor = new CronExecutor(cronStorage);

// Cron 调度器
export const cronScheduler = new CronScheduler(cronStorage, cronExecutor);

// 启动调度器
await cronScheduler.start();

// ========================================
// Agent Package
// ========================================

// 导出单例
export const agentPackage = new AgentPackage(agentStorage);

// 注册中间件实现（传入 stateMachineManager 和 cron 依赖）
await createMiddlewareRegistry(agentPackage, {
    stateMachineManager,
    cronStorage,
    cronScheduler,
});

// 注册工具实现
await createToolRegistry(agentPackage);

// 导出存储实例供外部使用
export { agentStorage, mcpStorage, sharedDb, smDatabase, stateMachineManager };
