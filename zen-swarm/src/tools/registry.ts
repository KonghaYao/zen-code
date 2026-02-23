/**
 * Zen Swarm 工具注册器
 * 注册所有工具到 AgentPackage
 */

import { Tool } from 'langchain';
import { AgentPackage, ToolImplementation } from '@langgraph-js/standard-agent';
import { todo_write_tool } from './task_tools/index.js';
import { ask_user_questions_tool } from './ask_user_questions.js';

// All available tools
// Note: Filesystem tools are provided by FilesystemMiddleware
// Note: Terminal tools are provided by TerminalMiddleware
const ALL_TOOLS = [ask_user_questions_tool, todo_write_tool];

async function registerLangChainTool(pkg: AgentPackage, tool: Tool) {
    // Create a ToolImplementation that wraps the LangChain tool
    const toolImpl: ToolImplementation<any, any> = {
        id: tool.name,
        name: tool.name,
        description: tool.description,
        paramsSchema: tool.schema as any,
        execute: async (params, runtime) => {
            const result = await tool.invoke(params, runtime);
            // Handle ToolMessage return type - extract content
            if (result && typeof result === 'object' && 'content' in result) {
                return (result as any).content;
            }
            return result;
        },
    };

    pkg.tools.registerImplementation(toolImpl);
}

/**
 * Create a runtime tool registry with all available tools
 */
export async function createToolRegistry(pkg: AgentPackage) {
    for (const tool of ALL_TOOLS) {
        // Persist metadata to database if not exists
        const existing = await pkg.getTool(tool.name);
        if (!existing) {
            await pkg.addTool({
                id: tool.name,
                name: tool.name,
                description: tool.description,
            });
        }

        // Register runtime implementation
        await registerLangChainTool(pkg, tool as any as Tool);
    }
}
