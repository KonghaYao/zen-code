/**
 * 初始化默认数据
 * 仅在首次运行或数据库重建后执行
 */

import { providerStorage, agentPackage } from '../config/loader.js';
import { DEFAULT_BASE_URLS } from '../services/provider/storage.js';

/**
 * 初始化默认 Provider 和 Model 数据
 */
export async function initDefaultData(): Promise<void> {
    // 检查是否已有 Provider
    const providers = await providerStorage.getAll();
    if (providers.length > 0) {
        console.log('[Init] Providers already exist, skipping initialization');
        return;
    }

    console.log('[Init] Creating default providers and models...');

    try {
        // 1. 创建默认 OpenAI Provider
        const openaiProvider = await providerStorage.create({
            name: 'OpenAI',
            type: 'openai',
            apiKey: '', // 用户需要在 UI 中配置
            baseUrl: DEFAULT_BASE_URLS.openai,
            isActive: true,
        });

        // 2. 创建默认 Anthropic Provider
        const anthropicProvider = await providerStorage.create({
            name: 'Anthropic',
            type: 'anthropic',
            apiKey: '', // 用户需要在 UI 中配置
            baseUrl: DEFAULT_BASE_URLS.anthropic,
            isActive: false,
        });

        // 3. 创建默认 DeepSeek Provider
        const deepseekProvider = await providerStorage.create({
            name: 'DeepSeek',
            type: 'deepseek',
            apiKey: '',
            baseUrl: DEFAULT_BASE_URLS.deepseek,
            isActive: false,
        });

        // 4. 创建默认 Models
        await agentPackage.storage.insertModel({
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider_id: openaiProvider.id,
            model_name: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 4096,
            stream_usage: true,
            enable_thinking: false,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });

        await agentPackage.storage.insertModel({
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider_id: openaiProvider.id,
            model_name: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 4096,
            stream_usage: true,
            enable_thinking: false,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });

        await agentPackage.storage.insertModel({
            id: 'claude-3-5-sonnet',
            name: 'Claude 3.5 Sonnet',
            provider_id: anthropicProvider.id,
            model_name: 'claude-3-5-sonnet-20241022',
            temperature: 0.7,
            max_tokens: 8192,
            stream_usage: true,
            enable_thinking: true,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });

        await agentPackage.storage.insertModel({
            id: 'deepseek-chat',
            name: 'DeepSeek Chat',
            provider_id: deepseekProvider.id,
            model_name: 'deepseek-chat',
            temperature: 0.7,
            max_tokens: 4096,
            stream_usage: true,
            enable_thinking: false,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });

        console.log('[Init] Default data created successfully');
        console.log('[Init] Providers created:');
        console.log(`  - OpenAI (active): ${openaiProvider.id}`);
        console.log(`  - Anthropic: ${anthropicProvider.id}`);
        console.log(`  - DeepSeek: ${deepseekProvider.id}`);
        console.log('[Init] Models created: gpt-4o, gpt-4o-mini, claude-3-5-sonnet, deepseek-chat');
        console.log('[Init] ⚠️  Please configure your API Keys in the Web UI');
    } catch (error) {
        console.error('[Init] Failed to create default data:', error);
        throw error;
    }
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
