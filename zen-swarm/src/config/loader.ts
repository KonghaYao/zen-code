/**
 * Zen Swarm 配置加载器
 * 使用 AgentPackage + BunSqliteStorage 管理配置
 */

import { AgentPackage } from '@langgraph-js/standard-agent';
import { BunSqliteStorage } from '@langgraph-js/standard-agent/src/storage/sqlite.js';

const storage = new BunSqliteStorage('./data/index.db');

// 初始化数据库表结构
await storage.initialize();

// 导出单例
export const agentPackage = new AgentPackage(storage);
