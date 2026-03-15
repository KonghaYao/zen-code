/**
 * zen-swarm 本地服务初始化（单例容器）
 *
 * 持有所有 SQLite 存储，不再依赖 zen-core 的共享数据库。
 * 数据库路径：~/.zen-swarm/data.db
 */

import Database from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';
import { BunSqliteStorage } from '@langgraph-js/standard-agent/storage/sqlite';
import { MergedStorage } from '@langgraph-js/standard-agent/storage/merged';
import { loadDefaultConfigs } from '@codegraph/agent/src/';
import { ZenSwarmMcpStorage } from './config/storage.js';
import { WorkspaceStorage } from './config/workspace-storage.js';
import { CronStorage } from './cron/storage.js';
import { CronScheduler } from './cron/scheduler.js';
import { CronExecutor } from './cron/executor.js';
import { ProviderStorage } from './services/provider/storage.js';
import { RemoteStoreStorage } from './services/remote-store/index.js';

export interface ZenSwarmLocalServices {
    db: Database;
    agentPackage: AgentPackage;
    mergedStorage: MergedStorage;
    mcpStorage: ZenSwarmMcpStorage;
    workspaceStorage: WorkspaceStorage;
    cronStorage: CronStorage;
    cronScheduler: CronScheduler;
    providerStorage: ProviderStorage;
    remoteStoreStorage: RemoteStoreStorage;
}

let _services: ZenSwarmLocalServices | null = null;

export async function bootstrapLocal(): Promise<ZenSwarmLocalServices> {
    if (_services) return _services;

    // ── 数据库目录 ────────────────────────────────────────────
    const dbDir = join(homedir(), '.zen-swarm');
    mkdirSync(dbDir, { recursive: true });

    const db = new Database(join(dbDir, 'data.db'), { create: true });
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA busy_timeout = 5000');

    // ── AgentPackage + MergedStorage ─────────────────────────
    const basePkg = await loadDefaultConfigs();
    const dbStorage = new BunSqliteStorage(db);
    await dbStorage.initialize();

    const mergedStorage = new MergedStorage(basePkg.storage as MemoryStorage, dbStorage);
    const agentPackage = await AgentPackage.fromStorage(mergedStorage);

    for (const impl of basePkg.middlewares.listImplementations()) {
        agentPackage.middlewares.registerImplementation(impl);
    }

    // ── MCP 存储 ──────────────────────────────────────────────
    const mcpStorage = new ZenSwarmMcpStorage(db);
    await mcpStorage.initialize();

    // ── Workspace 存储 ────────────────────────────────────────
    const workspaceStorage = new WorkspaceStorage(db);
    await workspaceStorage.initialize();

    // ── Provider 存储 ─────────────────────────────────────────
    const providerStorage = new ProviderStorage(db);
    await providerStorage.initialize();

    // ── Remote Store ──────────────────────────────────────────
    const remoteStoreStorage = new RemoteStoreStorage(db);
    await remoteStoreStorage.initialize();

    // ── Cron 系统 ─────────────────────────────────────────────
    const cronStorage = new CronStorage(db);
    await cronStorage.initialize();

    const ZEN_CORE_PORT = Number(process.env.ZEN_CORE_PORT || 8125);
    const cronExecutor = new CronExecutor(cronStorage, {
        apiBaseUrl: process.env.LANGGRAPH_API_URL || `http://127.0.0.1:${ZEN_CORE_PORT}`,
        maxExecutionTime: 10 * 60 * 1000,
    });
    const cronScheduler = new CronScheduler(cronStorage, cronExecutor);
    await cronScheduler.start();

    _services = {
        db,
        agentPackage,
        mergedStorage,
        mcpStorage,
        workspaceStorage,
        cronStorage,
        cronScheduler,
        providerStorage,
        remoteStoreStorage,
    };
    return _services;
}
