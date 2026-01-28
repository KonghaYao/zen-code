import type { IConfigStore } from './interfaces/IConfigStore.js';
import type { ISkillStore, IRemoteStore } from './interfaces/ISkillStore.js';
import type { IPluginStore } from './interfaces/IPluginStore.js';
import type { AppConfig, Skill, SkillContent, Plugin, PluginConfig, PluginSource } from './types/index.js';
import type { PermissionResult } from './permission/types.js';
import { PermissionStore } from './implementations/permissionStore.js';

/**
 * 配置管理器（统一入口）
 */
export class ConfigManager {
  private configStore: IConfigStore;
  private skillStore: ISkillStore;
  private pluginStore: IPluginStore;
  private remoteStore?: IRemoteStore;
  private permissionStore: PermissionStore;
  private _initialized: boolean = false;

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
    this.permissionStore = PermissionStore.getInstance(configStore);
  }

  /**
   * 初始化管理器（延迟初始化）
   * 必须在使用其他方法前调用
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // 初始化 configStore
    if ('initialize' in this.configStore && typeof this.configStore.initialize === 'function') {
      await this.configStore.initialize();
    }

    // 初始化 skillStore
    if ('initialize' in this.skillStore && typeof this.skillStore.initialize === 'function') {
      await this.skillStore.initialize();
    }

    // 初始化 pluginStore
    if ('initialize' in this.pluginStore && typeof this.pluginStore.initialize === 'function') {
      await this.pluginStore.initialize();
    }

    this._initialized = true;
  }

  /**
   * 确保已初始化（内部使用）
   */
  private async ensureInitialized(): Promise<void> {
    if (!this._initialized) {
      throw new Error('ConfigManager not initialized. Call await manager.initialize() first.');
    }
  }

  // 配置相关
  async getConfig(): Promise<AppConfig> {
    await this.ensureInitialized();
    return await this.configStore.getConfig();
  }

  async updateConfig(config: Partial<AppConfig>): Promise<void> {
    await this.ensureInitialized();
    return await this.configStore.updateConfig(config);
  }

  // Skills 相关
  async listSkills(): Promise<Skill[]> {
    await this.ensureInitialized();
    return await this.skillStore.listSkills();
  }

  async getSkill(name: string): Promise<SkillContent | null> {
    await this.ensureInitialized();
    return await this.skillStore.getSkill(name);
  }

  async saveSkill(name: string, content: SkillContent): Promise<void> {
    await this.ensureInitialized();
    return await this.skillStore.saveSkill(name, content);
  }

  async deleteSkill(name: string): Promise<void> {
    await this.ensureInitialized();
    return await this.skillStore.deleteSkill(name);
  }

  async syncSkillsFromRemote(): Promise<void> {
    await this.ensureInitialized();
    if (!this.remoteStore) {
      throw new Error('Remote store not configured');
    }
    return await this.skillStore.syncFromRemote(this.remoteStore);
  }

  // Plugins 相关
  async listPlugins(): Promise<Plugin[]> {
    await this.ensureInitialized();
    return await this.pluginStore.listPlugins();
  }

  async getPluginConfig(name: string): Promise<PluginConfig | null> {
    await this.ensureInitialized();
    return await this.pluginStore.getPluginConfig(name);
  }

  async updatePluginConfig(name: string, config: PluginConfig): Promise<void> {
    await this.ensureInitialized();
    return await this.pluginStore.updatePluginConfig(name, config);
  }

  async installPlugin(name: string, source: PluginSource): Promise<void> {
    await this.ensureInitialized();
    return await this.pluginStore.installPlugin(name, source);
  }

  async uninstallPlugin(name: string): Promise<void> {
    await this.ensureInitialized();
    return await this.pluginStore.uninstallPlugin(name);
  }

  // Permissions 相关
  /**
   * 检查 Bash 命令权限
   */
  async checkBashPermission(command: string, cwd?: string): Promise<PermissionResult | undefined> {
    await this.ensureInitialized();
    return await this.permissionStore.checkBashPermission(command, cwd);
  }

  /**
   * 检查读取文件权限
   */
  async checkReadPermission(filePath: string): Promise<PermissionResult | undefined> {
    await this.ensureInitialized();
    return await this.permissionStore.checkReadPermission(filePath);
  }

  /**
   * 检查写入文件权限
   */
  async checkWritePermission(filePath: string): Promise<PermissionResult | undefined> {
    await this.ensureInitialized();
    return await this.permissionStore.checkWritePermission(filePath);
  }

  /**
   * 获取权限匹配器（用于高级操作）
   */
  async getPermissionMatcher() {
    await this.ensureInitialized();
    return await this.permissionStore.getPermissions();
  }

  /** fs 专用 */
  getConfigPath() {
    /** @ts-ignore */
    return this.configStore?.dbPath
  }
}
