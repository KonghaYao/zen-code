import { AgentMiddleware, AIMessage, HumanMessage, ReactAgent, SystemMessage } from 'langchain';
import { ask_subagents, SubAgentStateSchema } from '../ask_agents';
import { ClientTool, ServerTool } from '@langchain/core/tools';

// SubAgents System Documentation
const SUBAGENTS_SYSTEM_PROMPT = `

## SubAgents System

You have access to a subagent system that can delegate specialized tasks to other agents.

**Available SubAgents:**

{subagents_list}

**How to Use SubAgents (Progressive Disclosure):**

SubAgents follow a **progressive disclosure** pattern - you know they exist (name + description above), but you only delegate tasks when needed:

1. **Recognize when to delegate**: Check if the user's task matches a subagent's specialization
2. **Use the ask_subagents tool**: Call the tool with the subagent's ID and a clear task description
3. **Provide context**: Use the \`data_transfer\` parameter to pass relevant information
4. **Get results**: The subagent will process the task and return results

**When to Use SubAgents:**
- When the user's request requires specialized knowledge or workflows
- When a task is complex and can be broken down into subtasks
- When you need parallel processing or different expertise areas
- When a subagent provides proven patterns for specific domains

**SubAgent Tool Usage:**

The \`ask_subagents\` tool is available for delegation:

- **subagent_id**: The ID of the subagent to delegate to
- **task_description**: Clear description of what needs to be done
- **task_id** (optional): Identifier for tracking, it will automatically be generated after you run a subagent.
- **data_transfer** (optional): Context/data to pass to the subagent

**Example Workflow:**

User: "Can you have the research agent look into quantum computing developments?"

1. Check available subagents above → See "research" subagent with ID
2. Use ask_subagents tool with appropriate parameters
3. Provide clear task description and any necessary context
4. Process the results from the subagent

Remember: SubAgents are tools to distribute work and leverage specialized capabilities. When in doubt, check if a subagent exists for the task!
`;

export class SubAgentsMiddleware implements AgentMiddleware {
    name: string = 'SubAgentsMiddleware';
    stateSchema = SubAgentStateSchema;
    contextSchema = undefined;
    tools: (ClientTool | ServerTool)[] = [];

    constructor() {
        this.tools.push(
            ask_subagents(
                async (taskId, args, state) => {
                    return await this.selectSubAgent(taskId, args, state);
                },
                { name: 'ask_subagents', description: 'ask subagents to help you' },
            ),
        );
    }

    subAgents = new Map<string, SubAgentCreator>();

    addSubAgents(name: string, creator: SubAgentCreator) {
        this.subAgents.set(name, creator);
    }

    /**
     * Format subagents metadata for display in system prompt.
     */
    private formatSubAgentsList(): string {
        if (this.subAgents.size === 0) {
            return '(No subagents available yet. You can add subagents using the addSubAgents method)';
        }

        const lines: string[] = [];

        for (const [name, creator] of this.subAgents) {
            // Try to extract description from creator function or use generic
            lines.push(`- **${name}**: Subagent for specialized tasks`);
            lines.push(`  → Use ask_subagents with subagent_id: "${name}"`);
        }

        return lines.join('\n');
    }

    async selectSubAgent(
        taskId: string,
        args: {
            subagent_id: string;
            task_description: string;
            task_id?: string | undefined;
            data_transfer?: any;
        },
        state: any,
    ): Promise<ReactAgent> {
        state.messages.push(new HumanMessage(args.task_description));
        return this.subAgents.get(args.subagent_id)!(taskId, args, state);
    }

    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // Format subagents documentation
        const subagentsList = this.formatSubAgentsList();

        const subagentsSection = SUBAGENTS_SYSTEM_PROMPT.replace('{subagents_list}', subagentsList);

        // Create new system message by appending subagents section
        let newSystemPrompt: string;
        if (request.systemPrompt) {
            newSystemPrompt = request.systemPrompt + '\n\n' + subagentsSection;
        } else {
            newSystemPrompt = subagentsSection;
        }

        // Create a new system message
        const newSystemMessage = new SystemMessage(newSystemPrompt);

        // Create modified request
        const modifiedRequest = {
            ...request,
            systemMessage: newSystemMessage,
        };

        // Call the handler with modified request
        return await handler(modifiedRequest);
    }
}

export type SubAgentCreator = (
    taskId: string,
    args: {
        subagent_id: string;
        task_description: string;
        task_id?: string | undefined;
        data_transfer?: any;
    },
    state: any,
) => Promise<ReactAgent>;
