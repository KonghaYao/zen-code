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
    change_note: z.string().optional(),
});

export const UpdatePromptSchema = PromptInputSchema.partial().extend({
    id: z.string(),
});

export const CreateVersionSchema = z.object({
    promptId: z.string(),
    content: z.string().min(1),
    changeNote: z.string().optional(),
});

// ========================================
// Router
// ========================================

export const promptsRouter = router({
    // 列出所有 Prompts (with current version content)
    list: publicProcedure.query(async ({ ctx }) => {
        const prompts = await ctx.mergedStorage.getAllPromptsWithCurrentVersion();
        return prompts.map((p) => ({
            id: p.id,
            name: p.name,
            current_version: p.current_version,
            content: p.content,
            change_note: p.change_note,
            created_at: p.created_at,
            updated_at: p.updated_at,
            metadata: p.metadata ? JSON.parse(p.metadata) : undefined,
        }));
    }),

    // 获取单个 Prompt
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const prompt = await ctx.mergedStorage.getPromptWithCurrentVersion(input.id);
        if (!prompt) {
            handleNotFound('Prompt', input.id);
        }
        return {
            id: prompt!.id,
            name: prompt!.name,
            current_version: prompt!.current_version,
            content: prompt!.content,
            change_note: prompt!.change_note,
            created_at: prompt!.created_at,
            updated_at: prompt!.updated_at,
            metadata: prompt!.metadata ? JSON.parse(prompt!.metadata) : undefined,
        };
    }),

    // 按名称获取 Prompt
    getByName: publicProcedure.input(z.object({ name: z.string() })).query(async ({ ctx, input }) => {
        const prompt = await ctx.mergedStorage.getPromptWithCurrentVersionByName(input.name);
        if (!prompt) {
            handleNotFound('Prompt', input.name);
        }
        return {
            id: prompt!.id,
            name: prompt!.name,
            current_version: prompt!.current_version,
            content: prompt!.content,
            change_note: prompt!.change_note,
            created_at: prompt!.created_at,
            updated_at: prompt!.updated_at,
            metadata: prompt!.metadata ? JSON.parse(prompt!.metadata) : undefined,
        };
    }),

    // 创建 Prompt
    create: publicProcedure.input(PromptInputSchema).mutation(async ({ ctx, input }) => {
        try {
            await ctx.mergedStorage.insertPrompt(input, input.content, input.change_note);
        } catch (error) {
            if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
                handleConflict(`Prompt with name '${input.name}' already exists`);
            }
            throw error;
        }
        return { id: input.id };
    }),

    // 更新 Prompt（仅元数据，内容更新使用 createVersion）
    update: publicProcedure.input(UpdatePromptSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.mergedStorage.getPrompt(input.id);
        if (!existing) {
            handleNotFound('Prompt', input.id);
            return;
        }

        const updateData = { id: input.id, name: input.name ?? existing.name };
        try {
            await ctx.mergedStorage.updatePrompt(updateData);
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
            await ctx.mergedStorage.deletePrompt(input.id);
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
        await Promise.all(input.map((data) => ctx.mergedStorage.insertPrompt(data, data.content, data.change_note)));
        return { count: input.length, ids: input.map((p) => p.id) };
    }),

    // ========================================
    // Version Management
    // ========================================

    // 获取 Prompt 的所有版本
    getVersions: publicProcedure.input(z.object({ promptId: z.string() })).query(async ({ ctx, input }) => {
        const versions = await ctx.mergedStorage.getPromptVersions(input.promptId);
        return versions.map((v) => ({
            id: v.id,
            prompt_id: v.prompt_id,
            version: v.version,
            content: v.content,
            metadata: v.metadata,
            change_note: v.change_note,
            created_at: v.created_at,
        }));
    }),

    // 获取指定版本
    getVersion: publicProcedure
        .input(z.object({ promptId: z.string(), version: z.number() }))
        .query(async ({ ctx, input }) => {
            const version = await ctx.mergedStorage.getPromptVersion(input.promptId, input.version);
            if (!version) {
                handleNotFound('Prompt version', `${input.promptId}@v${input.version}`);
            }
            return {
                id: version!.id,
                prompt_id: version!.prompt_id,
                version: version!.version,
                content: version!.content,
                metadata: version!.metadata,
                change_note: version!.change_note,
                created_at: version!.created_at,
            };
        }),

    // 创建新版本
    createVersion: publicProcedure.input(CreateVersionSchema).mutation(async ({ ctx, input }) => {
        try {
            const newVersion = await ctx.mergedStorage.createPromptVersion(
                input.promptId,
                input.content,
                input.changeNote,
            );
            return {
                id: newVersion.id,
                prompt_id: newVersion.prompt_id,
                version: newVersion.version,
                content: newVersion.content,
                change_note: newVersion.change_note,
                created_at: newVersion.created_at,
            };
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                handleNotFound('Prompt', input.promptId);
            }
            throw error;
        }
    }),

    // 回滚到指定版本
    rollbackVersion: publicProcedure
        .input(z.object({ promptId: z.string(), targetVersion: z.number() }))
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.mergedStorage.rollbackPromptVersion(input.promptId, input.targetVersion);
                const prompt = await ctx.mergedStorage.getPromptWithCurrentVersion(input.promptId);
                return {
                    id: prompt!.id,
                    name: prompt!.name,
                    current_version: prompt!.current_version,
                    content: prompt!.content,
                    change_note: prompt!.change_note,
                };
            } catch (error) {
                if (error instanceof Error && error.message.includes('not found')) {
                    handleNotFound('Prompt', input.promptId);
                }
                throw error;
            }
        }),
});
