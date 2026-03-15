/**
 * tRPC AppRouter 聚合
 */

import { router } from './trpc.js';
import { configRouter } from './routes/config.js';
import { modelsRouter } from './routes/models.js';
import { skillsRouter } from './routes/skills.js';
import { tasksRouter } from './routes/tasks.js';
import { agentsRouter } from './routes/agents.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { processesRouter } from './routes/processes.js';
// zen-swarm 迁入路由
import { mcpRouter } from './routes/mcp.js';
import { workspacesRouter } from './routes/workspaces.js';
import { cronRouter } from './routes/cron.js';
import { promptsRouter } from './routes/prompts.js';
import { middlewaresRouter } from './routes/middlewares.js';

export { router, procedure } from './trpc.js';

export const appRouter = router({
    config: configRouter,
    models: modelsRouter,
    skills: skillsRouter,
    tasks: tasksRouter,
    agents: agentsRouter,
    knowledge: knowledgeRouter,
    processes: processesRouter,
    // zen-swarm 迁入路由
    mcp: mcpRouter,
    workspaces: workspacesRouter,
    cron: cronRouter,
    prompts: promptsRouter,
    middlewares: middlewaresRouter,
});

export type AppRouter = typeof appRouter;
