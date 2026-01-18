import { ChatOpenAI } from '@langgraph-js/pro';
import { ChatAnthropic } from '@langchain/anthropic';

interface InitChatModelOptions {
    modelProvider?: string;
    streamUsage?: boolean;
    enableThinking?: boolean;
}

export const initChatModel = async (mainModel: string, options: InitChatModelOptions = {}) => {
    // 自定义初始化聊天模型的逻辑
    const { modelProvider, enableThinking = true } = options;
    let model;

    if (modelProvider === 'anthropic') {
        model = new ChatAnthropic({
            model: mainModel,
            streamUsage: true,
            streaming: true,
            maxRetries: 1,
            maxTokens: 65536,
            thinking: enableThinking
                ? {
                      budget_tokens: 1024,
                      type: 'enabled',
                  }
                : undefined,
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
        });
    }

    return model;
};
