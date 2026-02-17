import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import os from 'os';
import path from 'path';
import fs from 'fs';
import type { IConfigStore } from '../interfaces/IConfigStore.js';
import type { AppConfig, LegacyAppConfig, ProviderConfig } from '../types/index.js';

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
 * 检查配置是否为旧版本格式
 */
function isLegacyConfig(config: any): config is LegacyAppConfig {
    return 'main_model' in config && !('providers' in config);
}

/**
 * 将旧版本配置迁移到新格式
 */
function migrateLegacyConfig(legacy: LegacyAppConfig): AppConfig {
    const providers: ProviderConfig[] = [];

    // 迁移 OpenAI 配置
    if (legacy.model_provider === 'openai' || legacy.openai_api_key || legacy.openai_base_url) {
        providers.push({
            id: 'openai',
            type: 'openai',
            apiKey: legacy.openai_api_key || '',
            baseUrl: legacy.openai_base_url || 'https://api.openai.com/v1',
        });
    }

    // 迁移 Anthropic 配置
    if (legacy.model_provider === 'anthropic' || legacy.anthropic_api_key || legacy.anthropic_base_url) {
        providers.push({
            id: 'anthropic',
            type: 'anthropic',
            apiKey: legacy.anthropic_api_key || '',
            baseUrl: legacy.anthropic_base_url || 'https://api.anthropic.com',
        });
    }

    // 如果没有任何 provider，使用默认
    if (providers.length === 0) {
        providers.push({
            id: 'default',
            type: 'openai',
            apiKey: '',
            baseUrl: 'https://api.openai.com/v1',
        });
    }

    // 确定当前 provider
    const providerId = legacy.model_provider === 'anthropic' ? 'anthropic' : 'openai';
    const targetProvider = providers.find((p) => p.id === providerId) || providers[0];

    return {
        provider_id: targetProvider.id,
        provider_type: targetProvider.type,
        model_id: legacy.main_model,
        providers,
        mcp_config: legacy.mcp_config,
        stream_refresh_interval: legacy.stream_refresh_interval,
        enable_thinking: legacy.enable_thinking,
        switch_command: legacy.switch_command,
        compact_mode: legacy.compact_mode,
        permissions: legacy.permissions,
    };
}

/**
 * 文件系统配置存储实现
 */
export class FileSystemConfigStore implements IConfigStore {
    private db: Low<Data>;
    private zenConfigDir: string;
    public dbPath: string;
    constructor() {
        const userHome = os.homedir();
        this.zenConfigDir = path.join(userHome, '.zen-code');
        const dbPath = path.join(this.zenConfigDir, 'settings.json');
        const adapter = new JSONFile<Data>(dbPath);
        this.dbPath = dbPath;
        this.db = new Low(adapter, defaultData);
    }

    async initialize(): Promise<void> {
        await fs.promises.mkdir(this.zenConfigDir, { recursive: true });
        await this.db.read();

        // 如果配置不存在，使用默认配置
        if (!this.db.data || !this.db.data.config) {
            this.db.data = defaultData;
            await this.db.write();
        } else if (isLegacyConfig(this.db.data.config)) {
            // 迁移旧配置
            console.log('Migrating legacy config to new format...');
            this.db.data.config = migrateLegacyConfig(this.db.data.config);
            await this.db.write();
            console.log('Config migration completed.');
        }

        // 将配置设置到环境变量
        this.syncEnvFromConfig();
    }

    async getConfig(): Promise<AppConfig> {
        await this.db.read();
        return this.db.data.config;
    }

    async updateConfig(config: Partial<AppConfig>): Promise<void> {
        await this.db.read();
        Object.assign(this.db.data.config, config);
        await this.db.write();

        // 同步更新所有环境变量
        this.syncEnvFromConfig();
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
