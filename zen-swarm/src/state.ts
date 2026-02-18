/**
 * Zen Swarm State
 * 使用 LangGraph 标准状态管理模式
 */

import { createState, createDefaultAnnotation } from '@langgraph-js/pro';
import { MessagesAnnotation } from '@langchain/langgraph';

/**
 * Swarm 状态定义
 */
export const SwarmState = createState(MessagesAnnotation).build({
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
