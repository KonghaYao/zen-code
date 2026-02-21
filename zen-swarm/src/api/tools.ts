/**
 * Tools Router
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// Schema 定义
export const ToolInputSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().min(1),
    parameters: z.record(z.string(), z.any()).optional(),
});

export const UpdateToolSchema = ToolInputSchema.partial().extend({
    id: z.string(),
});

// ========================================
// Router
// ========================================

export const toolsRouter = router({
    // 列出所有 Tools
    list: publicProcedure.query(async ({ ctx }) => {
        const tools = await ctx.agentPackage.storage.getAllTools();
        return tools;
    }),

    // 获取单个 Tool
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const tool = await ctx.agentPackage.storage.getTool(input.id);
        if (!tool) {
            handleNotFound('Tool', input.id);
        }
        return tool;
    }),

    // 创建 Tool
    create: publicProcedure.input(ToolInputSchema).mutation(async ({ ctx, input }) => {
        await ctx.agentPackage.storage.insertTool(input);
        return { id: input.id };
    }),

    // 更新 Tool
    update: publicProcedure.input(UpdateToolSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.agentPackage.storage.getTool(input.id);
        if (!existing) {
            handleNotFound('Tool', input.id);
        }

        const updateData = { ...existing, ...input } as any;
        await ctx.agentPackage.storage.updateTool(updateData);
        return { id: input.id };
    }),

    // 删除 Tool
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        await ctx.agentPackage.storage.deleteTool(input.id);
        return { id: input.id };
    }),

    // 批量创建 Tools
    createMany: publicProcedure.input(z.array(ToolInputSchema)).mutation(async ({ ctx, input }) => {
        await Promise.all(input.map((data) => ctx.agentPackage.storage.insertTool(data)));
        return { count: input.length, ids: input.map((t) => t.id) };
    }),
});
