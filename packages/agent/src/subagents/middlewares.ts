import { AgentPackage } from '@langgraph-js/standard-agent';
import { FilesystemMiddleware, TerminalMiddleware } from '@langgraph-js/agent-middlewares';

/**
 * Register middleware implementations into the registry
 * This function registers all available middleware implementations
 */
export async function createMiddlewareRegistry(pkg: AgentPackage) {
    // FilesystemMiddleware from agent-middlewares
    const filesystem = {
        id: 'filesystem',
        name: 'filesystem',
        description: 'File and directory operations (read, write, search, glob)',
        execute: async () => {
            return new FilesystemMiddleware();
        },
    };
    await pkg.addMiddleware(filesystem);
    pkg.middlewares.registerImplementation(filesystem);

    // TerminalMiddleware from agent-middlewares
    const terminal = {
        id: 'terminal',
        name: 'terminal',
        description: 'Terminal command execution (Bash/CMD, background processes)',
        execute: async () => {
            return new TerminalMiddleware();
        },
    };
    await pkg.addMiddleware(terminal);
    pkg.middlewares.registerImplementation(terminal);
    const subagents = {
        id: 'subagents',
        name: 'subagents',
        description: 'Task delegation to specialized agents',
        execute: async () => {
            // Dynamic import to avoid circular dependency
            const { createSubAgentsMiddleware } = await import('../middlewares/subTasks.js');
            // createSubAgentsMiddleware is now async
            return await createSubAgentsMiddleware(pkg);
        },
    };
    await pkg.addMiddleware(subagents);
    pkg.middlewares.registerImplementation(subagents);

    const memories = {
        id: 'memories',
        name: 'memories',
        description: 'Knowledge persistence',
        execute: async (context: { memoriesDir?: string; assistantId?: string; projectMemoriesDir?: string }) => {
            context.projectMemoriesDir = context.projectMemoriesDir || './.claude/memories';
            const { MemoriesMiddleware } = await import('../middlewares/memories.js');
            return new MemoriesMiddleware(context);
        },
    };
    await pkg.addMiddleware(memories);
    pkg.middlewares.registerImplementation(memories);

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

    const agents_md = {
        id: 'agents_md',
        name: 'agents_md',
        description: 'Inject agent documentation',
        execute: async (context: { projectRoot?: string }) => {
            const { AgentsMdMiddleware } = await import('@langgraph-js/standard-agent');
            return new AgentsMdMiddleware({ projectRoot: context?.projectRoot });
        },
    };
    await pkg.addMiddleware(agents_md);
    pkg.middlewares.registerImplementation(agents_md);

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
}
