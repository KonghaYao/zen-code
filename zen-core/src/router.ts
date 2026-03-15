/**
 * tRPC AppRouter 聚合
 *
 * 仅包含 zen-core 本地 FS 存储路由。
 * agents/prompts/middlewares/mcp/workspaces/cron 等 SQLite 路由已迁至 zen-swarm 本地处理。
 */

import { router } from './trpc.js';
import { configRouter } from './routes/config.js';
import { modelsRouter } from './routes/models.js';
import { skillsRouter } from './routes/skills.js';
import { tasksRouter } from './routes/tasks.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { processesRouter } from './routes/processes.js';

export { router, procedure } from './trpc.js';

export const appRouter = router({
    config: configRouter,
    models: modelsRouter,
    skills: skillsRouter,
    tasks: tasksRouter,
    knowledge: knowledgeRouter,
    processes: processesRouter,
});

export type AppRouter = typeof appRouter;
