/**
 * useModels Hook
 *
 * Manages model list fetching from provider APIs.
 * Replaces manual useState + useEffect pattern in ModelPanel.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 * - Retry strategy for API errors
 * - Request timeout handling
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { ProviderConfig as ConfigProviderConfig } from '@codegraph/config';

export interface ModelConfig {
    id: string;
    name: string;
    provider?: 'openai' | 'anthropic' | 'gemini';
}

// Use ConfigProviderConfig from @codegraph/config
export type ProviderConfig = ConfigProviderConfig;

interface UseModelsOptions {
    provider: ProviderConfig | null;
    enabled?: boolean;
}

const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

/**
 * Create AbortController for timeout
 */
function createTimeoutController(): AbortController {
    const controller = new AbortController();

    setTimeout(() => {
        controller.abort();
    }, REQUEST_TIMEOUT);

    return controller;
}

/**
 * Fetch OpenAI models from API
 */
async function getOpenAIModels(apiKey: string, baseUrl: string): Promise<ModelConfig[]> {
    const controller = createTimeoutController();

    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${response.statusText}`);
        }

        const data = await response.json();
        return data.data
            .map((model: { id: string }) => ({
                id: model.id,
                name: model.id,
                provider: 'openai' as const,
            }))
            .sort((a: ModelConfig, b: ModelConfig) => a.id.localeCompare(b.id));
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('OpenAI API request timeout (30s)');
        }
        throw error;
    }
}

/**
 * Fetch Anthropic models from API
 */
async function getAnthropicModels(apiKey: string, baseUrl: string): Promise<ModelConfig[]> {
    const controller = createTimeoutController();

    try {
        const response = await fetch(`${baseUrl}/v1/models`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Anthropic API error (${response.status}): ${response.statusText}`);
        }

        const data = await response.json();
        return data.data.map((model: { id: string; display_name?: string }) => ({
            id: model.id,
            name: model.display_name || model.id,
            provider: 'anthropic' as const,
        }));
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Anthropic API request timeout (30s)');
        }
        throw error;
    }
}

/**
 * Fetch Gemini models
 * Returns a curated list of available Gemini models
 */
async function getGeminiModels(apiKey: string, _baseUrl: string): Promise<ModelConfig[]> {
    // Optionally verify API key by making a simple request
    try {
        const response = await fetch(_baseUrl + `/v1beta/models`, {
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Gemini API error (${response.status}): Invalid API key`);
        }

        return response.json().then((res) => {
            return res.models.map((model) => {
                return { id: model.name, name: model.displayName || model.id, provider: 'gemini' as const };
            });
        });
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Gemini API request timeout (30s)');
        }
        throw error;
    }
}

/**
 * Fetch models from provider API
 *
 * @param options - Hook options with provider config
 * @returns Query result with models data
 *
 * Example:
 * ```tsx
 * const { data: models, isLoading, error } = useModels({
 *   provider: selectedProviderConfig,
 *   enabled: true
 * });
 * ```
 */
export function useModels({ provider, enabled = true }: UseModelsOptions) {
    return useQuery({
        queryKey: queryKeys.models.list(provider?.id || 'unknown'),
        queryFn: async () => {
            if (!provider || !provider.apiKey || !provider.baseUrl) {
                return [];
            }

            try {
                if (provider.type === 'openai') {
                    return await getOpenAIModels(provider.apiKey, provider.baseUrl);
                } else if (provider.type === 'anthropic') {
                    return await getAnthropicModels(provider.apiKey, provider.baseUrl);
                } else if (provider.type === 'gemini') {
                    return await getGeminiModels(provider.apiKey, provider.baseUrl);
                }

                return [];
            } catch (error: any) {
                throw error;
            }
        },
        enabled: enabled && !!provider && !!provider.apiKey && !!provider.baseUrl,
        staleTime: 10 * 60 * 1000, // 10 minutes - models don't change often
        retry: (failureCount, error) => {
            // Network errors: retry up to 2 times
            // Other errors: don't retry
            if (error?.message?.includes('timeout')) {
                return failureCount < 2; // Retry timeouts twice
            }
            if (error?.name === 'TypeError' || error?.message?.includes('fetch')) {
                return failureCount < 2; // Retry network errors twice
            }
            return false; // Don't retry other errors
        },
    });
}
