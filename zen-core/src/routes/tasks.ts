/**
 * tasks 路由 - 对应 useTasks
 * 通过 context 中的 TaskStoreManager 单例读写任务数据
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

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
        .query(async ({ ctx, input }) => {
            if (input?.filter) {
                return await ctx.taskStore.getTasksByStatus(input.filter as any);
            }
            return await ctx.taskStore.getAllTasks();
        }),

    get: procedure.input(z.object({ id: z.string(), cwd: z.string().optional() })).query(async ({ ctx, input }) => {
        return await ctx.taskStore.getTask(input.id);
    }),

    updateStatus: procedure
        .input(z.object({ id: z.string(), status: z.string(), cwd: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.taskStore.updateTask(input.id, { status: input.status as any });
        }),

    delete: procedure
        .input(z.object({ id: z.string(), cwd: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.taskStore.deleteTask(input.id);
        }),
});
