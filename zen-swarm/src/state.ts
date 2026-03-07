/**
 * Zen Swarm State
 * 使用新的 StateSchema API
 */

import { StateSchema, ReducedValue, MessagesValue } from '@langchain/langgraph';
import { z } from 'zod';

/**
 * Swarm 状态定义
 */
export const SwarmSchema = new StateSchema({
    messages: MessagesValue,
    task_store: new ReducedValue(
        z.record(z.string(), z.any()).default(() => ({})),
        {
            reducer: (a: Record<string, any>, b: Record<string, any>) => ({ ...a, ...b }),
        },
    ),
    // Agent 配置
    agent_id: z.string().default('default'),
    model_id: z.string().default(''),
    provider_type: z.string().default(''),
    cwd: z.string().default(process.cwd()),
});

// 向后兼容：保持原有导出名称
export const SwarmState = SwarmSchema;
export const SwarmStateSchema = SwarmSchema;
export type SwarmStateType = typeof SwarmSchema.State;
