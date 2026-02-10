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
        // 其他字段：created_at, type
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
    return new OpenAI().models.list().then((res) =>
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
    return Promise.all([
        getAnthropicModels().catch((e) => {
            console.log(e);
            return [];
        }),
        getOpenAIModels().catch((e) => {
            console.log(e);
            return [];
        }),
    ]).then((res) => res.flat());
};

/**
 * 获取按 provider 分组的模型列表
 */
export const get_models_by_provider = async (provider?: string): Promise<ModelsResponse> => {
    const allModels = await get_allowed_models();

    const grouped: ModelsResponse = {};

    allModels.forEach((model) => {
        if (!grouped[model.provider]) {
            grouped[model.provider] = [];
        }
        grouped[model.provider].push(model);
    });

    // 如果指定了 provider，只返回该 provider 的模型
    if (provider) {
        return {
            [provider]: grouped[provider] || [],
        };
    }

    return grouped;
};

/**
 * 获取指定 provider 的模型列表
 */
export const get_provider_models = async (provider: 'openai' | 'anthropic'): Promise<ModelConfig[]> => {
    const allModels = await get_allowed_models();
    return allModels.filter((m) => m.provider === provider);
};
