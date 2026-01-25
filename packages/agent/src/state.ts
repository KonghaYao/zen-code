/**
 * Agent 状态定义
 * 从 agents/code/state.ts 迁移
 */

import { AgentState, createDefaultAnnotation, createState } from '@langgraph-js/pro';
import { z } from 'zod';
import { MessagesAnnotation } from '@langchain/langgraph';

/**
 * 基础注解
 */
export const SubAgentAnnotation = createState().build({
  task_store: createDefaultAnnotation(() => ({})),
});

export const SubAgentStateSchema = z.object({
  task_store: z.record(z.string(), z.any()).optional(),
});

/**
 * Code Agent 状态
 */
export const CodeState = AgentState.extend(SubAgentStateSchema.shape).extend({
  main_model: z.string().default('qwen-plus'),
  agent_name: z.string().default('Code Agent'),
  switch_command: z.string().optional(),
  enable_thinking: z.boolean().default(true),
});

export const CodeAnnotation = createState(MessagesAnnotation, SubAgentAnnotation).build({
  main_model: createDefaultAnnotation(() => 'qwen-plus'),
  agent_name: createDefaultAnnotation(() => 'Code Agent'),
  switch_command: createDefaultAnnotation(() => null),
  enable_thinking: createDefaultAnnotation(() => true),
  is_in_task: createDefaultAnnotation(() => false)
});

export type CodeStateType = typeof CodeAnnotation.State;
