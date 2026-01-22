import type { IConfigStore } from './interfaces/IConfigStore.js';
import type { ISkillStore, IRemoteStore } from './interfaces/ISkillStore.js';
import type { IPluginStore } from './interfaces/IPluginStore.js';
import type { AppConfig, Skill, SkillContent, Plugin, PluginConfig, PluginSource } from './types/index.js';

/**
 * 配置管理器（统一入口）
 */
export class ConfigManager {
  private configStore: IConfigStore;
  private skillStore: ISkillStore;
  private pluginStore: IPluginStore;
  private remoteStore?: IRemoteStore;

  constructor(
    configStore: IConfigStore,
    skillStore: ISkillStore,
    pluginStore: IPluginStore,
    remoteStore?: IRemoteStore
  ) {
    this.configStore = configStore;
    this.skillStore = skillStore;
    this.pluginStore = pluginStore;
    this.remoteStore = remoteStore;
  }

  // 配置相关
  async getConfig(): Promise<AppConfig> {
    return await this.configStore.getConfig();
  }

  async updateConfig(config: Partial<AppConfig>): Promise<void> {
    return await this.configStore.updateConfig(config);
  }

  // Skills 相关
  async listSkills(): Promise<Skill[]> {
    return await this.skillStore.listSkills();
  }

  async getSkill(name: string): Promise<SkillContent | null> {
    return await this.skillStore.getSkill(name);
  }

  async saveSkill(name: string, content: SkillContent): Promise<void> {
    return await this.skillStore.saveSkill(name, content);
  }

  async deleteSkill(name: string): Promise<void> {
    return await this.skillStore.deleteSkill(name);
  }

  async syncSkillsFromRemote(): Promise<void> {
    if (!this.remoteStore) {
      throw new Error('Remote store not configured');
    }
    return await this.skillStore.syncFromRemote(this.remoteStore);
  }

  // Plugins 相关
  async listPlugins(): Promise<Plugin[]> {
    return await this.pluginStore.listPlugins();
  }

  async getPluginConfig(name: string): Promise<PluginConfig | null> {
    return await this.pluginStore.getPluginConfig(name);
  }

  async updatePluginConfig(name: string, config: PluginConfig): Promise<void> {
    return await this.pluginStore.updatePluginConfig(name, config);
  }

  async installPlugin(name: string, source: PluginSource): Promise<void> {
    return await this.pluginStore.installPlugin(name, source);
  }

  async uninstallPlugin(name: string): Promise<void> {
    return await this.pluginStore.uninstallPlugin(name);
  }

  /**
   * 工厂方法：创建默认的文件系统 ConfigManager
   */
  static async createFS(): Promise<ConfigManager> {
    const { FileSystemConfigStore } = await import('./implementations/FileSystemConfigStore.js');
    const { FileSystemSkillStore } = await import('./implementations/FileSystemSkillStore.js');
    const { FileSystemPluginStore } = await import('./implementations/FileSystemPluginStore.js');

    const configStore = new FileSystemConfigStore();
    const skillStore = new FileSystemSkillStore();
    const pluginStore = new FileSystemPluginStore();

    await configStore.initialize();

    return new ConfigManager(configStore, skillStore, pluginStore);
  }
}
