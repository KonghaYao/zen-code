/**
 * tRPC AppRouter 聚合
 */

import { router } from './trpc.js';
import { configRouter } from './routes/config.js';
import { modelsRouter } from './routes/models.js';
import { skillsRouter } from './routes/skills.js';
import { tasksRouter } from './routes/tasks.js';
import { historyRouter } from './routes/history.js';
import { agentsRouter } from './routes/agents.js';
import { providersRouter } from './routes/providers.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { processesRouter } from './routes/processes.js';

export { router, procedure } from './trpc.js';

export const appRouter = router({
    config: configRouter,
    models: modelsRouter,
    skills: skillsRouter,
    tasks: tasksRouter,
    history: historyRouter,
    agents: agentsRouter,
    providers: providersRouter,
    knowledge: knowledgeRouter,
    processes: processesRouter,
});

export type AppRouter = typeof appRouter;
