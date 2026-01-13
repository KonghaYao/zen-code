import { ChatOpenAI } from '@langgraph-js/pro';
import { ChatAnthropic } from '@langchain/anthropic';

export const initChatModel = async (mainModel: string, {}) => {
    // 自定义初始化聊天模型的逻辑
    let model;

    if (process.env.MODEL_PROVIDER === 'anthropic') {
        model = new ChatAnthropic({
            model: mainModel,
            streamUsage: true,
            streaming: true,
            maxRetries: 1,
            maxTokens: 65536,
            thinking: {
                budget_tokens: 1024,
                type: 'enabled',
            },
        });
    } else {
        model = new ChatOpenAI({
            model: mainModel,
            streamUsage: true,
            maxRetries: 1,
            modelKwargs: {
                thinking: {
                    type: 'enabled',
                },
            },
        });
    }

    return model;
};
