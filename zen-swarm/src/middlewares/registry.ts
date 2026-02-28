/**
 * Zen Swarm 中间件注册器
 * 注册所有中间件实现到 AgentPackage
 */

import { AgentPackage } from '@langgraph-js/standard-agent';
import type { StateMachineManager } from './sm/index.js';
import type { CronStorage } from '../cron/storage.js';
import type { CronScheduler } from '../cron/scheduler.js';

/**
 * 中间件注册选项
 */
export interface MiddlewareRegistryOptions {
    stateMachineManager?: StateMachineManager;
    cronStorage?: CronStorage;
    cronScheduler?: CronScheduler;
}

/**
 * 注册中间件实现到 AgentPackage
 */
export async function createMiddlewareRegistry(pkg: AgentPackage, options?: MiddlewareRegistryOptions) {
    const { stateMachineManager, cronStorage, cronScheduler } = options || {};
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

    // State Machine middleware (with dependency injection)
    const sm = {
        id: 'sm',
        name: 'state-management',
        description: 'XState-based state machine management with SQLite persistence',
        execute: async () => {
            const { SMMiddleware } = await import('./sm/index.js');
            if (stateMachineManager) {
                // Use provided manager (dependency injection)
                const m = SMMiddleware.fromManager(stateMachineManager);
                await m.initialize();
                return m;
            } else {
                // Create standalone middleware
                return SMMiddleware.create();
            }
        },
    };
    const existingSm = await pkg.getMiddleware('sm');
    if (!existingSm) {
        await pkg.addMiddleware(sm);
    }
    pkg.middlewares.registerImplementation(sm);

    // Cron middleware (with dependency injection)
    const cron = {
        id: 'cron',
        name: 'cron',
        description: 'Cron task management (create, update, delete, trigger scheduled tasks)',
        execute: async () => {
            const { CronMiddleware } = await import('./cron.js');
            if (cronStorage && cronScheduler) {
                return new CronMiddleware({ storage: cronStorage, scheduler: cronScheduler });
            }
            throw new Error('CronMiddleware requires cronStorage and cronScheduler to be provided');
        },
    };
    const existingCron = await pkg.getMiddleware('cron');
    if (!existingCron) {
        await pkg.addMiddleware(cron);
    }
    pkg.middlewares.registerImplementation(cron);
}
