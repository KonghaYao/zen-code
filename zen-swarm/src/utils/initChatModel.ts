/**
 * 初始化聊天模型
 * 支持多 provider 模式
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

export async function initChatModel(
    modelId: string,
    config: {
        modelProvider?: string;
        temperature?: number;
        streamUsage?: boolean;
        enableThinking?: boolean;
    } = {},
) {
    const { modelProvider = 'openai', temperature = 0.7, streamUsage = true, enableThinking = true } = config;

    if (modelProvider === 'anthropic') {
        return new ChatAnthropic({
            model: modelId,
            temperature,
            streamUsage,
            thinking: enableThinking
                ? {
                      budget_tokens: 1024,
                      type: 'enabled',
                  }
                : undefined,
        });
    }

    // 默认使用 OpenAI
    return new ChatOpenAI({
        model: modelId,
        temperature,
        streamUsage,
    });
}
