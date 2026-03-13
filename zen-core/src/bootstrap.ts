/**
 * zen-core 服务初始化（单例容器）
 * 所有服务在进程启动时一次性初始化
 */

import { AgentPackage } from '@langgraph-js/standard-agent';
import { createFSManager } from '@codegraph/config';
import { loadDefaultConfigs } from '@codegraph/agent/src/subagents/loader.js';

export interface ZenCoreServices {
    agentPackage: AgentPackage;
    configManager: Awaited<ReturnType<typeof createFSManager>>;
}

let _services: ZenCoreServices | null = null;

export async function bootstrap(): Promise<ZenCoreServices> {
    if (_services) return _services;

    // 1. AgentPackage（使用 MemoryStorage，与 zen-code 当前行为一致）
    const agentPackage = await loadDefaultConfigs();

    // 2. ConfigManager（读取 ~/.zen-code/settings.json）
    const configManager = await createFSManager();

    _services = { agentPackage, configManager };
    return _services;
}
