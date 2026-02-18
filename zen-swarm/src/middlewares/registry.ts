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
}
