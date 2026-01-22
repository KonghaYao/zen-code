import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic';
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

export const get_allowed_models = async () => {
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
