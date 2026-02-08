import { AgentPackage } from '@langgraph-js/standard-agent';

/**
 * Register middleware implementations into the registry
 * This function registers all available middleware implementations
 */
export async function createMiddlewareRegistry(pkg: AgentPackage) {
    const subagents = {
        id: 'subagents',
        name: 'subagents',
        description: 'Task delegation to specialized agents',
        execute: async () => {
            const { SubAgentsMiddleware } = await import('../middlewares/subagents.js');
            return new SubAgentsMiddleware();
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
            context.projectSkillsDir = context.projectSkillsDir || './.claude/skills';
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
}
