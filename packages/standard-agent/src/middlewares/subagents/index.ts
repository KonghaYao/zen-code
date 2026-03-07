/**
 * SubAgents Middleware
 *
 * Generic middleware for delegating tasks to specialized subagents.
 * Migrated from packages/agent/src/middlewares/subTasks.ts
 *
 * Features:
 * - Progressive disclosure of available subagents
 * - Task delegation via 'task' tool
 * - State isolation between parent and subagents
 * - Customizable agent creation via factory function
 * - Configurable stateSchema and contextSchema
 * - Decoupled from AgentPackage - accepts plain agent list
 */

import { AgentMiddleware, AIMessage, SystemMessage } from 'langchain';
import type { ServerTool } from '@langchain/core/tools';
import type { z } from 'zod';
import { create_task_tool } from './task_tool.js';
import type { SubAgentsMiddlewareOptions, SubAgentInfo } from './types.js';

// Default system prompt template for subagents
const SUBAGENTS_SYSTEM_PROMPT = `
## SubAgents System

You have access to a subagent system that can delegate specialized tasks to other agents.

**Available SubAgents:**

{subagents_list}

**How to Use SubAgents (Progressive Disclosure):**

SubAgents follow a **progressive disclosure** pattern - you know they exist (name + description above), but you only delegate tasks when needed:

1. **Recognize when to delegate**: Check if the user's task matches a subagent's specialization
2. **Use the task tool**: Call the tool with the subagent's ID and a clear task description
3. **Provide context**: Use the \`data_transfer\` parameter to pass relevant information
4. **Get results**: The subagent will process the task and return results

**When to Use SubAgents:**
- When the user's request requires specialized knowledge or workflows
- When a task is complex and can be broken down into subtasks
- When you need parallel processing or different expertise areas
- When a subagent provides proven patterns for specific domains

**SubAgent Tool Usage:**

The \`task\` tool is available for delegation:

- **subagent_id**: The ID of the subagent to delegate to
- **task_description**: Clear description of what needs to be done
- **task_id** (optional): Identifier for tracking, it will automatically be generated after you run a subagent.
- **data_transfer** (optional): Context/data to pass to the subagent

**Example Workflow:**

User: "Can you have the research agent look into quantum computing developments?"

1. Check available subagents above → See "research" subagent with ID
2. Use task tool with appropriate parameters
3. Provide clear task description and any necessary context
4. Process the results from the subagent

Remember: SubAgents are tools to distribute work and leverage specialized capabilities. When in doubt, check if a subagent exists for the task!
`;

/**
 * Default formatter for agent list in system prompt
 */
function defaultFormatAgentList(agents: SubAgentInfo[]): string {
    const lines: string[] = [];

    for (const agent of agents) {
        lines.push(`- **${agent.id}**: ${agent.description}`);
        lines.push(`  → Use task with subagent_id: "${agent.id}"`);
    }

    return lines.join('\n');
}

/**
 * SubAgents Middleware Implementation
 *
 * Provides task delegation capabilities to specialized subagents.
 */
export class SubAgentsMiddleware<TState = any> implements AgentMiddleware {
    name = 'SubAgentsMiddleware';

    // State and context schemas (can be overridden via options)
    stateSchema: z.ZodType<any> | undefined;
    contextSchema: z.ZodType<any> | undefined;

    // Tools
    tools: AgentMiddleware['tools'] = [];

    // Agent list (plain array, no AgentPackage dependency)
    private agents: SubAgentInfo[];
    private formatAgentListFn: (agents: SubAgentInfo[]) => string;
    private agentListString: string;

    constructor(options: SubAgentsMiddlewareOptions<TState>) {
        this.agents = options.agents;
        this.formatAgentListFn = options.formatAgentList || defaultFormatAgentList;

        // Set stateSchema and contextSchema from options
        if (options.stateSchema) {
            /** @ts-ignore langchain 问题 */
            this.stateSchema = options.stateSchema;
        }
        if (options.contextSchema) {
            this.contextSchema = options.contextSchema;
        }

        // Pre-compute agent list string (no async needed now)
        this.agentListString = this.formatAgentListFn(this.agents);

        // Create task tool using original interface
        const taskTool = create_task_tool(
            async (taskId, args, state) => {
                return await options.createAgent(taskId, args, state);
            },
            {
                name: options.toolName,
                description: options.toolDescription,
                pass_through_keys: options.passThroughKeys,
            },
        );

        this.tools!.push(taskTool as any as ServerTool);
    }

    /**
     * Wrap model call to inject subagents system prompt
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // Format system prompt
        const subagentsSection = SUBAGENTS_SYSTEM_PROMPT.replace('{subagents_list}', this.agentListString);

        // Append to system prompt
        let newSystemPrompt: string;
        if (request.systemPrompt) {
            newSystemPrompt = request.systemPrompt + '\n\n' + subagentsSection;
        } else {
            newSystemPrompt = subagentsSection;
        }

        // Create modified request
        const modifiedRequest = {
            ...request,
            systemMessage: new SystemMessage(newSystemPrompt),
        };

        return await handler(modifiedRequest);
    }
}

// Re-export types and utilities
export * from './types.js';
export * from './task_tool.js';
export * from './package-utils.js';
