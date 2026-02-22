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
    cwd: z.string().default(process.cwd()),
});

/**
 * Swarm 状态定义 (Annotation)
 */
export const SwarmState = createState(SubAgentAnnotation, MessagesAnnotation).build({
    // Agent 配置
    agent_id: createDefaultAnnotation(() => 'default'),
    model_id: createDefaultAnnotation(() => 'gpt-4o-mini'),
    provider_type: createDefaultAnnotation(() => 'openai'),
    cwd: createDefaultAnnotation(() => process.cwd()),
});

export type SwarmStateType = typeof SwarmState.State;
