import { AgentState, createDefaultAnnotation, createState } from '@langgraph-js/pro';
import { z } from 'zod';
import { SubAgentAnnotation, SubAgentStateSchema } from './ask_agents';
import { MessagesAnnotation } from '@langchain/langgraph';

export const CodeState = AgentState.extend(SubAgentStateSchema.shape).extend({
    main_model: z.string().default('qwen-plus'),
    cwd: z.string().default(''),
    agent_name: z.string().default('Code Agent'),
    mcp_config: z.unknown().optional(),
    switch_command: z.string().optional(),
    enable_thinking: z.boolean().default(true),
});

export const CodeAnnotation = createState(MessagesAnnotation, SubAgentAnnotation).build({
    main_model: createDefaultAnnotation(() => 'qwen-plus'),
    cwd: createDefaultAnnotation(() => ''),
    agent_name: createDefaultAnnotation(() => 'Code Agent'),
    mcp_config: createDefaultAnnotation(() => null),
    switch_command: createDefaultAnnotation(() => null),
    enable_thinking: createDefaultAnnotation(() => true),
});

export type CodeStateType = typeof CodeAnnotation.State;
