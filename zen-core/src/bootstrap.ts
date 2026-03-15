/**
 * zen-core 服务初始化（单例容器）
 *
 * 迁移后仅保留 FS 存储：
 *   - AgentPackage（MemoryStorage，内置默认值）
 *   - ConfigManager（~/.zen-code/settings.json）
 *   - TaskStoreManager（.tasks/）
 *
 * SQLite 存储（agents/prompts/middlewares/mcp/workspaces/cron/providers/store）
 * 已全部迁移到 zen-swarm bootstrap.ts。
 */

import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';
import { createFSManager, TaskStoreManager } from '@codegraph/config';
import { loadDefaultConfigs } from '@codegraph/agent/src/';

export interface ZenCoreServices {
    agentPackage: AgentPackage;
    configManager: Awaited<ReturnType<typeof createFSManager>>;
    taskStore: TaskStoreManager;
}

let _services: ZenCoreServices | null = null;

export async function bootstrap(): Promise<ZenCoreServices> {
    if (_services) return _services;

    // ── AgentPackage（MemoryStorage，内置默认值）─────────────────
    const basePkg = await loadDefaultConfigs();
    const agentPackage = await AgentPackage.fromStorage(basePkg.storage as MemoryStorage);

    for (const impl of basePkg.middlewares.listImplementations()) {
        agentPackage.middlewares.registerImplementation(impl);
    }

    // ── FS 存储 ───────────────────────────────────────────────────
    const configManager = await createFSManager();
    const taskStore = new TaskStoreManager(process.cwd());
    await taskStore.initialize();

    _services = {
        agentPackage,
        configManager,
        taskStore,
    };
    return _services;
}
