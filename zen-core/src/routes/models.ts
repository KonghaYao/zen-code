/**
 * models 路由 - 对应 useModels
 * 代理 Provider API 调用，避免 CORS / apiKey 泄露
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

const REQUEST_TIMEOUT = 30000;

async function fetchModels(provider: { type: string; apiKey: string; baseUrl: string }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        if (
            provider.type === 'openai' ||
            provider.type === 'deepseek' ||
            provider.type === 'moonshot' ||
            provider.type === 'zhipu' ||
            provider.type === 'custom'
        ) {
            const response = await fetch(`${provider.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${provider.apiKey}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`API error (${response.status}): ${response.statusText}`);
            }

            const data = await response.json();
            return (data.data || []).map((model: { id: string }) => ({
                id: model.id,
                name: model.id,
                provider: provider.type,
            }));
        } else if (provider.type === 'anthropic') {
            const response = await fetch(`${provider.baseUrl}/v1/models`, {
                method: 'GET',
                headers: {
                    'x-api-key': provider.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Anthropic API error (${response.status}): ${response.statusText}`);
            }

            const data = await response.json();
            return (data.data || []).map((model: { id: string; display_name?: string }) => ({
                id: model.id,
                name: model.display_name || model.id,
                provider: 'anthropic',
            }));
        } else if (provider.type === 'gemini') {
            const response = await fetch(`${provider.baseUrl}/v1beta/models`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${provider.apiKey}`,
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Gemini API error (${response.status}): Invalid API key`);
            }

            const data = await response.json();
            return (data.models || []).map((model: { name: string; displayName?: string }) => ({
                id: model.name,
                name: model.displayName || model.name,
                provider: 'gemini',
            }));
        }

        return [];
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error(`API request timeout (${REQUEST_TIMEOUT / 1000}s)`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export const modelsRouter = router({
    list: procedure
        .input(
            z.object({
                providerId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const config = await ctx.configManager.getConfig();
            const provider = (config.providers || []).find((p: any) => p.id === input.providerId);

            if (!provider || !provider.apiKey || !provider.baseUrl) {
                return [];
            }

            return await fetchModels(provider);
        }),
});
