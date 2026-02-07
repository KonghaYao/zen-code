/**
 * Standard Agent Factory V2
 *
 * Creates specialized agents using AgentPackage configuration system.
 * Supports dynamic tool and middleware loading with full type safety.
 */

import { initChatModel } from '../utils/initChatModel.js';
import { AgentMiddleware, createAgent, DynamicStructuredTool, Runtime, Tool, tool } from 'langchain';
import { CodeState, CodeStateType } from '../state.js';
import { ask_user_with_options_config, humanInTheLoopMiddleware } from '@langgraph-js/auk';
import { anthropicPromptCachingMiddleware } from '../middlewares/anthropicCache.js';
import { CommandSystemMiddleware } from '../middlewares/commandSystem.js';
import { glob_tool, read_tool } from '../tools/filesystem_tools/index.js';
import { getEnvInfo } from '../prompts/coding.js';
import { add_task_tool, commit_task_tool } from '../tools/task_tools/index.js';
import { MCPManager } from '../mcp/MCPManager.js';
import { AgentPackage } from '../standard-agent/package.js';

// ============================================
// Runtime Middleware Registry
// ============================================

// ============================================
// Agent Factory
// ============================================

/**
 * Create a standard agent from AgentPackage configuration (V2)
 *
 * @param agentId - Agent ID from package
 * @param pkg - AgentPackage containing configuration
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

    // Filter tools based on agent configuration
    const tools: DynamicStructuredTool[] = [];
    const toolRegistry = pkg.tools;

    for (const [toolId, params] of Object.entries(agentConfig.tools)) {
        const toolImpl = toolRegistry.getImplementation(toolId);
        if (!toolImpl) {
            console.warn(`Tool ${toolId} not found in registry`);
            continue;
        }
        if (!toolImpl.name || !params) {
            continue;
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
    for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
        const subagentsImpl = pkg.middlewares.getImplementation(middlewareId);
        if (!params) {
            break;
        }

        middleware.push(await subagentsImpl!.execute(params.customParams));
    }

    // Command System middleware (always enabled for tool discovery)
    const commandSystem = new CommandSystemMiddleware();
    const commandTools = [read_tool, glob_tool];
    const mcpTools = await MCPManager.getInstance().getAllTools();
    commandTools.push(...(mcpTools as any));

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
