/**
 * Standard Agent Factory
 *
 * Creates specialized agents with configurable tools and middleware.
 * Used by switchBranch to route to different agent configurations.
 */

import { initChatModel } from '../utils/initChatModel.js';
import { AgentMiddleware, createAgent, Runtime } from 'langchain';
import { CodeState, CodeStateType } from '../state.js';
import { AgentsMdMiddleware } from '../middlewares/agentsMD.js';
import { SkillsMiddleware } from '../middlewares/skills.js';
import { MemoriesMiddleware } from '../middlewares/memories.js';
import { SubAgentsMiddleware } from '../middlewares/subagents.js';
import { ask_user_with_options, ask_user_with_options_config, humanInTheLoopMiddleware } from '@langgraph-js/auk';
import { anthropicPromptCachingMiddleware } from '../middlewares/anthropicCache.js';
import { CommandSystemMiddleware } from '../middlewares/commandSystem.js';
import { bash_tools } from '../tools/bash_tools/index.js';
import {
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    folder_tool,
} from '../tools/filesystem_tools/index.js';
import { CORE_SYSTEM_PROMPT, getEnvInfo } from '../prompts/coding.js';
import type { AgentConfig } from './config.js';
import { todo_write_tool, add_task_tool, commit_task_tool } from '../tools/task_tools/index.js';
import { MCPManager } from '../mcp/MCPManager.js';

// All available tools
const ALL_TOOLS = [
    ask_user_with_options,
    todo_write_tool,
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    folder_tool,
    ...bash_tools,
];

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
    let tools = config.tools.includes('all')
        ? [...ALL_TOOLS]
        : config.tools
              .map((name) => TOOL_MAP.get(name))
              .filter((t): t is (typeof ALL_TOOLS)[number] => t !== undefined);

    // Build middleware chain based on config

    const middleware: AgentMiddleware[] = [];

    if (state.is_in_task) {
        tools.push(commit_task_tool as any);
    } else {
        tools.push(add_task_tool as any);
    }
    // 注册工具到 CommandSystem
    if (config.middleware.subagents) {
        const subagents = new SubAgentsMiddleware();
        // subagents.addSubAgents('sub_agent', );
        middleware.push(subagents);
    }

    if (config.middleware.memories) {
        middleware.push(
            new MemoriesMiddleware({
                projectMemoriesDir: './.claude/memories',
            }),
        );
    }
    if (config.middleware.skills) {
        middleware.push(
            new SkillsMiddleware({
                projectSkillsDir: './.claude/skills',
            }),
        );
    }

    if (config.middleware.agents_md) {
        middleware.push(new AgentsMdMiddleware());
    }

    const commandSystem = new CommandSystemMiddleware();
    const commandTools = [read_tool, glob_tool];
    // Add MCP tools if enabled
    if (config.middleware.mcp) {
        const mcpTools = await MCPManager.getInstance().getAllTools();
        /** @ts-ignore */
        commandTools.push(...mcpTools);
    }
    commandSystem.registerTools(commandTools);
    middleware.push(commandSystem);

    const interruptOn = {
        ...ask_user_with_options_config.interruptOn,
    };
    if (process.env.YOLO_MODE !== 'true') {
        Object.assign(interruptOn, {
            terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
        });
    }
    middleware.push(
        humanInTheLoopMiddleware({
            interruptOn,
        }),
    );
    if (process.env.MODEL_PROVIDER === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // Resolve system prompt
    const systemPrompt =
        typeof config.systemPrompt === 'function'
            ? await config.systemPrompt(state)
            : config.systemPrompt || CORE_SYSTEM_PROMPT;

    return createAgent({
        name: config.name,
        model,
        systemPrompt: systemPrompt + `\n\n${await getEnvInfo(state)}`,
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
