/**
 * Standard Agent Factory V2
 *
 * Creates specialized agents using AgentPackage configuration system.
 * Supports dynamic tool and middleware loading with full type safety.
 */

import { initChatModel } from '../utils/initChatModel.js';
import { AgentMiddleware, createAgent, DynamicStructuredTool, DynamicTool, Runtime, Tool, tool } from 'langchain';
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
import { todo_write_tool, add_task_tool, commit_task_tool } from '../tools/task_tools/index.js';
import { MCPManager } from '../mcp/MCPManager.js';
import { AgentPackage } from '../standard-agent/package.js';
import { MemoryStorage } from '../standard-agent/storage/memory.js';
import { ToolRegistry, MiddlewareRegistry } from '../standard-agent/registry.js';
import type { ToolImplementation, MiddlewareImplementation } from '../standard-agent/types.js';
import { fromLangChainTool } from '../standard-agent/langchain.js';
import { DynamicStructuredToolInput } from '@langchain/core/tools';

// ============================================
// Runtime Tool Registry
// ============================================

/**
 * Create a runtime middleware registry
 */
export function createMiddlewareRegistry(): MiddlewareRegistry {
    const registry = new MiddlewareRegistry();

    // Middleware implementations are created per-agent in createStandardAgent
    // This registry only stores schemas for validation

    registry.registerSchema({
        id: 'middleware/agents_md',
        name: 'agents_md',
        description: 'Inject agent documentation',
    });

    registry.registerSchema({
        id: 'middleware/skills',
        name: 'skills',
        description: 'Progressive skills disclosure',
    });

    registry.registerSchema({
        id: 'middleware/memories',
        name: 'memories',
        description: 'Knowledge persistence',
    });

    registry.registerSchema({
        id: 'middleware/mcp',
        name: 'mcp',
        description: 'Model Context Protocol integration',
    });

    registry.registerSchema({
        id: 'middleware/subagents',
        name: 'subagents',
        description: 'Task delegation to specialized agents',
    });

    return registry;
}

// ============================================
// Agent Factory
// ============================================

/**
 * Create a standard agent from AgentPackage configuration (V2)
 *
 * Overload 1: From AgentConfig (V1 compatible)
 * @param config - Agent configuration object
 * @param state - Current code state
 * @param runtime - LangGraph runtime
 *
 */
export async function createStandardAgentV2(
    agentId: string,
    pkg: AgentPackage,
    state: CodeStateType,
    runtime: Runtime,
) {
    // Load agent configuration
    const agentConfig = await pkg.getAgent(agentId);
    if (!agentConfig) {
        throw new Error(`Agent not found: ${agentId}`);
    }

    // Validate agent configuration
    const validation = await pkg.validateAgent(agentId);
    if (!validation.valid) {
        throw new Error(`Agent validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // Load model configuration
    const modelConfig = await pkg.getModel(agentConfig.modelId);
    if (!modelConfig) {
        throw new Error(`Model not found: ${agentConfig.modelId}`);
    }

    // Initialize model
    const model = await initChatModel(modelConfig.model_name, {
        modelProvider: modelConfig.model_provider,
        streamUsage: modelConfig.stream_usage,
        enableThinking: modelConfig.enable_thinking,
    });

    // Create runtime tool registry
    const toolRegistry = pkg.tools;

    // Filter tools based on agent configuration
    const tools: DynamicStructuredTool[] = [];
    for (const [toolId, params] of Object.entries(agentConfig.tools)) {
        const toolImpl = toolRegistry.getImplementation(toolId);
        if (!toolImpl) {
            console.warn(toolId + ' is not found');
            break;
        }
        if (!toolImpl.name || !params) {
            break;
        }
        tools.push(
            tool(
                toolImpl.execute,
                /** @ts-ignore */
                {
                    name: toolImpl.name,
                    description: toolImpl.description,
                    schema: toolImpl.paramsSchema?.toJSONSchema() || toolImpl.paramsSchema,
                },
            ) as any as DynamicStructuredTool,
        );
    }
    // Add task tools based on state
    if (state.is_in_task) {
        tools.push(commit_task_tool);
    } else {
        tools.push(add_task_tool);
    }

    // Build middleware chain
    const middleware: AgentMiddleware[] = [];

    // SubAgents middleware (must be first for delegation)
    if (agentConfig.middleware['middleware/subagents']) {
        const subagents = new SubAgentsMiddleware();
        middleware.push(subagents);
    }

    // Memories middleware
    if (agentConfig.middleware['middleware/memories']) {
        middleware.push(
            new MemoriesMiddleware({
                projectMemoriesDir: './.claude/memories',
            }),
        );
    }

    // Skills middleware
    if (agentConfig.middleware['middleware/skills']) {
        middleware.push(
            new SkillsMiddleware({
                projectSkillsDir: './.claude/skills',
            }),
        );
    }

    // Agents MD middleware
    if (agentConfig.middleware['middleware/agents_md']) {
        middleware.push(new AgentsMdMiddleware());
    }

    // Command System middleware (always enabled for tool discovery)
    const commandSystem = new CommandSystemMiddleware();
    const commandTools = [read_tool, glob_tool];

    // Add MCP tools to command system
    if (agentConfig.middleware['middleware/mcp']) {
        const mcpTools = await MCPManager.getInstance().getAllTools();
        commandTools.push(...(mcpTools as any));
    }

    commandSystem.registerTools(commandTools);
    middleware.push(commandSystem);

    // Human-in-the-loop middleware
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

    // Anthropic prompt caching (if using Anthropic)
    if (modelConfig.model_provider === 'anthropic') {
        middleware.push(anthropicPromptCachingMiddleware());
    }

    // Load system prompt
    const promptConfig = await pkg.getPrompt(agentConfig.systemPromptId);
    if (!promptConfig) {
        throw new Error(`Prompt not found: ${agentConfig.systemPromptId}`);
    }

    const systemPrompt = promptConfig.content + `\n\n${await getEnvInfo(state)}`;

    // Create agent
    return createAgent({
        name: agentConfig.name,
        model,
        systemPrompt,
        tools,
        stateSchema: CodeState,
        middleware,
    });
}

/**
 * Get agent IDs from package
 */
export async function getAvailableAgentIds(pkg: AgentPackage): Promise<string[]> {
    const agents = await pkg.listAgents();
    return agents.map((agent) => agent.id);
}
