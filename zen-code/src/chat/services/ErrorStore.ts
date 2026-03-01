/**
 * ErrorStore - 错误数据存储服务
 *
 * 提供错误的内存存储和 JSON 文件持久化
 * 存储位置: .zen-code/errors.json
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * 错误条目数据结构
 */
export interface ErrorEntry {
    /** 唯一标识 */
    id: string;
    /** 时间戳 ISO 格式 */
    timestamp: string;
    /** 错误级别 */
    level: 'warning' | 'error';
    /** 错误来源 */
    source: 'Agent' | 'Tool' | 'Terminal' | 'System' | 'Unknown';
    /** 错误消息 */
    message: string;
    /** 文件位置（可选） */
    file?: string;
    /** 行号（可选） */
    line?: number;
    /** 列号（可选） */
    column?: number;
    /** 堆栈信息（可选） */
    stack?: string;
}

/**
 * 错误存储配置
 */
interface ErrorStoreConfig {
    /** 存储文件路径 */
    filePath: string;
    /** 最大存储数量 */
    maxEntries: number;
}

/**
 * 错误存储服务
 */
class ErrorStoreService {
    private errors: ErrorEntry[] = [];
    private filePath: string;
    private maxEntries: number;
    private isLoaded = false;

    constructor(config?: Partial<ErrorStoreConfig>) {
        // 默认存储在项目根目录的 .zen-code/errors.json
        this.filePath = config?.filePath || join(process.cwd(), '.zen-code', 'errors.json');
        this.maxEntries = config?.maxEntries || 500;

        // 确保目录存在
        this.ensureDirectory();
    }

    /**
     * 确保存储目录存在
     */
    private ensureDirectory(): void {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * 从文件加载错误数据
     */
    private loadFromFile(): void {
        if (this.isLoaded) return;

        try {
            if (existsSync(this.filePath)) {
                const content = readFileSync(this.filePath, 'utf-8');
                const data = JSON.parse(content);
                if (Array.isArray(data)) {
                    this.errors = data;
                }
            }
        } catch (error) {
            // 加载失败时使用空数组
            this.errors = [];
        }

        this.isLoaded = true;
    }

    /**
     * 保存错误数据到文件
     */
    private saveToFile(): void {
        try {
            const content = JSON.stringify(this.errors, null, 2);
            writeFileSync(this.filePath, content, 'utf-8');
        } catch (error) {
            // 保存失败时使用 process.stderr 避免循环调用 console.error
            process.stderr.write(`[ErrorStore] Failed to save errors: ${error}\n`);
        }
    }

    /**
     * 添加错误
     */
    addError(entry: Omit<ErrorEntry, 'id' | 'timestamp'>): ErrorEntry {
        this.loadFromFile();

        const newEntry: ErrorEntry = {
            ...entry,
            id: randomUUID(),
            timestamp: new Date().toISOString(),
        };

        this.errors.unshift(newEntry);

        // 限制最大数量
        if (this.errors.length > this.maxEntries) {
            this.errors = this.errors.slice(0, this.maxEntries);
        }

        this.saveToFile();
        return newEntry;
    }

    /**
     * 获取所有错误
     */
    getErrors(): ErrorEntry[] {
        this.loadFromFile();
        return [...this.errors];
    }

    /**
     * 获取指定数量的错误（用于面板展示）
     */
    getRecentErrors(limit = 100): ErrorEntry[] {
        this.loadFromFile();
        return this.errors.slice(0, limit);
    }

    /**
     * 清除所有错误
     */
    clearAll(): void {
        this.errors = [];
        this.saveToFile();
    }

    /**
     * 删除单个错误
     */
    deleteError(id: string): boolean {
        this.loadFromFile();
        const index = this.errors.findIndex((e) => e.id === id);
        if (index !== -1) {
            this.errors.splice(index, 1);
            this.saveToFile();
            return true;
        }
        return false;
    }

    /**
     * 获取错误统计
     */
    getStats(): { total: number; errors: number; warnings: number } {
        this.loadFromFile();
        return {
            total: this.errors.length,
            errors: this.errors.filter((e) => e.level === 'error').length,
            warnings: this.errors.filter((e) => e.level === 'warning').length,
        };
    }
}

// 导出单例实例
export const errorStore = new ErrorStoreService();
