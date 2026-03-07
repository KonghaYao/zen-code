import os from 'os';
import path from 'path';
import fs from 'fs';
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

export class FileSystemConfigStore implements IConfigStore {
    private zenConfigDir: string;
    public dbPath: string;

    constructor() {
        const userHome = os.homedir();
        this.zenConfigDir = path.join(userHome, '.zen-code');
        this.dbPath = path.join(this.zenConfigDir, 'settings.json');
    }

    async initialize(): Promise<void> {
        await fs.promises.mkdir(this.zenConfigDir, { recursive: true });
        const data = await readJson<Data>(this.dbPath, defaultData);
        if (!data.config) {
            await writeJson(this.dbPath, defaultData);
            this.syncEnvFromConfig(defaultData.config);
        } else {
            await writeJson(this.dbPath, data);
            this.syncEnvFromConfig(data.config);
        }
    }

    async getConfig(): Promise<AppConfig> {
        const data = await readJson<Data>(this.dbPath, defaultData);
        return data.config;
    }

    async updateConfig(config: Partial<AppConfig>): Promise<void> {
        const data = await readJson<Data>(this.dbPath, defaultData);
        Object.assign(data.config, config);
        await writeJson(this.dbPath, data);
        this.syncEnvFromConfig(data.config);
    }

    private syncEnvFromConfig(config: AppConfig): void {
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

    getZenConfigDir(): string {
        return this.zenConfigDir;
    }
}
