/**
 * Models Router
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// Schema 定义
export const ModelInputSchema = z.object({
    id: z.string(),
    name: z.string().optional().describe('Display name for the model'),
    provider_id: z.string().describe('Foreign key reference to provider'),
    model_name: z.string().describe('Actual model ID to use'),
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
    // 列出所有 Models（包含 Provider 信息）
    list: publicProcedure.query(async ({ ctx }) => {
        const models = await ctx.agentPackage.storage.getAllModels();
        const providers = await ctx.providerStorage.getAll();

        // 转换布尔值并附加 provider 信息
        return models.map((m) => ({
            ...m,
            stream_usage: Boolean(m.stream_usage),
            enable_thinking: Boolean(m.enable_thinking),
            provider: providers.find((p) => p.id === m.provider_id) || null,
        }));
    }),

    // 获取单个 Model（包含 Provider 信息）
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const model = await ctx.agentPackage.storage.getModel(input.id);
        if (!model) {
            handleNotFound('Model', input.id);
        }

        const provider = await ctx.providerStorage.getById(model!.provider_id);
        return {
            ...model,
            stream_usage: Boolean(model!.stream_usage),
            enable_thinking: Boolean(model!.enable_thinking),
            provider: provider || null,
        };
    }),

    // 创建 Model（验证 Provider 存在）
    create: publicProcedure.input(ModelInputSchema).mutation(async ({ ctx, input }) => {
        // 验证 Provider 存在
        const provider = await ctx.providerStorage.getById(input.provider_id);
        if (!provider) {
            throw new Error(`Provider "${input.provider_id}" not found`);
        }

        await ctx.agentPackage.storage.insertModel(input);
        return { id: input.id };
    }),

    // 更新 Model
    update: publicProcedure.input(UpdateModelSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.agentPackage.storage.getModel(input.id);
        if (!existing) {
            handleNotFound('Model', input.id);
        }

        // 如果更新 provider_id，验证 Provider 存在
        if (input.provider_id) {
            const provider = await ctx.providerStorage.getById(input.provider_id);
            if (!provider) {
                throw new Error(`Provider "${input.provider_id}" not found`);
            }
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

    // 按 Provider 分组列出 Models
    listByProvider: publicProcedure.query(async ({ ctx }) => {
        const models = await ctx.agentPackage.storage.getAllModels();
        const providers = await ctx.providerStorage.getAll();

        const grouped: Record<string, { provider: any; models: any[] }> = {};

        for (const provider of providers) {
            grouped[provider.id] = {
                provider,
                models: models
                    .filter((m) => m.provider_id === provider.id)
                    .map((m) => ({
                        ...m,
                        stream_usage: Boolean(m.stream_usage),
                        enable_thinking: Boolean(m.enable_thinking),
                    })),
            };
        }

        return grouped;
    }),

    // 批量创建 Models
    createMany: publicProcedure.input(z.array(ModelInputSchema)).mutation(async ({ ctx, input }) => {
        // 验证所有 provider_id 都存在
        const providerIds = [...new Set(input.map((m) => m.provider_id))];
        for (const providerId of providerIds) {
            const provider = await ctx.providerStorage.getById(providerId);
            if (!provider) {
                throw new Error(`Provider "${providerId}" not found`);
            }
        }

        await Promise.all(input.map((data) => ctx.agentPackage.storage.insertModel(data)));
        return { count: input.length, ids: input.map((m) => m.id) };
    }),
});
