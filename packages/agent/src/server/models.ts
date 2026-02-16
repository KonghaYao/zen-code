/**
 * Models API
 * 提供模型列表和相关信息
 */

import { Hono } from 'hono';
import { get_models_by_provider } from '../utils/get_allowed_models.js';
import type { ProviderConfig } from '@codegraph/config';

// 缓存的配置，避免重复读取
let cachedConfig: { providers: ProviderConfig[] } | null = null;
let configPromise: Promise<any> | null = null;

/**
 * 获取配置（带缓存）
 */
async function getConfig(): Promise<{ providers: ProviderConfig[] }> {
    if (cachedConfig) {
        return cachedConfig;
    }

    if (configPromise) {
        return await configPromise;
    }

    configPromise = fetch('http://127.0.0.1:8123/api/config')
        .then((res) => res.json())
        .then((data) => {
            cachedConfig = data;
            return data;
        })
        .finally(() => {
            configPromise = null;
        });

    return await configPromise;
}

/**
 * 创建模型路由
 */
export function createModelsRouter() {
    const router = new Hono();

    /**
     * GET /api/models/allowed
     * 获取允许的模型列表（所有 provider 的模型扁平化）
     */
    router.get('/allowed', async (c) => {
        try {
            await getConfig();
            const { get_allowed_models } = await import('../utils/get_allowed_models.js');
            const result = await get_allowed_models();

            return c.json({
                success: true,
                data: result,
            });
        } catch (error) {
            return c.json(
                {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                },
                500,
            );
        }
    });

    /**
     * GET /api/models/providers
     * 获取按 provider 分组的模型列表
     */
    router.get('/providers', async (c) => {
        try {
            await getConfig();
            const result = await get_models_by_provider();

            return c.json({
                success: true,
                data: result,
            });
        } catch (error) {
            return c.json(
                {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                },
                500,
            );
        }
    });

    /**
     * GET /api/models/provider/:provider
     * 获取指定 provider 的模型列表
     * 从配置中读取 provider 的 API key 和 base URL
     */
    router.get('/provider/:provider', async (c) => {
        const providerId = c.req.param('provider');

        try {
            // 获取配置
            const config = await getConfig();

            // 找到对应的 provider 配置
            const providerConfig = config.providers?.find((p: ProviderConfig) => p.id === providerId);

            if (!providerConfig) {
                return c.json(
                    {
                        success: false,
                        error: `Provider "${providerId}" not found in configuration`,
                    },
                    404,
                );
            }

            // 临时设置环境变量以便 get_allowed_models 工作
            const originalProvider = process.env.MODEL_PROVIDER;
            const originalOpenAIKey = process.env.OPENAI_API_KEY;
            const originalOpenAIBaseUrl = process.env.OPENAI_BASE_URL;
            const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
            const originalAnthropicBaseUrl = process.env.ANTHROPIC_BASE_URL;
            const originalGeminiKey = process.env.GEMINI_API_KEY;
            const originalGeminiBaseUrl = process.env.GEMINI_BASE_URL;

            try {
                // 根据配置设置环境变量
                if (providerConfig.type === 'openai') {
                    process.env.MODEL_PROVIDER = 'openai';
                    if (providerConfig.apiKey) {
                        process.env.OPENAI_API_KEY = providerConfig.apiKey;
                    }
                    if (providerConfig.baseUrl) {
                        process.env.OPENAI_BASE_URL = providerConfig.baseUrl;
                    }
                } else if (providerConfig.type === 'anthropic') {
                    process.env.MODEL_PROVIDER = 'anthropic';
                    if (providerConfig.apiKey) {
                        process.env.ANTHROPIC_API_KEY = providerConfig.apiKey;
                    }
                    if (providerConfig.baseUrl) {
                        process.env.ANTHROPIC_BASE_URL = providerConfig.baseUrl;
                    }
                } else if (providerConfig.type === 'gemini') {
                    process.env.MODEL_PROVIDER = 'gemini';
                    if (providerConfig.apiKey) {
                        process.env.GEMINI_API_KEY = providerConfig.apiKey;
                    }
                    if (providerConfig.baseUrl) {
                        process.env.GEMINI_BASE_URL = providerConfig.baseUrl;
                    }
                }

                // 获取模型列表
                const result = await get_models_by_provider(providerConfig.type);
                const models = result[providerConfig.type] || [];

                return c.json({
                    success: true,
                    data: models,
                });
            } catch (error) {
                return c.json(
                    {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    },
                    500,
                );
            } finally {
                // 恢复环境变量
                if (originalProvider) process.env.MODEL_PROVIDER = originalProvider;
                if (originalOpenAIKey) process.env.OPENAI_API_KEY = originalOpenAIKey;
                if (originalOpenAIBaseUrl) process.env.OPENAI_BASE_URL = originalOpenAIBaseUrl;
                if (originalAnthropicKey) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
                if (originalAnthropicBaseUrl) process.env.ANTHROPIC_BASE_URL = originalAnthropicBaseUrl;
                if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
                if (originalGeminiBaseUrl) process.env.GEMINI_BASE_URL = originalGeminiBaseUrl;
            }
        } catch (error) {
            return c.json(
                {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                },
                500,
            );
        }
    });

    return router;
}
