/**
 * zen-core 服务初始化（单例容器）
 * 所有服务在进程启动时一次性初始化
 */

import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';
import { BunSqliteStorage } from '@langgraph-js/standard-agent/src/storage/sqlite.js';
import { createFSManager } from '@codegraph/config';
import { loadDefaultConfigs } from '@codegraph/agent/src/subagents/loader.js';
import { MergedStorage } from './storage/merged.js';

export interface ZenCoreServices {
    agentPackage: AgentPackage;
    mergedStorage: MergedStorage;
    configManager: Awaited<ReturnType<typeof createFSManager>>;
}

let _services: ZenCoreServices | null = null;

export async function bootstrap(): Promise<ZenCoreServices> {
    if (_services) return _services;

    // 1. 内置配置 + MiddlewareRegistry implementations
    const basePkg = await loadDefaultConfigs();

    // 2. SQLite 持久化存储
    const dbStorage = BunSqliteStorage.default();
    await dbStorage.initialize();

    // 3. 合并视图（DB 优先读取，写操作只写 DB）
    const mergedStorage = new MergedStorage(basePkg.storage as MemoryStorage, dbStorage);

    // 4. 最终 AgentPackage（基于合并存储）
    const agentPackage = await AgentPackage.fromStorage(mergedStorage);

    // 5. 迁移运行时 implementations（fromStorage 只注册 schema，不注册 implementation）
    for (const impl of basePkg.middlewares.listImplementations()) {
        agentPackage.middlewares.registerImplementation(impl);
    }

    // 6. ConfigManager（读取 ~/.zen-code/settings.json）
    const configManager = await createFSManager();

    _services = { agentPackage, mergedStorage, configManager };
    return _services;
}
