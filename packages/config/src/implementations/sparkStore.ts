/**
 * SparkStore - Spark List 存储管理
 * 基于 LowDB 的项目级持久化
 */

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { SparkStore, SparkItem, SparkItemType } from '../types/task';

export class SparkStoreManager {
  private db: Low<SparkStore>;
  private dbPath: string;

  constructor(projectRoot: string) {
    this.dbPath = path.join(projectRoot, '.claude', 'spark.json');
    const adapter = new JSONFile<SparkStore>(this.dbPath);
    this.db = new Low(adapter, this.getDefaultData());
  }

  private getDefaultData(): SparkStore {
    return {
      version: '1.0',
      sparks: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * 初始化数据库（如果不存在则创建）
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
   * 生成 UUID (使用 Web Crypto API)
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 添加新的 Spark Item
   */
  async addSpark(input: {
    type: SparkItemType;
    title: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
  }): Promise<SparkItem> {
    await this.db.read();

    const spark: SparkItem = {
      id: this.generateId(),
      type: input.type,
      title: input.title,
      description: input.description,
      priority: input.priority || 'medium',
      source: 'user_input',
      status: 'pending',
      createdAt: new Date().toISOString(),
      tags: input.tags || [],
    };

    this.db.data.sparks.push(spark);
    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();

    return spark;
  }

  /**
   * 获取所有 Sparks
   */
  async getAllSparks(): Promise<SparkItem[]> {
    await this.db.read();
    return this.db.data.sparks;
  }

  /**
   * 根据 status 获取 Sparks
   */
  async getSparksByStatus(status: 'pending' | 'planned' | 'archived'): Promise<SparkItem[]> {
    await this.db.read();
    return this.db.data.sparks.filter(s => s.status === status);
  }

  /**
   * 根据 type 获取 Sparks
   */
  async getSparksByType(type: SparkItemType): Promise<SparkItem[]> {
    await this.db.read();
    return this.db.data.sparks.filter(s => s.type === type);
  }

  /**
   * 更新 Spark 状态
   */
  async updateSparkStatus(
    sparkId: string,
    status: 'pending' | 'planned' | 'archived'
  ): Promise<boolean> {
    await this.db.read();

    const spark = this.db.data.sparks.find(s => s.id === sparkId);
    if (!spark) {
      return false;
    }

    spark.status = status;
    this.db.data.lastUpdated = new Date().toISOString();
    await this.db.write();

    return true;
  }

  /**
   * 删除 Spark
   */
  async deleteSpark(sparkId: string): Promise<boolean> {
    await this.db.read();

    const index = this.db.data.sparks.findIndex(s => s.id === sparkId);
    if (index === -1) {
      return false;
    }

    this.db.data.sparks.splice(index, 1);
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
