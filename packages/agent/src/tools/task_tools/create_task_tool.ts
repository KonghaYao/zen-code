import { Annotation, Command } from '@langchain/langgraph';
import { HumanMessage, tool } from 'langchain';
import { z } from 'zod';
import { Message } from '@langchain/core/messages';
import { type ToolRuntime } from '@langchain/core/tools';
import { createState } from '@langgraph-js/pro';

export const SubAgentStateSchema = z.object({
    task_store: z.record(z.string(), z.any()).default({}),
});

export const SubAgentAnnotation = createState().build({
    task_store: Annotation({
        reducer: (a, b: any) => ({ ...a, ...b }),
        default: () => ({}),
    }),
});

const schema = z.object({
    task_id: z
        .string()
        .optional()
        .describe('The task id to ask the subagent, if not provided, will use the tool call id'),
    subagent_type: z
        .string()
        .describe(
            'The type of subagent to use. Must be one of the available agent types listed in the tool description.',
        ),
    task_description: z.string().describe('Describe the user state and what you want the subagent to do.'),
    data_transfer: z.any().optional().describe('Data to transfer to the subagent.'),
});

export const create_task_tool = (
    agentCreator: (task_id: string, args: z.infer<typeof schema>, parent_state: any) => Promise<any>,
    options?: {
        name?: string;
        description?: string;
        pass_through_keys?: string[];
    },
) =>
    tool(
        async (args, config: ToolRuntime<typeof SubAgentStateSchema, any>) => {
            const state = config.state;
            const taskId: string = args.task_id || config.toolCall!.id!;
            let sub_state = {
                messages: [] as Message[],
            };
            if (taskId && (state as any)?.['task_store']?.[taskId]) {
                sub_state = (state as any)?.['task_store'][taskId];
            } else {
                // 全复制状态
                sub_state = JSON.parse(JSON.stringify(state));
                sub_state.messages = [];
                /** @ts-ignore 不继承 task_store 中的信息 */
                sub_state.task_store = {};
            }

            const agent = await agentCreator(taskId, args, state);
            sub_state.messages.push(new HumanMessage({ content: args.task_description }));
            if (args.data_transfer) {
                sub_state.messages.push(
                    new HumanMessage({
                        content: `Here is the data to help you complete the task: ${JSON.stringify(
                            args.data_transfer,
                            null,
                            2,
                        )}`,
                    }),
                );
            }
            const new_state = await agent.invoke(sub_state);
            const last_message = new_state['messages'].at(-1);

            const update: any = {
                task_store: {
                    ...(state?.['task_store'] || {}),
                    [taskId]: new_state,
                },
                messages: [
                    {
                        role: 'tool',
                        content: `task_id: ${taskId}\n---\n` + (last_message?.text || ''),
                        tool_call_id: config.toolCall!.id!,
                    },
                ],
            };

            options?.pass_through_keys?.forEach((key) => {
                if (key in new_state) {
                    update[key] = new_state[key];
                }
            });

            return new Command({
                update,
            });
        },
        {
            name: 'task',
            description: `Launch a new agent to handle complex, multi-step tasks autonomously. 

Available agent types and the tools they have access to:
- general-purpose: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you. (Tools: *)
- statusline-setup: Use this agent to configure the user\'s Claude Code status line setting. (Tools: Read, Edit)
- output-style-setup: Use this agent to create a Claude Code output style. (Tools: Read, Write, Edit, Glob, LS, Grep)

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.



When NOT to use the Agent tool:
- If you want to read a specific file path, use the Read or Glob tool instead of the Agent tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the Glob tool instead, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files, use the Read tool instead of the Agent tool, to find the match more quickly
- Other tasks that are not related to the agent descriptions above


Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
3. Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
4. The agent\'s outputs should generally be trusted
5. Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user\'s intent
6. If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.

Example usage:

<example_agent_descriptions>
"code-reviewer": use this agent after you are done writing a significant piece of code
"greeting-responder": use this agent when to respond to user greetings with a friendly joke
</example_agent_description>

<example>
user: "Please write a function that checks if a number is prime"
assistant: Sure let me write a function that checks if a number is prime
assistant: First let me use the Write tool to write a function that checks if a number is prime
assistant: I\'m going to use the Write tool to write the following code:
<code>
function isPrime(n) {
  if (n <= 1) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}
</code>
<commentary>
Since a signficant piece of code was written and the task was completed, now use the code-reviewer agent to review the code
</commentary>
assistant: Now let me use the code-reviewer agent to review the code
assistant: Uses the Task tool to launch the with the code-reviewer agent 
</example>

<example>
user: "Hello"
<commentary>
Since the user is greeting, use the greeting-responder agent to respond with a friendly joke
</commentary>
assistant: "I\'m going to use the Task tool to launch the with the greeting-responder agent"
</example>
`,
            schema,
        },
    );
