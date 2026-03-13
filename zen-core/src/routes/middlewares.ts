/**
 * Middlewares Router
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// Schema 定义
export const MiddlewareInputSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().min(1),
    parameters: z.record(z.string(), z.any()).optional(),
});

export const UpdateMiddlewareSchema = MiddlewareInputSchema.partial().extend({
    id: z.string(),
});

// ========================================
// Router
// ========================================

export const middlewaresRouter = router({
    // 列出所有 Middlewares
    list: publicProcedure.query(async ({ ctx }) => {
        const middlewares = await ctx.agentPackage.storage.getAllMiddlewares();
        return middlewares;
    }),

    // 获取单个 Middleware
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const middleware = await ctx.agentPackage.storage.getMiddleware(input.id);
        if (!middleware) {
            handleNotFound('Middleware', input.id);
        }
        return middleware;
    }),

    // 创建 Middleware
    create: publicProcedure.input(MiddlewareInputSchema).mutation(async ({ ctx, input }) => {
        await ctx.agentPackage.storage.insertMiddleware(input);
        return { id: input.id };
    }),

    // 更新 Middleware
    update: publicProcedure.input(UpdateMiddlewareSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.agentPackage.storage.getMiddleware(input.id);
        if (!existing) {
            handleNotFound('Middleware', input.id);
        }

        const updateData = { ...existing, ...input } as any;
        await ctx.agentPackage.storage.updateMiddleware(updateData);
        return { id: input.id };
    }),

    // 删除 Middleware
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        await ctx.agentPackage.storage.deleteMiddleware(input.id);
        return { id: input.id };
    }),

    // 批量创建 Middlewares
    createMany: publicProcedure.input(z.array(MiddlewareInputSchema)).mutation(async ({ ctx, input }) => {
        await Promise.all(input.map((data) => ctx.agentPackage.storage.insertMiddleware(data)));
        return { count: input.length, ids: input.map((m) => m.id) };
    }),
});
