/**
 * Models Router
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// Schema 定义
export const ModelInputSchema = z.object({
    id: z.string(),
    model_name: z.string(),
    model_provider: z.string(),
    stream_usage: z.boolean().default(false),
    enable_thinking: z.boolean().default(false),
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().positive().default(4096),
    top_p: z.number().min(0).max(1).default(1.0),
    frequency_penalty: z.number().min(-2).max(2).default(0.0),
    presence_penalty: z.number().min(-2).max(2).default(0.0),
});

export const UpdateModelSchema = ModelInputSchema.partial().extend({
    id: z.string(),
});

// ========================================
// Router
// ========================================

export const modelsRouter = router({
    // 列出所有 Models
    list: publicProcedure.query(async ({ ctx }) => {
        const models = await ctx.agentPackage.storage.getAllModels();
        // 转换布尔值
        return models.map((m) => ({
            ...m,
            stream_usage: Boolean(m.stream_usage),
            enable_thinking: Boolean(m.enable_thinking),
        }));
    }),

    // 获取单个 Model
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const model = await ctx.agentPackage.storage.getModel(input.id);
        if (!model) {
            handleNotFound('Model', input.id);
        }
        return {
            ...model,
            stream_usage: Boolean(model!.stream_usage),
            enable_thinking: Boolean(model!.enable_thinking),
        };
    }),

    // 创建 Model
    create: publicProcedure.input(ModelInputSchema).mutation(async ({ ctx, input }) => {
        await ctx.agentPackage.storage.insertModel(input);
        return { id: input.id };
    }),

    // 更新 Model
    update: publicProcedure.input(UpdateModelSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.agentPackage.storage.getModel(input.id);
        if (!existing) {
            handleNotFound('Model', input.id);
        }

        const updateData = { ...existing, ...input } as any;
        await ctx.agentPackage.storage.updateModel(updateData);
        return { id: input.id };
    }),

    // 删除 Model
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        try {
            await ctx.agentPackage.storage.deleteModel(input.id);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Cannot delete model')) {
                throw new Error(error.message);
            }
            throw error;
        }
        return { id: input.id };
    }),

    // 批量创建 Models
    createMany: publicProcedure.input(z.array(ModelInputSchema)).mutation(async ({ ctx, input }) => {
        await Promise.all(input.map((data) => ctx.agentPackage.storage.insertModel(data)));
        return { count: input.length, ids: input.map((m) => m.id) };
    }),
});
