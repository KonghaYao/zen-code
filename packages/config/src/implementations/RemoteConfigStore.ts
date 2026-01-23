import type { IConfigStore } from '../interfaces/IConfigStore.js';
import type { AppConfig } from '../types/index.js';

/**
 * 远程配置存储实现（通过 HTTP 与 ConfigServer 通信）
 */
export class RemoteConfigStore implements IConfigStore {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async initialize(): Promise<void> {
    // 远程模式无需初始化
  }

  async getConfig(): Promise<AppConfig> {
    return this.request<AppConfig>('/api/config');
  }

  async updateConfig(config: Partial<AppConfig>): Promise<void> {
    await this.request('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }
}
