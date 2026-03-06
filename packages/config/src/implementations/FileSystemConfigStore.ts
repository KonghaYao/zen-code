import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import os from 'os';
import path from 'path';
import fs from 'fs';
import lockfile from 'proper-lockfile';
import type { IConfigStore } from '../interfaces/IConfigStore.js';
import type { AppConfig } from '../types/index.js';

interface Data {
    config: AppConfig;
}

const defaultData: Data = {
    config: {
        provider_id: 'default',
        provider_type: 'openai',
        model_id: 'glm-5',
        providers: [
            {
                id: 'default',
                type: 'openai',
                apiKey: '',
                baseUrl: 'https://api.openai.com/v1',
            },
        ],
        compact_mode: true,
    },
};

/**
 * 文件系统配置存储实现
 *
 * 使用 proper-lockfile 实现跨进程文件锁，防止多进程并发写入导致数据损坏。
 *
 * 锁机制说明：
 * - 每次读写操作都会获取文件锁
 * - 锁超时时间为 5 秒，防止死锁
 * - 锁文件存储在同级目录，格式为 `settings.json.lock`
 */
export class FileSystemConfigStore implements IConfigStore {
    private db: Low<Data>;
    private zenConfigDir: string;
    public dbPath: string;

    /** 获取锁文件路径 */
    private getLockfilePath(): string {
        return `${this.dbPath}.lock`;
    }

    /** 锁配置 */
    private lockOptions: lockfile.LockOptions = {
        // 锁超时时间（毫秒）
        stale: 5000,
        // 获取锁的重试次数
        retries: {
            retries: 5,
            minTimeout: 100,
            maxTimeout: 1000,
        },
    };

    constructor() {
        const userHome = os.homedir();
        this.zenConfigDir = path.join(userHome, '.zen-code');
        const dbPath = path.join(this.zenConfigDir, 'settings.json');
        const adapter = new JSONFile<Data>(dbPath);
        this.dbPath = dbPath;
        this.db = new Low(adapter, defaultData);
    }

    /**
     * 在文件锁保护下执行操作
     */
    private async withLock<T>(fn: () => Promise<T>): Promise<T> {
        // 确保目录存在（proper-lockfile 需要目录存在）
        await fs.promises.mkdir(this.zenConfigDir, { recursive: true });

        // 如果文件不存在，先创建空文件（proper-lockfile 需要文件存在）
        if (!fs.existsSync(this.dbPath)) {
            await fs.promises.writeFile(this.dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
        }

        // 获取锁并执行操作（使用自定义锁文件路径）
        const release = await lockfile.lock(this.dbPath, {
            ...this.lockOptions,
            lockfilePath: this.getLockfilePath(),
        });
        try {
            return await fn();
        } finally {
            await release();
        }
    }

    async initialize(): Promise<void> {
        await this.withLock(async () => {
            await this.db.read();

            // 如果配置不存在，使用默认配置
            if (!this.db.data || !this.db.data.config) {
                this.db.data = defaultData;
                await this.db.write();
            }

            // 将配置设置到环境变量
            this.syncEnvFromConfig();
        });
    }

    async getConfig(): Promise<AppConfig> {
        return this.withLock(async () => {
            await this.db.read();
            return this.db.data.config;
        });
    }

    async updateConfig(config: Partial<AppConfig>): Promise<void> {
        await this.withLock(async () => {
            await this.db.read();
            Object.assign(this.db.data.config, config);
            await this.db.write();

            // 同步更新所有环境变量
            this.syncEnvFromConfig();
        });
    }

    /**
     * 将配置同步到环境变量
     */
    private syncEnvFromConfig(): void {
        const config = this.db.data.config;
        const provider = config.providers.find((p) => p.id === config.provider_id);

        if (provider) {
            if (provider.type === 'openai') {
                process.env.MODEL_PROVIDER = 'openai';
                process.env.OPENAI_API_KEY = provider.apiKey;
                process.env.OPENAI_BASE_URL = provider.baseUrl;
            } else if (provider.type === 'anthropic') {
                process.env.MODEL_PROVIDER = 'anthropic';
                process.env.ANTHROPIC_API_KEY = provider.apiKey;
                process.env.ANTHROPIC_BASE_URL = provider.baseUrl;
            } else if (provider.type === 'gemini' || provider.type === 'google') {
                process.env.MODEL_PROVIDER = 'gemini';
                process.env.GOOGLE_API_KEY = provider.apiKey;
                process.env.GOOGLE_BASE_URL = provider.baseUrl;
            }
        }
    }

    /**
     * 获取配置目录路径
     */
    getZenConfigDir(): string {
        return this.zenConfigDir;
    }
}
