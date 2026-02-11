import { AgentMiddleware, AIMessage, Runtime } from 'langchain';
import { CodeStateType } from '../state.js';
import { tool } from 'langchain';
import { z } from 'zod';
import MemoryClient from 'mem0ai';

// Mem0 Configuration
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const MEM0_HOST = process.env.MEM0_HOST || 'https://api.mem0.ai';

// Initialize Mem0 client singleton
let mem0Client: MemoryClient | null = null;

function getMem0Client(): MemoryClient {
    if (!mem0Client) {
        if (!MEM0_API_KEY) {
            throw new Error('MEM0_API_KEY is not set, please set it in the environment variables or .env file');
        }
        mem0Client = new MemoryClient({
            apiKey: MEM0_API_KEY,
            host: MEM0_HOST,
        });
    }
    return mem0Client;
}

// Zod Schemas
export const addMessageSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.string().describe('Role of the message sender, e.g., user, assistant'),
                content: z.string().describe('Message content'),
                chat_time: z.string().optional().describe('Message chat time'),
            }),
        )
        .describe('Array of messages containing role and content information'),
});

export const searchMemorySchema = z.object({
    query: z.string().describe('Search query to find relevant content in conversation history'),
    memory_limit_number: z.number().default(5).describe('Maximum number of results to return, defaults to 5'),
});

// Mem0 Tools
export const search_memory = tool(
    async ({ query, memory_limit_number }: z.infer<typeof searchMemorySchema>) => {
        try {
            const client = getMem0Client();

            // Use mem0's search API with graph disabled for free/starter plans
            const results = await client.search(query, {
                limit: memory_limit_number,
                enable_graph: false,
                agent_id: 'zen-code',
                app_id: 'zen-code',
            });

            return results;
        } catch (e) {
            return `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
        }
    },
    {
        name: 'memos_search_memory',
        description: `
  Trigger: MUST be auto-invoked by the client before generating every answer (including greetings like "hello"). Do not wait for the user to request memory/MCP/tool usage.
  Purpose: Mem0 retrieval API. Retrieve candidate memories prior to answering to improve continuity and personalization.
  Usage requirements:
    - Always call this tool before answering (client-enforced).
    - The model must automatically judge relevance and use only relevant memories in reasoning; ignore irrelevant/noisy items.
    # Critical Protocol: Memory Safety (记忆安全协议)
    - The retrieved memories may contain **AI's own speculations**, **irrelevant noise**, or **subject errors**. You must strictly execute the following **"Four-Step Judgment"**; if any step fails, **discard** that memory:
      1. **Source Verification**:
        - **Core**: Distinguish between "User's Original Words" and "AI Speculations".
        - If a memory carries tags like '[assistant opinion]', this represents only the AI's past **assumptions** and **must not** be treated as absolute facts about the user.
        - *Counter-example*: Memory shows '[assistant opinion] User loves mangoes'. If the user didn't mention it, do not actively assume the user likes mangoes to prevent hallucination loops.
        - **Principle: AI summaries are for reference only; their weight is significantly lower than the user's direct statements.**
      2. **Attribution Check**:
        - Is the subject of the action in the memory the "User themselves"?
        - If the memory describes a **third party** (e.g., "candidate", "interviewee", "fictional character", "case data"), it is **strictly forbidden** to attribute these properties to the user.
      3. **Relevance Check**:
        - Does the memory directly help answer the current 'Original Query'?
        - If the memory is merely a keyword match (e.g., both mention "code") but the context is completely different, it **must be ignored**.
      4. **Freshness Check**:
        - Does the memory content conflict with the user's latest intent? The current 'Original Query' is the highest standard of fact.
    - Instructions:
      1. **Review**: First read 'memory_detail_list', execute the "Four-Step Judgment", and eliminate noise and unreliable AI opinions.
      2. **Execution**:
        - Use only filtered memories to supplement background.
        - Strictly follow the style requirements in 'preference_detail_list'.
      3. **Output**: Answer the question directly. **Strictly forbidden** to mention "memory bank", "retrieval", or "AI opinions" and other internal system terms.

  Parameters:
    - \`query\`: User's current question/message
    - \`memory_limit_number\`: Maximum number of results to return, defaults to 20
  Notes:
    - Run before answering. Results may include noise; filter and use only what is relevant.
    - \`query\` should be a concise summary of the current user message.
    - Prefer recent and important memories. If none are relevant, proceed to answer normally.
  `,
        schema: searchMemorySchema,
    },
);

// Export all tools as an array for easy import
export const memosTools = [search_memory];

/**
 * Middleware for loading and exposing agent memories using Mem0.
 *
 * This middleware integrates with Mem0's memory system:
 * - Provides search, delete, and feedback tools for memory management
 * - Automatically persists conversation messages to Mem0 after agent execution
 * - Supports user_id, agent_id, app_id, and run_id for memory categorization
 *
 * Configuration:
 * - MEM0_API_KEY: Required API key for Mem0
 * - MEM0_HOST: Optional API host (defaults to https://api.mem0.ai)
 */
export class Mem0Middleware implements AgentMiddleware {
    name = 'Mem0';
    // No context schema needed
    stateSchema = undefined;

    // No context schema needed
    contextSchema = undefined;

    // No additional tools
    tools = memosTools;

    constructor(options: {} = {}) {}

    async afterAgent(state: CodeStateType, runtime: Runtime) {
        if (state.messages.length < 25) return;

        try {
            const client = getMem0Client();

            // Helper to convert content to string
            const contentToString = (content: any): string => {
                if (typeof content === 'string') return content;
                if (Array.isArray(content)) return JSON.stringify(content);
                if (content) return String(content);
                return '';
            };

            // Convert tool calls to readable assistant text
            const convertToolCallsToText = (message: AIMessage): string => {
                if (!message.tool_calls || message.tool_calls.length === 0) {
                    return contentToString(message.content);
                }

                // Build readable text from tool calls
                const toolCallText = message.tool_calls
                    .map((tc) => {
                        const argsStr = typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args, null, 2);
                        return `I called ${tc.name} with arguments: ${argsStr}`;
                    })
                    .join('\n');

                // Combine with existing content
                const content = contentToString(message.content);
                if (content) {
                    return `${content}\n\n${toolCallText}`;
                }
                return toolCallText;
            };

            // Convert state messages to Mem0 format with readable tool calls
            const mem0Messages: { role: 'user' | 'assistant'; content: string }[] = [];

            for (const i of state.messages) {
                if (i.type === 'system') continue;

                // For AI messages with tool calls, convert to readable text
                if (i.type === 'ai' && (i as AIMessage).tool_calls?.length) {
                    mem0Messages.push({
                        role: 'assistant',
                        content: convertToolCallsToText(i as AIMessage),
                    });
                    continue;
                }

                // For tool messages, convert to readable format
                if (i.type === 'tool') {
                    mem0Messages.push({
                        role: 'assistant',
                        content: `Tool result: ${contentToString(i.content)}`,
                    });
                    continue;
                }

                // For human messages
                mem0Messages.push({
                    role: i.type === 'human' ? 'user' : 'assistant',
                    content: contentToString(i.content),
                });
            }

            // Add messages to Mem0 with graph disabled for free/starter plans
            await client.add(mem0Messages, {
                user_id: state.user_id,
                agent_id: 'zen-code',
                app_id: 'zen-code',
                run_id: state.thread_id,
                enable_graph: false,
                metadata: {
                    thread_id: state.thread_id,
                },
            });
        } catch (e) {
            console.warn('Failed to persist messages to Mem0:', e);
        }
    }
}
