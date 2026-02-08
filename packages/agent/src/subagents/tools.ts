import { Tool } from 'langchain';
import { ask_user_with_options } from '@langgraph-js/auk';
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
import { AgentPackage, fromLangChainTool } from '@langgraph-js/standard-agent';

// All available tools
const ALL_TOOLS = [
    ask_user_with_options,
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
    pkg.tools.registerImplementation(
        fromLangChainTool(tool.invoke.bind(tool), {
            name: tool.name,
            description: tool.description,
            schema: tool.schema as any,
        }),
    );
}

/**
 * Create a runtime tool registry with all available tools
 */
export async function createToolRegistry(pkg: AgentPackage) {
    return await Promise.all(ALL_TOOLS.map((i) => registerLangChainTool(pkg, i as any as Tool)));
}
