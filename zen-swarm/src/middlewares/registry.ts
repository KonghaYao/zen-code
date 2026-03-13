/**
 * Zen Swarm 中间件注册器
 * 注册所有中间件实现到 AgentPackage
 */

import { AgentPackage } from '@langgraph-js/standard-agent';
import type { StateMachineManager } from './sm/index.js';
/**
 * 中间件注册选项
 */
export interface MiddlewareRegistryOptions {
    stateMachineManager?: StateMachineManager;
}

/**
 * 注册中间件实现到 AgentPackage
 */
export async function createMiddlewareRegistry(pkg: AgentPackage, options?: MiddlewareRegistryOptions) {
    const { stateMachineManager } = options || {};
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

    const interactive = {
        id: 'interactive',
        name: 'interactive',
        description: 'User interaction for approval and input',
        execute: async () => {
            const { InteractiveMiddleware } = await import('../middlewares/interactive.js');
            return InteractiveMiddleware;
        },
    };
    await pkg.addMiddleware(interactive);
    pkg.middlewares.registerImplementation(interactive);

    const task = {
        id: 'task',
        name: 'task',
        description: 'Task management for todo lists',
        execute: async () => {
            const { taskMiddleware } = await import('../middlewares/task.js');
            return taskMiddleware;
        },
    };
    await pkg.addMiddleware(task);
    pkg.middlewares.registerImplementation(task);
    const skills = {
        id: 'skills',
        name: 'skills',
        description: 'Progressive skills disclosure',
        execute: async (context: { skillsDir?: string; assistantId?: string; projectSkillsDir?: string }) => {
            // Set default paths for skills directories
            context.projectSkillsDir = context.projectSkillsDir || './.claude/skills';
            // User skills directory path: ~/.claude/skills/
            if (!context.skillsDir) {
                const os = await import('os');
                const path = await import('path');
                context.skillsDir = path.join(os.homedir(), '.claude', 'skills');
            }
            const { SkillsMiddleware } = await import('@langgraph-js/standard-agent');
            return new SkillsMiddleware(context);
        },
    };
    await pkg.addMiddleware(skills);
    pkg.middlewares.registerImplementation(skills);
}
