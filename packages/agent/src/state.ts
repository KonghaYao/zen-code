/**
 * Agent 状态定义
 * 从 agents/code/state.ts 迁移
 */

import { AgentState, createDefaultAnnotation, createState } from '@langgraph-js/pro';
import { z } from 'zod';
import { MessagesAnnotation } from '@langchain/langgraph';
import { SubAgentAnnotation, SubAgentStateSchema } from '@langgraph-js/standard-agent';

/**
 * Code Agent 状态
 */
export const CodeState = AgentState.extend(SubAgentStateSchema.shape).extend({
    provider_id: z.string().default('openai'),
    provider_type: z.string().default('openai'),
    model_id: z.string().default('qwen-plus'),
    agent_name: z.string().default('Code Agent'),
    switch_command: z.string().optional(),
    enable_thinking: z.boolean().default(true),
    // sb 的 langchain 在 agent middleware 的 runtime 里面拿不到这些数据
    user_id: z.string().optional(),
    thread_id: z.string().optional(),
    cwd: z.string().default(process.cwd()),
});

export const CodeAnnotation = createState(SubAgentAnnotation, MessagesAnnotation).build({
    provider_id: createDefaultAnnotation(() => 'openai'),
    provider_type: createDefaultAnnotation(() => 'openai'),
    model_id: createDefaultAnnotation(() => 'qwen-plus'),
    agent_name: createDefaultAnnotation(() => 'Code Agent'),
    switch_command: createDefaultAnnotation(() => null),
    enable_thinking: createDefaultAnnotation(() => true),
    // sb 的 langchain 在 agent middleware 的 runtime 里面拿不到这些数据
    user_id: createDefaultAnnotation(() => ''),
    thread_id: createDefaultAnnotation(() => ''),
    cwd: createDefaultAnnotation(() => process.cwd()),
});

export type CodeStateType = typeof CodeAnnotation.State;
