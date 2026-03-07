/**
 * TaskStore - Task System 存储管理
 * 基于 fs 直接读写 JSON 的项目级持久化
 */

import path from 'path';
import fs from 'fs';
import { TaskStore, TaskNode, TaskStatus, TaskExecutionRecord } from '../types/task';

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content) as T;
    } catch {
        return fallback;
    }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export class TaskStoreManager {
    private dbPath: string;

    constructor(projectRoot: string) {
        this.dbPath = path.join(projectRoot, '.claude', 'task.json');
    }

    private getDefaultData(): TaskStore {
        return {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            tasks: {},
            history: [],
            config: {
                maxConcurrentAgents: 3,
                retryLimit: 3,
                autoResume: false,
            },
        };
    }

    /**
     * 初始化数据库
     */
    async initialize(): Promise<void> {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        if (!data) {
            await writeJson(this.dbPath, this.getDefaultData());
        }
    }

    /**
     * 获取单个任务
     */
    async getTask(taskId: string): Promise<TaskNode | undefined> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        return data.tasks[taskId];
    }

    /**
     * 更新任务
     */
    async updateTask(taskId: string, updates: Partial<TaskNode>): Promise<boolean> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());

        const task = data.tasks[taskId];
        if (!task) {
            return false;
        }

        data.tasks[taskId] = {
            ...task,
            ...updates,
        };

        if (updates.status) {
            if (updates.status === 'running' && !task.startedAt) {
                data.tasks[taskId].startedAt = new Date().toISOString();
            } else if (['complete', 'error', 'review'].includes(updates.status) && !task.completedAt) {
                data.tasks[taskId].completedAt = new Date().toISOString();
            }
        }

        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);

        return true;
    }

    /**
     * 批量添加任务（用于 Plan 初始化）
     */
    async addTasks(tasks: TaskNode[]): Promise<void> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());

        for (const task of tasks) {
            data.tasks[task.id] = task;
        }

        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);
    }

    /**
     * 根据 status 获取任务列表
     */
    async getTasksByStatus(status: TaskStatus): Promise<TaskNode[]> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        return Object.values(data.tasks).filter((t) => t.status === status);
    }

    /**
     * 获取所有任务
     */
    async getAllTasks(): Promise<TaskNode[]> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        return Object.values(data.tasks);
    }

    /**
     * 添加执行记录
     */
    async addHistory(record: TaskExecutionRecord): Promise<void> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        data.history.push(record);
        await writeJson(this.dbPath, data);
    }

    /**
     * 获取执行历史
     */
    async getHistory(planId?: string): Promise<TaskExecutionRecord[]> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        if (planId) {
            return data.history.filter((h) => h.planId === planId);
        }
        return data.history;
    }

    /**
     * 设置活跃 Plan ID
     */
    async setActivePlan(planId: string): Promise<void> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        data.activePlanId = planId;
        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);
    }

    /**
     * 获取活跃 Plan ID
     */
    async getActivePlan(): Promise<string | undefined> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        return data.activePlanId;
    }

    /**
     * 更新配置
     */
    async updateConfig(config: Partial<TaskStore['config']>): Promise<void> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        data.config = {
            ...data.config,
            ...config,
        };
        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);
    }

    /**
     * 获取配置
     */
    async getConfig(): Promise<TaskStore['config']> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        return data.config;
    }

    /**
     * 清空所有任务（慎用）
     */
    async clearAllTasks(): Promise<void> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());
        data.tasks = {};
        data.activePlanId = undefined;
        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);
    }

    /**
     * 删除单个任务
     */
    async deleteTask(taskId: string): Promise<boolean> {
        const data = await readJson<TaskStore>(this.dbPath, this.getDefaultData());

        if (!data.tasks[taskId]) {
            return false;
        }

        delete data.tasks[taskId];
        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);

        return true;
    }

    /**
     * 获取数据库路径（用于测试）
     */
    getDbPath(): string {
        return this.dbPath;
    }
}
