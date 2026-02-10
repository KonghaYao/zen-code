/**
 * Initialize Chat Model
 * 从 agents/code/initChatModel.ts 迁移
 */

import { ChatOpenAI } from '@langgraph-js/pro';
import { ChatAnthropic } from '@langchain/anthropic';

export interface InitChatModelOptions {
    modelProvider?: string;
    streamUsage?: boolean;
    enableThinking?: boolean;
    metadata?: Record<string, unknown>;
}

export const initChatModel = async (mainModel: string, options: InitChatModelOptions = {}) => {
    const { modelProvider, enableThinking = true } = options;
    let model;

    if (modelProvider === 'anthropic') {
        model = new ChatAnthropic({
            model: mainModel,
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
            metadata: options.metadata,
        });
    } else {
        model = new ChatOpenAI({
            model: mainModel,
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
        });
    }

    return model;
};
