import type { IPluginStore } from '../interfaces/IPluginStore.js';
import type { Plugin, PluginConfig, PluginSource } from '../types/index.js';

/**
 * 远程插件存储实现（通过 HTTP 与 ConfigServer 通信）
 */
export class RemotePluginStore implements IPluginStore {
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

  async listPlugins(): Promise<Plugin[]> {
    return this.request<Plugin[]>('/api/plugins');
  }

  async getPluginConfig(name: string): Promise<PluginConfig | null> {
    const url = `/api/plugin/config?name=${encodeURIComponent(name)}`;
    return this.request<PluginConfig>(url);
  }

  async updatePluginConfig(name: string, config: PluginConfig): Promise<void> {
    await this.request('/api/plugin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config }),
    });
  }

  async installPlugin(name: string, source: PluginSource): Promise<void> {
    await this.request('/api/plugin/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, source }),
    });
  }

  async uninstallPlugin(name: string): Promise<void> {
    await this.request('/api/plugin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }
}
