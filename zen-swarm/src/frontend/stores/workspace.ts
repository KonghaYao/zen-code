/**
 * Workspace Store - 使用 Zustand 进行状态管理
 * Workspace 功能的核心状态
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '../api.js';

// ========================================
// Types
// ========================================

export interface Workspace {
    id: string;
    name: string;
    rootPath: string;
    description?: string;
    createdAt: string;
    lastAccessedAt?: string;
    updatedAt: string;
}

interface CreateWorkspaceInput {
    name: string;
    rootPath: string;
    description?: string;
}

interface UpdateWorkspaceInput {
    id: string;
    name?: string;
    description?: string;
}

// ========================================
// Store 定义
// ========================================

interface WorkspaceState {
    // 当前 Workspace
    currentWorkspace: Workspace | null;

    // Workspace 列表
    workspaces: Workspace[];

    // 是否为首次启动（没有 Workspace）
    isFirstLaunch: boolean;

    // UI 状态
    showManageDialog: boolean;
    isRefreshing: boolean;
    error: string | null;

    // ========================================
    // 操作方法
    // ========================================

    // 设置当前 Workspace
    setCurrentWorkspace: (id: string) => Promise<void>;

    // 加载所有 Workspace
    loadWorkspaces: () => Promise<void>;

    // 创建 Workspace
    createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;

    // 更新 Workspace
    updateWorkspace: (input: UpdateWorkspaceInput) => Promise<void>;

    // 删除 Workspace
    deleteWorkspace: (id: string) => Promise<void>;

    // 打开管理对话框
    openManageDialog: () => void;

    // 关闭管理对话框
    closeManageDialog: () => void;

    // 刷新
    refresh: () => Promise<void>;

    // 根据 path 获取 workspace
    getWorkspaceByPath: (rootPath: string) => Workspace | undefined;

    // 清除错误
    clearError: () => void;

    // 重置
    reset: () => void;
}

// ========================================
// 初始状态
// ========================================

const initialState: Omit<
    WorkspaceState,
    | 'setCurrentWorkspace'
    | 'loadWorkspaces'
    | 'createWorkspace'
    | 'updateWorkspace'
    | 'deleteWorkspace'
    | 'openManageDialog'
    | 'closeManageDialog'
    | 'refresh'
    | 'getWorkspaceByPath'
    | 'clearError'
    | 'reset'
> = {
    currentWorkspace: null,
    workspaces: [],
    isFirstLaunch: false,
    showManageDialog: false,
    isRefreshing: false,
    error: null,
};

// ========================================
// Store 实现
// ========================================

export const useWorkspaceStore = create<WorkspaceState>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                ...initialState,

                // ========================================
                // 设置当前 Workspace
                // ========================================

                setCurrentWorkspace: async (id: string) => {
                    set({ isRefreshing: true, error: null });

                    try {
                        // 从当前列表中查找 workspace（不重新加载，避免改变顺序）
                        const workspaces = get().workspaces;
                        const workspace = workspaces.find((w) => w.id === id) ?? null;

                        if (!workspace) {
                            const message = `Workspace with id "${id}" not found`;
                            set({
                                error: message,
                                isRefreshing: false,
                            });
                            throw new Error(message);
                        }

                        set({
                            currentWorkspace: workspace,
                            isRefreshing: false,
                        });

                        // 保存到 localStorage
                        localStorage.setItem('workspace:last-id', id);

                        // 异步更新最近访问时间（fire-and-forget，不影响 UI 切换速度）
                        apiClient.workspaces.touch.mutate({ id }).catch(() => {});
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to set workspace';
                        set({
                            error: message,
                            isRefreshing: false,
                        });
                        throw error;
                    }
                },

                // ========================================
                // 加载所有 Workspace
                // ========================================

                loadWorkspaces: async () => {
                    set({ isRefreshing: true, error: null });

                    try {
                        const result = await apiClient.workspaces.getAll.query();
                        const workspaces = result.workspaces;
                        const isFirstLaunch = workspaces.length === 0;

                        // 从 localStorage 读取上次使用的 Workspace ID
                        const lastWorkspaceId = localStorage.getItem('workspace:last-id');

                        let currentWorkspace: Workspace | null = null;

                        // 如果有记录的 ID 且在列表中存在，则设置为当前
                        if (lastWorkspaceId) {
                            currentWorkspace = workspaces.find((w) => w.id === lastWorkspaceId) ?? null;
                        }

                        // 如果没有找到，则使用第一个（如果存在）
                        if (!currentWorkspace && workspaces.length > 0) {
                            currentWorkspace = workspaces[0];
                        }

                        // 如果当前 Workspace 不在列表中（可能被删除了），则使用第一个
                        const currentWorkspaceId = get().currentWorkspace?.id;
                        if (currentWorkspaceId && !workspaces.find((w) => w.id === currentWorkspaceId)) {
                            currentWorkspace = workspaces[0] ?? null;
                        }

                        set({
                            workspaces,
                            currentWorkspace,
                            isFirstLaunch,
                            isRefreshing: false,
                        });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to load workspaces';
                        set({
                            error: message,
                            isRefreshing: false,
                        });
                    }
                },

                // ========================================
                // 创建 Workspace
                // ========================================

                createWorkspace: async (input: CreateWorkspaceInput) => {
                    set({ isRefreshing: true, error: null });

                    try {
                        const result = await apiClient.workspaces.create.mutate(input);
                        const newWorkspace = result.workspace;

                        set((state) => {
                            // 如果当前没有 workspace，自动切换到新的
                            const shouldSwitch = !state.currentWorkspace;
                            return {
                                workspaces: [...state.workspaces, newWorkspace],
                                currentWorkspace: shouldSwitch ? newWorkspace : state.currentWorkspace,
                                isFirstLaunch: false,
                                isRefreshing: false,
                            };
                        });

                        // 保存到 localStorage（如果是当前 workspace）
                        if (get().currentWorkspace?.id === newWorkspace.id) {
                            localStorage.setItem('workspace:last-id', newWorkspace.id);
                        }

                        return newWorkspace;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to create workspace';
                        set({
                            error: message,
                            isRefreshing: false,
                        });
                        throw error;
                    }
                },

                // ========================================
                // 更新 Workspace
                // ========================================

                updateWorkspace: async (input: UpdateWorkspaceInput) => {
                    set({ isRefreshing: true, error: null });

                    try {
                        const result = await apiClient.workspaces.update.mutate(input);
                        const updatedWorkspace = result.workspace;

                        set((state) => ({
                            workspaces: state.workspaces.map((w) =>
                                w.id === updatedWorkspace.id ? updatedWorkspace : w,
                            ),
                            currentWorkspace:
                                state.currentWorkspace?.id === updatedWorkspace.id
                                    ? updatedWorkspace
                                    : state.currentWorkspace,
                            isRefreshing: false,
                        }));
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to update workspace';
                        set({
                            error: message,
                            isRefreshing: false,
                        });
                        throw error;
                    }
                },

                // ========================================
                // 删除 Workspace
                // ========================================

                deleteWorkspace: async (id: string) => {
                    set({ isRefreshing: true, error: null });

                    try {
                        await apiClient.workspaces.delete.mutate({ id });

                        set((state) => {
                            const remainingWorkspaces = state.workspaces.filter((w) => w.id !== id);
                            let newCurrentWorkspace = state.currentWorkspace;

                            // 如果删除的是当前 Workspace，则切换到第一个
                            if (state.currentWorkspace?.id === id) {
                                newCurrentWorkspace = remainingWorkspaces[0] ?? null;
                                // 更新 localStorage
                                if (newCurrentWorkspace) {
                                    localStorage.setItem('workspace:last-id', newCurrentWorkspace.id);
                                } else {
                                    localStorage.removeItem('workspace:last-id');
                                }
                            }

                            return {
                                workspaces: remainingWorkspaces,
                                currentWorkspace: newCurrentWorkspace,
                                isFirstLaunch: remainingWorkspaces.length === 0,
                                isRefreshing: false,
                            };
                        });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to delete workspace';
                        set({
                            error: message,
                            isRefreshing: false,
                        });
                        throw error;
                    }
                },

                // ========================================
                // 对话框操作
                // ========================================

                openManageDialog: () => set({ showManageDialog: true }),

                closeManageDialog: () => set({ showManageDialog: false }),

                // ========================================
                // 刷新
                // ========================================

                refresh: async () => {
                    await get().loadWorkspaces();
                },

                // ========================================
                // 根据 path 获取 workspace
                // ========================================

                getWorkspaceByPath: (rootPath: string) => {
                    const workspaces = get().workspaces;
                    return workspaces.find((w) => w.rootPath === rootPath);
                },

                // ========================================
                // 清除错误
                // ========================================

                clearError: () => set({ error: null }),

                // ========================================
                // 重置
                // ========================================

                reset: () => set(initialState),
            }),
            {
                name: 'workspace-storage',
                // 只持久化部分状态
                partialize: (state) => ({
                    // 不持久化任何状态，每次启动都从后端加载
                }),
            },
        ),
    ),
);

// ========================================
// 选择器 Hooks
// ========================================

export const useCurrentWorkspace = () => useWorkspaceStore((state) => state.currentWorkspace);
export const useWorkspaces = () => useWorkspaceStore((state) => state.workspaces);
export const useIsFirstLaunch = () => useWorkspaceStore((state) => state.isFirstLaunch);
export const useShowManageDialog = () => useWorkspaceStore((state) => state.showManageDialog);
export const useIsRefreshing = () => useWorkspaceStore((state) => state.isRefreshing);
export const useWorkspaceError = () => useWorkspaceStore((state) => state.error);
