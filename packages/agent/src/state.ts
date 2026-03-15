/**
 * Agent 状态定义
 * 使用新的 StateSchema API
 */

import { StateSchema, ReducedValue, MessagesValue } from '@langchain/langgraph';
import { z } from 'zod';

/**
 * Code Agent 状态
 */
export const CodeSchema = new StateSchema({
    messages: MessagesValue,
    task_store: new ReducedValue(
        z.record(z.string(), z.any()).default(() => ({})),
        {
            reducer: (a: Record<string, any>, b: Record<string, any>) => ({ ...a, ...b }),
        },
    ),
    provider_id: z.string().default('default'),
    provider_type: z.string().default('openai'),
    model_id: z.string().default('qwen-plus'),
    agent_name: z.string().default('Code Agent'),
    active_agent: z.string().optional(),
    enable_thinking: z.boolean().default(true),
    /** 是否启用流式输出（默认 false） */
    streaming: z.boolean().default(false),
    // sb 的 langchain 在 agent middleware 的 runtime 里面拿不到这些数据
    user_id: z.string().optional(),
    thread_id: z.string().optional(),
    cwd: z.string().default(process.cwd()),
    /** 路由到指定 agent（来自 SwarmState 合并） */
    agent_id: z.string().default('agents/default'),
});

// 向后兼容：保持原有导出名称
export const CodeAnnotation = CodeSchema;
export const CodeState = CodeSchema;
export type CodeStateType = typeof CodeSchema.State;
