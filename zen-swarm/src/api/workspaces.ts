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
import { WorkspaceStorage } from '../config/workspace-storage.js';

// ========================================
// 配置
// ========================================

// Workspace storage 实例
let workspaceStorage: WorkspaceStorage | null = null;
let initializationPromise: Promise<void> | null = null;

async function getStorage(): Promise<WorkspaceStorage> {
    if (!workspaceStorage) {
        workspaceStorage = new WorkspaceStorage('./data/index.db');
        initializationPromise = workspaceStorage.initialize();
    }

    // Ensure initialization is complete before returning
    if (initializationPromise) {
        await initializationPromise;
    }

    return workspaceStorage;
}

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
    getAll: publicProcedure.query(async () => {
        const storage = await getStorage();
        const workspaces = await storage.getAllWorkspaces();
        return { workspaces };
    }),

    // 获取单个 Workspace
    getById: publicProcedure.input(GetWorkspaceInputSchema).query(async ({ input }) => {
        const storage = await getStorage();
        const workspace = await storage.getWorkspaceById(input.id);

        if (!workspace) {
            handleNotFound('Workspace', input.id);
        }

        return { workspace };
    }),

    // 创建 Workspace
    create: publicProcedure.input(CreateWorkspaceInputSchema).mutation(async ({ input }) => {
        const storage = await getStorage();

        // 验证路径
        const pathValidation = await storage.validatePath(input.rootPath);
        if (!pathValidation.valid) {
            handleBadRequest(`Invalid path: ${pathValidation.error}`);
        }

        const workspace = await storage.createWorkspace({
            name: input.name,
            rootPath: input.rootPath,
            description: input.description,
        });

        return { workspace };
    }),

    // 更新 Workspace
    update: publicProcedure.input(UpdateWorkspaceInputSchema).mutation(async ({ input }) => {
        const storage = await getStorage();

        const existing = await storage.getWorkspaceById(input.id);
        if (!existing) {
            handleNotFound('Workspace', input.id);
        }

        const workspace = await storage.updateWorkspace({
            id: input.id,
            name: input.name,
            description: input.description,
        });

        return { workspace };
    }),

    // 删除 Workspace
    delete: publicProcedure.input(DeleteWorkspaceInputSchema).mutation(async ({ input }) => {
        const storage = await getStorage();

        const existing = await storage.getWorkspaceById(input.id);
        if (!existing) {
            handleNotFound('Workspace', input.id);
        }

        await storage.deleteWorkspace(input.id);

        return { id: input.id, success: true };
    }),

    // 验证路径
    validatePath: publicProcedure.input(ValidatePathInputSchema).query(async ({ input }) => {
        const storage = await getStorage();
        const result = await storage.validatePath(input.path);
        return result;
    }),
});
