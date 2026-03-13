/**
 * tasks 路由 - 对应 useTasks
 * 通过 TaskStoreManager 读写任务数据
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';
import { TaskStoreManager } from '@codegraph/config';

export const tasksRouter = router({
    list: procedure
        .input(
            z
                .object({
                    filter: z.string().optional(),
                    cwd: z.string().optional(),
                })
                .optional(),
        )
        .query(async ({ input }) => {
            const cwd = input?.cwd || process.cwd();
            const store = new TaskStoreManager(cwd);
            await store.initialize();

            if (input?.filter) {
                return await store.getTasksByStatus(input.filter as any);
            }
            return await store.getAllTasks();
        }),

    get: procedure.input(z.object({ id: z.string(), cwd: z.string().optional() })).query(async ({ input }) => {
        const cwd = input.cwd || process.cwd();
        const store = new TaskStoreManager(cwd);
        await store.initialize();
        return await store.getTask(input.id);
    }),

    updateStatus: procedure
        .input(z.object({ id: z.string(), status: z.string(), cwd: z.string().optional() }))
        .mutation(async ({ input }) => {
            const cwd = input.cwd || process.cwd();
            const store = new TaskStoreManager(cwd);
            await store.initialize();
            return await store.updateTask(input.id, { status: input.status as any });
        }),

    delete: procedure.input(z.object({ id: z.string(), cwd: z.string().optional() })).mutation(async ({ input }) => {
        const cwd = input.cwd || process.cwd();
        const store = new TaskStoreManager(cwd);
        await store.initialize();
        return await store.deleteTask(input.id);
    }),
});
