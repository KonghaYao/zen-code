/**
 * Zen Swarm 中间件注册器
 * 注册所有中间件实现到 AgentPackage
 */

import { AgentPackage } from '@langgraph-js/standard-agent';

/**
 * 注册中间件实现到 AgentPackage
 */
export async function createMiddlewareRegistry(pkg: AgentPackage) {
    const subagents = {
        id: 'subagents',
        name: 'subagents',
        description: 'Task delegation to specialized agents',
        execute: async () => {
            const { createSubAgentsMiddleware } = await import('./subagents.js');
            return createSubAgentsMiddleware(pkg);
        },
    };
    const existingSubagents = await pkg.getMiddleware('subagents');
    if (!existingSubagents) {
        await pkg.addMiddleware(subagents);
    }
    pkg.middlewares.registerImplementation(subagents);

    const memories = {
        id: 'memories',
        name: 'memories',
        description: 'Knowledge persistence',
        execute: async () => {
            const { MemoriesMiddleware } = await import('./memories.js');
            return new MemoriesMiddleware();
        },
    };
    const existingMemories = await pkg.getMiddleware('memories');
    if (!existingMemories) {
        await pkg.addMiddleware(memories);
    }
    pkg.middlewares.registerImplementation(memories);

    const mcp = {
        id: 'mcp',
        name: 'mcp',
        description: 'MCP server connection and tool execution',
        execute: async () => {
            const { MCPWithConfigMiddleware } = await import('./mcp.js');
            return new MCPWithConfigMiddleware();
        },
    };
    const existingMcp = await pkg.getMiddleware('mcp');
    if (!existingMcp) {
        await pkg.addMiddleware(mcp);
    }
    pkg.middlewares.registerImplementation(mcp);

    // Filesystem and Terminal middlewares from @langgraph-js/agent-middlewares
    const filesystem = {
        id: 'filesystem',
        name: 'filesystem',
        description: 'Filesystem operations (read, write, search, folder)',
        execute: async () => {
            const { FilesystemMiddleware } = await import('@langgraph-js/agent-middlewares');
            return new FilesystemMiddleware();
        },
    };
    const existingFilesystem = await pkg.getMiddleware('filesystem');
    if (!existingFilesystem) {
        await pkg.addMiddleware(filesystem);
    }
    pkg.middlewares.registerImplementation(filesystem);

    const terminal = {
        id: 'terminal',
        name: 'terminal',
        description: 'Terminal command execution with background process management',
        execute: async () => {
            const { TerminalMiddleware } = await import('@langgraph-js/agent-middlewares');
            return new TerminalMiddleware();
        },
    };
    const existingTerminal = await pkg.getMiddleware('terminal');
    if (!existingTerminal) {
        await pkg.addMiddleware(terminal);
    }
    pkg.middlewares.registerImplementation(terminal);
}
