/**
 * zen-core 服务初始化（单例容器）
 * 所有服务在进程启动时一次性初始化
 */

import Database from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';
import { BunSqliteStorage } from '@langgraph-js/standard-agent/storage/sqlite';
import { createFSManager, TaskStoreManager } from '@codegraph/config';
import { loadDefaultConfigs } from '@codegraph/agent/src/';
import { MergedStorage } from './storage/merged.js';
import { ZenSwarmMcpStorage } from './config/storage.js';
import { setMcpConfigStorage } from './config/mcpProvider.js';
import { WorkspaceStorage } from './config/workspace-storage.js';
import { CronStorage } from './cron/storage.js';
import { CronScheduler } from './cron/scheduler.js';
import { CronExecutor } from './cron/executor.js';
import { SMDatabase, StateMachineManager } from './middlewares/sm/index.js';
import { ProviderStorage } from './services/provider/index.js';
import { RemoteStoreStorage } from './services/remote-store/index.js';

export interface ZenCoreServices {
    // zen-code 原有服务
    agentPackage: AgentPackage;
    mergedStorage: MergedStorage;
    configManager: Awaited<ReturnType<typeof createFSManager>>;
    taskStore: TaskStoreManager;
    // 共享数据库
    sharedDb: Database;
    // zen-swarm 迁入服务
    mcpStorage: ZenSwarmMcpStorage;
    workspaceStorage: WorkspaceStorage;
    cronStorage: CronStorage;
    cronScheduler: CronScheduler;
    smDatabase: SMDatabase;
    stateMachineManager: StateMachineManager;
    providerStorage: ProviderStorage;
    remoteStoreStorage: RemoteStoreStorage;
}

let _services: ZenCoreServices | null = null;

export async function bootstrap(): Promise<ZenCoreServices> {
    if (_services) return _services;

    // ── 数据库目录 ────────────────────────────────────────────
    const dbDir = join(homedir(), '.zen-core');
    mkdirSync(dbDir, { recursive: true });
    const dbPath = join(dbDir, 'data.db');

    // 共享 SQLite 实例
    const sharedDb = new Database(dbPath, { create: true });
    sharedDb.run('PRAGMA foreign_keys = ON');
    sharedDb.run('PRAGMA journal_mode = WAL');
    sharedDb.run('PRAGMA busy_timeout = 5000');
    process.env.SQLITE_DATABASE_URI = dbPath;

    // ── zen-code 原有服务 ─────────────────────────────────────
    const basePkg = await loadDefaultConfigs();
    const dbStorage = new BunSqliteStorage(sharedDb);
    await dbStorage.initialize();

    const mergedStorage = new MergedStorage(basePkg.storage as MemoryStorage, dbStorage);
    const agentPackage = await AgentPackage.fromStorage(mergedStorage);

    for (const impl of basePkg.middlewares.listImplementations()) {
        agentPackage.middlewares.registerImplementation(impl);
    }

    const configManager = await createFSManager();
    const taskStore = new TaskStoreManager(process.cwd());
    await taskStore.initialize();

    // ── MCP 存储 ──────────────────────────────────────────────
    const mcpStorage = new ZenSwarmMcpStorage(sharedDb);
    await mcpStorage.initialize();
    setMcpConfigStorage(mcpStorage);

    // ── Workspace 存储 ────────────────────────────────────────
    const workspaceStorage = new WorkspaceStorage(sharedDb);
    await workspaceStorage.initialize();

    // ── State Machine ─────────────────────────────────────────
    const smDatabase = new SMDatabase({ db: sharedDb });
    const stateMachineManager = new StateMachineManager({ database: smDatabase });
    await stateMachineManager.initialize();

    // ── Provider 存储 ─────────────────────────────────────────
    const providerStorage = new ProviderStorage(sharedDb);
    await providerStorage.initialize();

    // ── Remote Store ──────────────────────────────────────────
    const remoteStoreStorage = new RemoteStoreStorage(sharedDb);
    await remoteStoreStorage.initialize();

    // ── Cron 系统 ─────────────────────────────────────────────
    const cronStorage = new CronStorage(sharedDb);
    await cronStorage.initialize();

    const PORT = Number(process.env.ZEN_CORE_PORT || 8125);
    const cronExecutor = new CronExecutor(cronStorage, {
        apiBaseUrl: process.env.LANGGRAPH_API_URL || `http://127.0.0.1:${PORT}`,
        maxExecutionTime: 10 * 60 * 1000,
    });
    const cronScheduler = new CronScheduler(cronStorage, cronExecutor);
    await cronScheduler.start();

    _services = {
        agentPackage,
        mergedStorage,
        configManager,
        taskStore,
        sharedDb,
        mcpStorage,
        workspaceStorage,
        cronStorage,
        cronScheduler,
        smDatabase,
        stateMachineManager,
        providerStorage,
        remoteStoreStorage,
    };
    return _services;
}
