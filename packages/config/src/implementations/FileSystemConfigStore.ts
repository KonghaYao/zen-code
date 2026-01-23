import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
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
    main_model: 'claude-sonnet-4-5',
    model_provider: 'openai',
  },
};

/**
 * 文件系统配置存储实现
 */
export class FileSystemConfigStore implements IConfigStore {
  private db: Low<Data>;
  private zenConfigDir: string;
  public dbPath: string
  constructor() {
    const userHome = os.homedir();
    this.zenConfigDir = path.join(userHome, '.zen-code');
    const dbPath = path.join(this.zenConfigDir, 'settings.json');
    const adapter = new JSONFile<Data>(dbPath);
    this.dbPath = dbPath
    this.db = new Low(adapter, defaultData);
  }

  async initialize(): Promise<void> {
    await fs.promises.mkdir(this.zenConfigDir, { recursive: true });
    await this.db.read();

    if (!this.db.data || !this.db.data.config) {
      this.db.data = defaultData;
      await this.db.write();
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

    if (config.model_provider) {
      process.env.MODEL_PROVIDER = config.model_provider;
    }
    if (config.openai_api_key) {
      process.env.OPENAI_API_KEY = config.openai_api_key;
    }
    if (config.openai_base_url) {
      process.env.OPENAI_BASE_URL = config.openai_base_url;
    }
    if (config.anthropic_api_key) {
      process.env.ANTHROPIC_API_KEY = config.anthropic_api_key;
    }
    if (config.anthropic_base_url) {
      process.env.ANTHROPIC_BASE_URL = config.anthropic_base_url;
    }
  }

  /**
   * 获取配置目录路径
   */
  getZenConfigDir(): string {
    return this.zenConfigDir;
  }
}
