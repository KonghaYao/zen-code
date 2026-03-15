/**
 * Workspaces Router - Workspace 管理 API
 *
 * 提供 Workspace 的 CRUD 操作：
 * - 创建/删除/更新 Workspace
 * - 查询 Workspace 列表和单个 Workspace
 * - 验证路径有效性
 */

import { z } from 'zod';
import { router, publicProcedure, handleBadRequest, handleNotFound } from './trpc.js';

// ========================================
// Schema 定义
// ========================================

const CreateWorkspaceInputSchema = z.object({
    name: z.string().min(1, 'Workspace name is required'),
    rootPath: z.string().min(1, 'Root path is required'),
    description: z.string().optional(),
});

const UpdateWorkspaceInputSchema = z.object({
    id: z.string().min(1, 'Workspace ID is required'),
    name: z.string().min(1, 'Workspace name is required').optional(),
    description: z.string().optional(),
});

const DeleteWorkspaceInputSchema = z.object({
    id: z.string().min(1, 'Workspace ID is required'),
});

const GetWorkspaceInputSchema = z.object({
    id: z.string().min(1, 'Workspace ID is required'),
});

const ValidatePathInputSchema = z.object({
    path: z.string().min(1, 'Path is required'),
});

// ========================================
// Router
// ========================================

export const workspacesRouter = router({
    // 获取所有 Workspace（按最后访问时间排序）
    getAll: publicProcedure.query(async ({ ctx }) => {
        const workspaces = await ctx.workspaceStorage.getAllWorkspaces();
        return { workspaces };
    }),

    // 获取单个 Workspace
    getById: publicProcedure.input(GetWorkspaceInputSchema).query(async ({ ctx, input }) => {
        const workspace = await ctx.workspaceStorage.getWorkspaceById(input.id);

        if (!workspace) {
            handleNotFound('Workspace', input.id);
        }

        return { workspace };
    }),

    // 创建 Workspace
    create: publicProcedure.input(CreateWorkspaceInputSchema).mutation(async ({ ctx, input }) => {
        const pathValidation = await ctx.workspaceStorage.validatePath(input.rootPath);
        if (!pathValidation.valid) {
            handleBadRequest(`Invalid path: ${pathValidation.error}`);
        }

        const workspace = await ctx.workspaceStorage.createWorkspace({
            name: input.name,
            rootPath: input.rootPath,
            description: input.description,
        });

        return { workspace };
    }),

    // 更新 Workspace
    update: publicProcedure.input(UpdateWorkspaceInputSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.workspaceStorage.getWorkspaceById(input.id);
        if (!existing) {
            handleNotFound('Workspace', input.id);
        }

        const workspace = await ctx.workspaceStorage.updateWorkspace({
            id: input.id,
            name: input.name,
            description: input.description,
        });

        return { workspace };
    }),

    // 删除 Workspace
    delete: publicProcedure.input(DeleteWorkspaceInputSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.workspaceStorage.getWorkspaceById(input.id);
        if (!existing) {
            handleNotFound('Workspace', input.id);
        }

        await ctx.workspaceStorage.deleteWorkspace(input.id);

        return { id: input.id, success: true };
    }),

    // 更新 Workspace 最近访问时间（切换 workspace 时调用）
    touch: publicProcedure
        .input(z.object({ id: z.string().min(1, 'Workspace ID is required') }))
        .mutation(async ({ ctx, input }) => {
            await ctx.workspaceStorage.touchWorkspace(input.id);
            return { id: input.id, success: true };
        }),

    // 验证路径
    validatePath: publicProcedure.input(ValidatePathInputSchema).query(async ({ ctx, input }) => {
        const result = await ctx.workspaceStorage.validatePath(input.path);
        return result;
    }),
});
