/**
 * Standard Agent Factory V2
 *
 * Creates specialized agents using AgentPackage configuration system.
 * Supports dynamic tool and middleware loading with full type safety.
 */

import { initChatModel } from '../utils/initChatModel.js';
import { AgentMiddleware, createAgent, DynamicStructuredTool, Runtime, tool } from 'langchain';
import { CodeAnnotation, CodeState, CodeStateType } from '../state.js';
import { anthropicPromptCachingMiddleware } from '@langgraph-js/standard-agent';
import { CommandSystemMiddleware } from '../middlewares/commandSystem.js';
import { getEnvInfo } from '../prompts/coding.js';
import { AgentPackage } from '@langgraph-js/standard-agent';
import { humanInTheLoopMiddleware } from '@langgraph-js/auk';

// ============================================
// Human-in-the-Loop Configuration
// ============================================

/**
 * Tool interrupt configuration
 * Controls which tools require human approval
 */
const INTERRUPT_ON_CONFIG = {
    ask_user_questions: {
        allowedDecisions: ['respond', 'approve', 'reject', 'edit'],
    },
};

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
    options?: { parent_id?: string },
) {
    const isSubAgent = !!options?.parent_id;
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
    // const modelConfig = await pkg.getModel(state.model_id || agentConfig.modelId);

    // Initialize model
    const model = await initChatModel(state.model_id, {
        modelProvider: state.provider_id,
        streamUsage: true,
        enableThinking: state.enable_thinking,
        metadata: {
            // message 通过这个 id 判断是否为子调用
            parent_id: options?.parent_id,
        },
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

    // Build middleware chain
    const middleware: AgentMiddleware[] = [];
    for (const [middlewareId, params] of Object.entries(agentConfig.middleware)) {
        if (middlewareId === 'subagents' && isSubAgent) continue;
        const subagentsImpl = pkg.middlewares.getImplementation(middlewareId);
        if (!params) {
            break;
        }

        middleware.push(await subagentsImpl!.execute(params.customParams || {}));
    }

    // Command System middleware (always enabled for MCP tool discovery and execution)
    const commandSystem = new CommandSystemMiddleware();
    middleware.push(commandSystem);

    // Human-in-the-loop middleware
    const interruptOn = {
        ...INTERRUPT_ON_CONFIG,
    };

    if (process.env.YOLO_MODE !== 'true') {
        Object.assign(interruptOn, {
            terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
        });
    }

    middleware.push(
        humanInTheLoopMiddleware({
            /** @ts-ignore */
            interruptOn,
        }),
    );

    // Anthropic prompt caching (if using Anthropic)
    if (process.env.MODEL_PROVIDER === 'anthropic') {
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
        name: isSubAgent ? `subagent_${options.parent_id}` : agentConfig.name,
        model,
        systemPrompt,
        tools,
        stateSchema: CodeAnnotation,
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
