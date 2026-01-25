import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { IPluginStore } from '../interfaces/IPluginStore.js';
import type { Plugin, PluginConfig, PluginSource } from '../types/index.js';

/**
 * 文件系统 Plugin 存储实现
 */
export class FileSystemPluginStore implements IPluginStore {
  private pluginsDir: string;

  constructor() {
    const userHome = os.homedir();
    this.pluginsDir = path.join(userHome, '.zen-code', 'plugins');
  }

  async listPlugins(): Promise<Plugin[]> {
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      const plugins: Plugin[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(this.pluginsDir, entry.name, 'plugin.json');
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            plugins.push({
              name: entry.name,
              version: config.version || '0.0.0',
              enabled: config.enabled !== false,
            });
          } catch {
            // 跳过无效的插件
          }
        }
      }

      return plugins;
    } catch {
      return [];
    }
  }

  async getPluginConfig(name: string): Promise<PluginConfig | null> {
    const configPath = path.join(this.pluginsDir, name, 'plugin.json');
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch {
      return null;
    }
  }

  async updatePluginConfig(name: string, config: PluginConfig): Promise<void> {
    const pluginDir = path.join(this.pluginsDir, name);
    await fs.mkdir(pluginDir, { recursive: true });

    const configPath = path.join(pluginDir, 'plugin.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  async installPlugin(name: string, source: PluginSource): Promise<void> {
    const pluginDir = path.join(this.pluginsDir, name);
    await fs.mkdir(pluginDir, { recursive: true });

    // 创建默认配置
    const config = {
      name,
      version: '0.0.1',
      enabled: true,
      source,
    };

    await this.updatePluginConfig(name, config);
  }

  async uninstallPlugin(name: string): Promise<void> {
    const pluginDir = path.join(this.pluginsDir, name);
    await fs.rm(pluginDir, { recursive: true, force: true });
  }
}
