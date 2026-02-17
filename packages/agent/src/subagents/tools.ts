import { Tool } from 'langchain';
import { bash_tools } from '../tools/bash_tools/index.js';
import {
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    folder_tool,
} from '../tools/filesystem_tools/index.js';
import { todo_write_tool } from '../tools/task_tools/index.js';
import { ask_user_questions_tool } from '../tools/ask_user_questions.js';
import { AgentPackage, ToolImplementation } from '@langgraph-js/standard-agent';
import { z } from 'zod';

// All available tools
const ALL_TOOLS = [
    ask_user_questions_tool,
    todo_write_tool,
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    folder_tool,
    ...bash_tools,
];

async function registerLangChainTool(pkg: AgentPackage, tool: Tool) {
    await pkg.addTool({
        id: tool.name,
        name: tool.name,
        description: tool.description,
    });

    // Create a ToolImplementation that wraps the LangChain tool
    // We need to handle the difference between LangChain's invoke() and ToolImplementation's execute()
    const toolImpl: ToolImplementation<any, any> = {
        id: tool.name,
        name: tool.name,
        description: tool.description,
        paramsSchema: tool.schema as any,
        execute: async (params) => {
            // Call the tool's invoke method directly
            // The params should already match the schema
            const result = await tool.invoke(params);
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
    return await Promise.all(ALL_TOOLS.map((i) => registerLangChainTool(pkg, i as any as Tool)));
}
