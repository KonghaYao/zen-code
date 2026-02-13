import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic';
}

export interface ModelsResponse {
    [provider: string]: ModelConfig[];
}

const getAnthropicModels = async () => {
    if (!process.env.ANTHROPIC_API_KEY) return [];
    let models: ModelConfig[] = [];
    for await (const modelInfo of new Anthropic().beta.models.list()) {
        models.push({
            id: modelInfo.id,
            name: modelInfo.display_name,
            provider: 'anthropic',
        });
    }
    return models;
};

const getOpenAIModels = async () => {
    if (!process.env.OPENAI_API_KEY) return [];
    return await new OpenAI().models.list().then((res) =>
        res.data
            .map((i) => {
                return {
                    id: i.id,
                    name: i.id,
                    provider: 'openai',
                } as ModelConfig;
            })
            .sort((a, b) => a.id.localeCompare(b.id)),
    );
};

export const get_allowed_models = async (): Promise<ModelConfig[]> => {
    const results = await Promise.all([getAnthropicModels().catch(() => []), getOpenAIModels().catch(() => [])]);
    return results.flat();
};

export const get_models_by_provider = async (provider?: string): Promise<ModelsResponse> => {
    const allModels = await get_allowed_models();

    const grouped: ModelsResponse = {};

    allModels.forEach((model) => {
        if (!grouped[model.provider]) {
            grouped[model.provider] = [];
        }
        grouped[model.provider].push(model);
    });

    if (provider) {
        return {
            [provider]: grouped[provider] || [],
        };
    }

    return grouped;
};

export const get_provider_models = async (provider: 'openai' | 'anthropic'): Promise<ModelConfig[]> => {
    const allModels = await get_allowed_models();
    return allModels.filter((m) => m.provider === provider);
};
