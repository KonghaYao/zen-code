/**
 * Initialize Chat Model
 * 从 agents/code/initChatModel.ts 迁移
 */

import { ChatOpenAI } from '@langgraph-js/pro';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export interface InitChatModelOptions {
    modelProvider?: string;
    streamUsage?: boolean;
    enableThinking?: boolean;
    metadata?: Record<string, unknown>;
    baseURL?: string;
    apiKey?: string;
    temperature?: number;
}

export const initChatModel = async (modelId: string, options: InitChatModelOptions = {}) => {
    const { modelProvider, enableThinking = true } = options;
    const outputVersion = 'v1';
    let model;
    if (modelProvider === 'anthropic') {
        model = new ChatAnthropic({
            model: modelId,
            streamUsage: true,
            streaming: true,
            maxRetries: 1,
            maxTokens: 64000,
            thinking: enableThinking
                ? {
                      budget_tokens: 1024,
                      type: 'enabled',
                  }
                : undefined,
            apiKey: options.apiKey,
            anthropicApiUrl: options.baseURL,
            metadata: options.metadata,
            outputVersion,
        });
    } else if (modelProvider === 'gemini' || modelProvider === 'google') {
        // Google Gemini support
        model = new ChatGoogleGenerativeAI({
            model: modelId,
            apiKey: options.apiKey,
            baseUrl: options.baseURL || process.env.GOOGLE_BASE_URL,
            maxRetries: 1,
            streaming: true,
            streamUsage: true,
            thinkingConfig: {},
            metadata: options.metadata,
            outputVersion,
        });
    } else {
        model = new ChatOpenAI({
            model: modelId,
            configuration: {
                baseURL: options.baseURL,
                apiKey: options.apiKey,
            },
            streamUsage: true,
            maxRetries: 1,
            modelKwargs: enableThinking
                ? {
                      thinking: {
                          type: 'enabled',
                      },
                  }
                : undefined,
            metadata: options.metadata,
            outputVersion,
        });
    }

    return model;
};
