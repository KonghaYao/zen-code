/**
 * 初始化默认数据
 * 仅在首次运行或数据库重建后执行
 *
 * 注意：不再自动创建默认 Provider 和 Model 数据。
 * 用户首次启动时会通过 Setup 向导（/setup）完成配置。
 */

import { providerStorage, agentPackage } from '../config/loader.js';

/**
 * 初始化默认数据（已废弃自动创建逻辑）
 *
 * 原先会自动插入 OpenAI / Anthropic / DeepSeek 三个空 Provider 及 4 个 Model，
 * 导致前端 DockLayout 检测到 providers.length > 0 而跳过 Setup 向导。
 * 现在保持数据库空状态，由 Setup 向导引导用户完成初始配置。
 */
export async function initDefaultData(): Promise<void> {
    // 不再自动写入任何数据，保持空状态以触发前端 Setup 向导
    return;
}

/**
 * 验证 Provider 和 Model 状态
 */
export async function validateProviderModelStatus(): Promise<{
    hasActiveProvider: boolean;
    providersWithoutApiKey: string[];
    modelsWithoutProvider: string[];
}> {
    const providers = await providerStorage.getAll();
    const models = await agentPackage.storage.getAllModels();

    const hasActiveProvider = providers.some((p) => p.isActive);
    const providersWithoutApiKey = providers.filter((p) => !p.apiKey || p.apiKey === '••••••••').map((p) => p.name);
    const modelsWithoutProvider = models.filter((m) => !m.provider_id).map((m) => m.name || m.model_name);

    return {
        hasActiveProvider,
        providersWithoutApiKey,
        modelsWithoutProvider,
    };
}

/**
 * 启动时检查并打印警告
 */
export async function checkProviderModelStatus(): Promise<void> {
    const status = await validateProviderModelStatus();

    if (!status.hasActiveProvider) {
        console.warn(
            '[Provider] ⚠️  No active provider found. ' + 'Please configure at least one provider in the Web UI.',
        );
    }

    if (status.providersWithoutApiKey.length > 0) {
        console.warn(
            '[Provider] ⚠️  The following providers have no API Key configured: ' +
                status.providersWithoutApiKey.join(', ') +
                '. Please add your API Keys in the Web UI.',
        );
    }

    if (status.modelsWithoutProvider.length > 0) {
        console.warn(
            '[Model] ⚠️  The following models have no provider assigned: ' +
                status.modelsWithoutProvider.join(', ') +
                '. Please assign a provider in the Model settings.',
        );
    }
}
