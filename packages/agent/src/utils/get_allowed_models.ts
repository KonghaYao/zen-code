import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'gemini';
}

export interface ModelsResponse {
    [provider: string]: ModelConfig[];
}

const getAnthropicModels = async () => {
    if (!process.env.ANTHROPIC_API_KEY) return [];
    let models: ModelConfig[] = [];
    try {
        for await (const modelInfo of new Anthropic().beta.models.list()) {
            models.push({
                id: modelInfo.id,
                name: modelInfo.display_name,
                provider: 'anthropic',
            });
        }
    } catch (error) {
        console.error('Failed to fetch Anthropic models:', error);
    }
    return models;
};

const getOpenAIModels = async () => {
    if (!process.env.OPENAI_API_KEY) return [];
    try {
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
    } catch (error) {
        console.error('Failed to fetch OpenAI models:', error);
        return [];
    }
};

const getGeminiModels = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return [];

    // Return curated list of known Gemini models
    // Google's API doesn't have a reliable list models endpoint
    const knownModels: ModelConfig[] = [
        { id: 'gemini-2.5-flash-preview-06-17', name: 'Gemini 2.5 Flash Preview (06-17)', provider: 'gemini' },
        { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro Preview (06-05)', provider: 'gemini' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
        { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', provider: 'gemini' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
        { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'gemini' },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', provider: 'gemini' },
        { id: 'gemini-exp-1206', name: 'Gemini Experimental 1206', provider: 'gemini' },
        { id: 'gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 Pro Experimental (03-25)', provider: 'gemini' },
        { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview (05-20)', provider: 'gemini' },
    ];

    try {
        // Optionally verify API connectivity by creating a simple request
        const genAI = new GoogleGenerativeAI(apiKey);
        // Try to get a model instance to verify the API key works
        await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        return knownModels;
    } catch (error) {
        console.error('Failed to verify Gemini API key:', error);
        return [];
    }
};

export const get_allowed_models = async (): Promise<ModelConfig[]> => {
    const results = await Promise.all([
        getAnthropicModels().catch(() => []),
        getOpenAIModels().catch(() => []),
        getGeminiModels().catch(() => []),
    ]);
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

export const get_provider_models = async (provider: 'openai' | 'anthropic' | 'gemini'): Promise<ModelConfig[]> => {
    const allModels = await get_allowed_models();
    return allModels.filter((m) => m.provider === provider);
};
