/**
 * Standard Agent Factory
 *
 * Creates specialized agents with configurable tools and middleware.
 * Used by switchBranch to route to different agent configurations.
 */

import { initChatModel } from '../initChatModel.js';
import { createAgent, Runtime } from 'langchain';
import { CodeState, CodeStateType } from '../state.js';
import { AgentsMdMiddleware } from '../middlewares/agentsMD.js';
import { SkillsMiddleware } from '../middlewares/skills.js';
import { MemoriesMiddleware } from '../middlewares/memories.js';
import { MCPMiddleware } from '../middlewares/mcp.js';
import { SubAgentsMiddleware } from '../middlewares/subagents.js';
import { ask_user_with_options, humanInTheLoopMiddleware } from '@langgraph-js/auk';
import { anthropicPromptCachingMiddleware } from '../middlewares/anthropicCache.js';
import { bash_tools } from '../tools/bash_tools/index.js';
import { glob_tool, grep_tool, read_tool, write_tool, replace_tool } from '../tools/filesystem_tools/index.js';
import { create_finder } from './finder.js';
import { getSystemPrompt } from '../prompts/coding.js';
import type { AgentConfig } from './config.js';
import { todo_write_tool } from '../tools/task_tools/todo_tool.js';

// All available tools
const ALL_TOOLS = [
    ask_user_with_options,
    todo_write_tool,
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    ...bash_tools,
] as const;

// Tool name mapping
const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]));

/**
 * Create a standard agent with configurable tools and middleware
 *
 * @param config - Agent configuration (tools, middleware, prompt)
 * @param state - Current code state
 * @param runtime - LangGraph runtime
 * @returns Configured agent instance
 */
export async function createStandardAgent(config: AgentConfig, state: CodeStateType, runtime: Runtime) {
    const model = await initChatModel(state.main_model, {
        modelProvider: process.env.MODEL_PROVIDER || 'openai',
        streamUsage: true,
        enableThinking: state.enable_thinking ?? true,
    });

    // Filter tools based on config
    const tools = config.tools.includes('all')
        ? [...ALL_TOOLS]
        : config.tools
              .map((name) => TOOL_MAP.get(name))
              .filter((t): t is (typeof ALL_TOOLS)[number] => t !== undefined);

    // Build middleware chain based on config
    const middleware: any[] = [];

    if (config.middleware.subagents) {
        const subagents = new SubAgentsMiddleware();
        subagents.addSubAgents('finder', create_finder);
        middleware.push(subagents);
    }

    if (config.middleware.agents_md) {
        middleware.push(new AgentsMdMiddleware());
    }

    if (config.middleware.skills) {
        middleware.push(
            new SkillsMiddleware({
                projectSkillsDir: './.claude/skills',
            }),
        );
    }

    if (config.middleware.memories) {
        middleware.push(
            new MemoriesMiddleware({
                projectMemoriesDir: './.claude/memories',
            }),
        );
    }

    if (config.middleware.mcp) {
        middleware.push(await MCPMiddleware(state.mcp_config as any));
    }

    // HITL is always enabled for safety
    middleware.push(
        humanInTheLoopMiddleware({
            interruptOn: {
                terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
            },
        }),
    );

    if (config.middleware.cache && process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // Resolve system prompt
    const systemPrompt = typeof config.systemPrompt === 'function'
        ? await config.systemPrompt(state)
        : config.systemPrompt;

    return createAgent({
        name: config.name,
        model,
        systemPrompt,
        tools,
        stateSchema: CodeState,
        middleware,
    });
}

/**
 * Get all available tool names
 * Useful for validation
 */
export function getAvailableToolNames(): Set<string> {
    return new Set(TOOL_MAP.keys());
}
