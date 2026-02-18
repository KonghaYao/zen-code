/**
 * Zen Swarm State
 * 使用 LangGraph 标准状态管理模式
 */

import { createState, createDefaultAnnotation, AgentState } from '@langgraph-js/pro';
import { MessagesAnnotation } from '@langchain/langgraph';
import { SubAgentAnnotation, SubAgentStateSchema } from '@langgraph-js/standard-agent';
import { z } from 'zod';

/**
 * Swarm State Schema (Zod)
 */
export const SwarmStateSchema = AgentState.extend(SubAgentStateSchema.shape).extend({
    // Agent 配置
    agent_id: z.string().default('default'),
    model_id: z.string().default('gpt-4o-mini'),
    provider_type: z.string().default('openai'),

    // Swarm 协作状态
    swarm_id: z.string().default(''),
    task_queue: z.array(z.string()).default([]),
    completed_tasks: z.array(z.string()).default([]),
});

/**
 * Swarm 状态定义 (Annotation)
 */
export const SwarmState = createState(SubAgentAnnotation, MessagesAnnotation).build({
    // Agent 配置
    agent_id: createDefaultAnnotation(() => 'default'),
    model_id: createDefaultAnnotation(() => 'gpt-4o-mini'),
    provider_type: createDefaultAnnotation(() => 'openai'),

    // Swarm 协作状态
    swarm_id: createDefaultAnnotation(() => ''),
    task_queue: createDefaultAnnotation(() => [] as string[]),
    completed_tasks: createDefaultAnnotation(() => [] as string[]),
});

export type SwarmStateType = typeof SwarmState.State;
