/**
 * SparkStore - Spark List 存储管理
 * 基于 fs 直接读写 JSON 的项目级持久化
 */

import path from 'path';
import fs from 'fs';
import { SparkStore, SparkItem, SparkItemType } from '../types/task';

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

export class SparkStoreManager {
    private dbPath: string;

    constructor(projectRoot: string) {
        this.dbPath = path.join(projectRoot, '.claude', 'spark.json');
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
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const data = await readJson<SparkStore>(this.dbPath, this.getDefaultData());
        if (!data) {
            await writeJson(this.dbPath, this.getDefaultData());
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
        const data = await readJson<SparkStore>(this.dbPath, this.getDefaultData());

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

        data.sparks.push(spark);
        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);

        return spark;
    }

    /**
     * 获取所有 Sparks
     */
    async getAllSparks(): Promise<SparkItem[]> {
        const data = await readJson<SparkStore>(this.dbPath, this.getDefaultData());
        return data.sparks;
    }

    /**
     * 根据 status 获取 Sparks
     */
    async getSparksByStatus(status: 'pending' | 'planned' | 'archived'): Promise<SparkItem[]> {
        const data = await readJson<SparkStore>(this.dbPath, this.getDefaultData());
        return data.sparks.filter((s) => s.status === status);
    }

    /**
     * 根据 type 获取 Sparks
     */
    async getSparksByType(type: SparkItemType): Promise<SparkItem[]> {
        const data = await readJson<SparkStore>(this.dbPath, this.getDefaultData());
        return data.sparks.filter((s) => s.type === type);
    }

    /**
     * 更新 Spark 状态
     */
    async updateSparkStatus(sparkId: string, status: 'pending' | 'planned' | 'archived'): Promise<boolean> {
        const data = await readJson<SparkStore>(this.dbPath, this.getDefaultData());

        const spark = data.sparks.find((s) => s.id === sparkId);
        if (!spark) {
            return false;
        }

        spark.status = status;
        data.lastUpdated = new Date().toISOString();
        await writeJson(this.dbPath, data);

        return true;
    }

    /**
     * 删除 Spark
     */
    async deleteSpark(sparkId: string): Promise<boolean> {
        const data = await readJson<SparkStore>(this.dbPath, this.getDefaultData());

        const index = data.sparks.findIndex((s) => s.id === sparkId);
        if (index === -1) {
            return false;
        }

        data.sparks.splice(index, 1);
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
