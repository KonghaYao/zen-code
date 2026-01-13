import { getSystemPrompt } from './prompts/coding.js';
import { bash_tools } from './tools/bash_tools/index.js';
import { glob_tool, grep_tool, read_tool, replace_tool, write_tool } from './tools/filesystem_tools/index.js';
import { todo_write_tool } from './tools/task_tools/todo_tool.js';
import { createAgent, Runtime, HumanMessage, SystemMessage } from 'langchain';

import { CodeAnnotation as CodeState, CodeStateType } from './state.js';
import { ask_user_with_options, ask_user_with_options_config, humanInTheLoopMiddleware } from '@langgraph-js/auk';
import { create_finder } from './subagents/finder.js';
import { SkillsMiddleware } from './middlewares/skills.js';
import { MemoriesMiddleware } from './middlewares/memories.js';
import { SubAgentsMiddleware } from './middlewares/subagents.js';
import { summary_prompt } from './middlewares/memory.js';
import { MCPMiddleware } from './middlewares/mcp.js';
import { AgentsMdMiddleware } from './middlewares/agentsMD.js';
import { getBufferMessage } from './utils/get_buffer_message.js';
import { REMOVE_ALL_MESSAGES, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, RemoveMessage } from '@langchain/core/messages';
import { initChatModel } from './initChatModel.js';
import { anthropicPromptCachingMiddleware } from './middlewares/anthropicCache.js';
import { analyzeAndSaveMemories } from './memories/analyze.js';

const switchBranch = {
    summarization: async (state: CodeStateType, runtime: Runtime) => {
        const model = await initChatModel(state.main_model, {
            modelProvider: process.env.MODEL_PROVIDER || 'openai',
            streamUsage: true,
        });
        const message = await model.invoke([
            new SystemMessage(summary_prompt),
            new HumanMessage(getBufferMessage(state.messages)),
            new HumanMessage('请总结上面的历史记录'),
        ]);
        return {
            switch_command: '',
            messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), message],
        };
    },
    smart_memory: async (state: CodeStateType, runtime: Runtime) => {
        const model = await initChatModel(state.main_model, {
            modelProvider: process.env.MODEL_PROVIDER || 'openai',
            streamUsage: true,
        });

        // 1. 分析对话并提取记忆
        const conversation = getBufferMessage(state.messages);
        const summaryContent = await analyzeAndSaveMemories(model, conversation);

        const summaryMessage = new AIMessage(summaryContent);

        // 3. 清空所有消息，只保留总结
        return {
            switch_command: '',
            messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), summaryMessage],
        };
    },
} as const;

export const graph = new StateGraph(CodeState)
    .addNode('graph', async (state: CodeStateType, runtime: Runtime) => {
        if (state.switch_command && state.switch_command in switchBranch) {
            return switchBranch[state.switch_command as 'summarization'](state, runtime);
        }
        const model = await initChatModel(state.main_model, {
            modelProvider: process.env.MODEL_PROVIDER || 'openai',
            streamUsage: true,
        });
        // const model = new ChatOpenAI({
        //     model: state.main_model,
        // });

        // Create MCP middleware with servers
        const mcpMiddleware = await MCPMiddleware(state.mcp_config as any);

        const allTools = [
            // exit_plan_mode_tool,

            ask_user_with_options,

            todo_write_tool,
            glob_tool,
            grep_tool,

            read_tool,
            write_tool,
            replace_tool,
            ...bash_tools,
        ];
        const subagents = new SubAgentsMiddleware();
        subagents.addSubAgents('finder', create_finder);

        const agent = createAgent({
            model,
            systemPrompt: await getSystemPrompt(state),
            tools: [...allTools],
            stateSchema: CodeState,
            middleware: [
                // summarizationMiddleware({
                //     model,
                //     trigger: { tokens: 120_000 },
                //     keep: { messages: 100 },
                // }),
                subagents,
                // MemoryMiddleware(model),
                new AgentsMdMiddleware(),
                new SkillsMiddleware({
                    projectSkillsDir: './.claude/skills',
                }),
                new MemoriesMiddleware({
                    projectMemoriesDir: './.claude/memories',
                }),
                mcpMiddleware,
                humanInTheLoopMiddleware({
                    interruptOn: {
                        terminal: {
                            allowedDecisions: ['approve', 'reject', 'edit'],
                        },
                        ...ask_user_with_options_config.interruptOn,
                    },
                }),
                /** @ts-ignore */
                process.env.MODEL_PROVIDER === 'anthropic' && anthropicPromptCachingMiddleware(),
            ],
        });

        const response = await agent.invoke(state as any, { recursionLimit: 200 });

        return {
            task_store: response.task_store,
            messages: response.messages,
        };
    })
    .addEdge(START, 'graph')
    .compile();
