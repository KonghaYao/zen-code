/**
 * Tasks Store - 任务管理 Store 集成层
 * 封装 TaskStoreManager，提供 React 友好的 API
 */

import { TaskStoreManager } from '@codegraph/config';
import { TaskNode, TaskStatus } from '@codegraph/config';

class TasksStore {
    private store: TaskStoreManager | null = null;
    private projectRoot: string;

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
    }

    /**
     * 初始化 Store
     */
    async initialize(): Promise<void> {
        if (!this.store) {
            this.store = new TaskStoreManager(this.projectRoot);
            await this.store.initialize();
        }
    }

    /**
     * 确保 Store 已初始化
     */
    private ensureInitialized(): void {
        if (!this.store) {
            throw new Error('TasksStore not initialized. Call initialize() first.');
        }
    }

    /**
     * 获取所有任务
     */
    async getAllTasks(): Promise<TaskNode[]> {
        this.ensureInitialized();
        return await this.store!.getAllTasks();
    }

    /**
     * 根据 status 获取任务
     */
    async getTasksByStatus(status: TaskStatus): Promise<TaskNode[]> {
        this.ensureInitialized();
        return await this.store!.getTasksByStatus(status);
    }

    /**
     * 获取单个任务
     */
    async getTask(taskId: string): Promise<TaskNode | undefined> {
        this.ensureInitialized();
        return await this.store!.getTask(taskId);
    }

    /**
     * 更新任务状态
     */
    async updateTaskStatus(taskId: string, status: TaskStatus): Promise<boolean> {
        this.ensureInitialized();
        return await this.store!.updateTask(taskId, { status });
    }

    /**
     * 删除任务
     */
    async deleteTask(taskId: string): Promise<boolean> {
        this.ensureInitialized();
        return await this.store!.deleteTask(taskId);
    }

    /**
     * 批量添加任务
     */
    async addTasks(tasks: TaskNode[]): Promise<void> {
        this.ensureInitialized();
        await this.store!.addTasks(tasks);
    }

    /**
     * 获取活跃 Plan ID
     */
    async getActivePlan(): Promise<string | undefined> {
        this.ensureInitialized();
        return await this.store!.getActivePlan();
    }

    /**
     * 设置活跃 Plan ID
     */
    async setActivePlan(planId: string): Promise<void> {
        this.ensureInitialized();
        await this.store!.setActivePlan(planId);
    }

    /**
     * 获取任务统计
     */
    async getTaskStats(): Promise<{
        total: number;
        pickup: number;
        running: number;
        complete: number;
        error: number;
        review: number;
        feedback: number;
    }> {
        const allTasks = await this.getAllTasks();

        return {
            total: allTasks.length,
            pickup: allTasks.filter(t => t.status === 'pickup').length,
            running: allTasks.filter(t => t.status === 'running').length,
            complete: allTasks.filter(t => t.status === 'complete').length,
            error: allTasks.filter(t => t.status === 'error').length,
            review: allTasks.filter(t => t.status === 'review').length,
            feedback: allTasks.filter(t => t.status === 'feedback').length,
        };
    }

    /**
     * 获取执行历史
     */
    async getHistory(planId?: string) {
        this.ensureInitialized();
        return await this.store!.getHistory(planId);
    }

    /**
     * 清空所有任务（慎用）
     */
    async clearAllTasks(): Promise<void> {
        this.ensureInitialized();
        await this.store!.clearAllTasks();
    }
}

// 单例实例
let tasksStoreInstance: TasksStore | null = null;

/**
 * 获取 TasksStore 单例
 */
export function getTasksStore(projectRoot?: string): TasksStore {
    if (!tasksStoreInstance) {
        if (!projectRoot) {
            throw new Error('projectRoot is required for first initialization');
        }
        tasksStoreInstance = new TasksStore(projectRoot);
    }
    return tasksStoreInstance;
}

/**
 * 重置 TasksStore（主要用于测试）
 */
export function resetTasksStore(): void {
    tasksStoreInstance = null;
}

// 导出类型
export type { TasksStore };
