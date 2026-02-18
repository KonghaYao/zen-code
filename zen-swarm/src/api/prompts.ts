/**
 * Prompts Router
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound, handleConflict } from './trpc.js';

// Schema 定义
export const PromptInputSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    content: z.string().min(1),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdatePromptSchema = PromptInputSchema.partial().extend({
    id: z.string(),
});

// ========================================
// Router
// ========================================

export const promptsRouter = router({
    // 列出所有 Prompts
    list: publicProcedure.query(async ({ ctx }) => {
        const prompts = await ctx.agentPackage.storage.getAllPrompts();
        // 转换 metadata JSON 字符串为对象
        return prompts.map((p) => ({
            ...p,
            metadata: p.metadata ? JSON.parse(p.metadata) : undefined,
        }));
    }),

    // 获取单个 Prompt
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const prompt = await ctx.agentPackage.storage.getPrompt(input.id);
        if (!prompt) {
            handleNotFound('Prompt', input.id);
        }
        return {
            ...prompt,
            metadata: prompt!.metadata ? JSON.parse(prompt!.metadata) : undefined,
        };
    }),

    // 按名称获取 Prompt
    getByName: publicProcedure.input(z.object({ name: z.string() })).query(async ({ ctx, input }) => {
        const prompt = await ctx.agentPackage.storage.getPromptByName(input.name);
        if (!prompt) {
            handleNotFound('Prompt', input.name);
        }
        return {
            ...prompt,
            metadata: prompt!.metadata ? JSON.parse(prompt!.metadata) : undefined,
        };
    }),

    // 创建 Prompt
    create: publicProcedure.input(PromptInputSchema).mutation(async ({ ctx, input }) => {
        try {
            await ctx.agentPackage.storage.insertPrompt(input);
        } catch (error) {
            if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
                handleConflict(`Prompt with name '${input.name}' already exists`);
            }
            throw error;
        }
        return { id: input.id };
    }),

    // 更新 Prompt
    update: publicProcedure.input(UpdatePromptSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.agentPackage.storage.getPrompt(input.id);
        if (!existing) {
            handleNotFound('Prompt', input.id);
        }

        const updateData = { ...existing, ...input } as any;
        try {
            await ctx.agentPackage.storage.updatePrompt(updateData);
        } catch (error) {
            if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
                handleConflict(`Prompt with name '${input.name}' already exists`);
            }
            throw error;
        }
        return { id: input.id };
    }),

    // 删除 Prompt
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        try {
            await ctx.agentPackage.storage.deletePrompt(input.id);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Cannot delete prompt')) {
                throw new Error(error.message);
            }
            throw error;
        }
        return { id: input.id };
    }),

    // 批量创建 Prompts
    createMany: publicProcedure.input(z.array(PromptInputSchema)).mutation(async ({ ctx, input }) => {
        await Promise.all(input.map((data) => ctx.agentPackage.storage.insertPrompt(data)));
        return { count: input.length, ids: input.map((p) => p.id) };
    }),
});
