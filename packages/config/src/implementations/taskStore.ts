/**
 * TaskStore - Task System 存储管理
 * 基于 LowDB 的项目级持久化
 */

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { TaskStore, TaskNode, TaskStatus, TaskExecutionRecord } from '../types/task';

export class TaskStoreManager {
  private db: Low<TaskStore>;
  private dbPath: string;

  constructor(projectRoot: string) {
    this.dbPath = path.join(projectRoot, '.claude', 'task.json');
    const adapter = new JSONFile<TaskStore>(this.dbPath);
    this.db = new Low(adapter, this.getDefaultData());
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
    // 确保 .claude 目录存在
    const fs = await import('fs');
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await this.db.read();
    if (!this.db.data) {
      this.db.data = this.getDefaultData();
      await this.db.write();
    }
  }

  /**
   * 获取单个任务
   */
  async getTask(taskId: string): Promise<TaskNode | undefined> {
    await this.db.read();
    return this.db.data.tasks[taskId];
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<TaskNode>): Promise<boolean> {
    await this.db.read();

    const task = this.db.data.tasks[taskId];
    if (!task) {
      return false;
    }

    this.db.data.tasks[taskId] = {
      ...task,
      ...updates,
    };

    if (updates.status) {
      // 更新时间戳
      if (updates.status === 'running' && !task.startedAt) {
        this.db.data.tasks[taskId].startedAt = new Date().toISOString();
      } else if (
        ['complete', 'error', 'review'].includes(updates.status) &&
        !task.completedAt
      ) {
        this.db.data.tasks[taskId].completedAt = new Date().toISOString();
      }
    }

    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();

    return true;
  }

  /**
   * 批量添加任务（用于 Plan 初始化）
   */
  async addTasks(tasks: TaskNode[]): Promise<void> {
    await this.db.read();

    for (const task of tasks) {
      this.db.data.tasks[task.id] = task;
    }

    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();
  }

  /**
   * 根据 status 获取任务列表
   */
  async getTasksByStatus(status: TaskStatus): Promise<TaskNode[]> {
    await this.db.read();
    return Object.values(this.db.data.tasks).filter(t => t.status === status);
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<TaskNode[]> {
    await this.db.read();
    return Object.values(this.db.data.tasks);
  }

  /**
   * 添加执行记录
   */
  async addHistory(record: TaskExecutionRecord): Promise<void> {
    await this.db.read();
    this.db.data.history.push(record);
    await this.db.write();
  }

  /**
   * 获取执行历史
   */
  async getHistory(planId?: string): Promise<TaskExecutionRecord[]> {
    await this.db.read();
    if (planId) {
      return this.db.data.history.filter(h => h.planId === planId);
    }
    return this.db.data.history;
  }

  /**
   * 设置活跃 Plan ID
   */
  async setActivePlan(planId: string): Promise<void> {
    await this.db.read();
    this.db.data.activePlanId = planId;
    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();
  }

  /**
   * 获取活跃 Plan ID
   */
  async getActivePlan(): Promise<string | undefined> {
    await this.db.read();
    return this.db.data.activePlanId;
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<TaskStore['config']>): Promise<void> {
    await this.db.read();
    this.db.data.config = {
      ...this.db.data.config,
      ...config,
    };
    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<TaskStore['config']> {
    await this.db.read();
    return this.db.data.config;
  }

  /**
   * 清空所有任务（慎用）
   */
  async clearAllTasks(): Promise<void> {
    await this.db.read();
    this.db.data.tasks = {};
    this.db.data.activePlanId = undefined;
    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();
  }

  /**
   * 删除单个任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    await this.db.read();

    if (!this.db.data.tasks[taskId]) {
      return false;
    }

    delete this.db.data.tasks[taskId];
    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();

    return true;
  }

  /**
   * 获取数据库路径（用于测试）
   */
  getDbPath(): string {
    return this.dbPath;
  }
}
