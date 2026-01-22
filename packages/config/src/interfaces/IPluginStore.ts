import type { Plugin, PluginConfig, PluginSource } from '../types/index.js';

/**
 * Plugin 存储抽象接口
 */
export interface IPluginStore {
  /**
   * 列出已安装的插件
   */
  listPlugins(): Promise<Plugin[]>;

  /**
   * 获取插件配置
   */
  getPluginConfig(name: string): Promise<PluginConfig | null>;

  /**
   * 更新插件配置
   */
  updatePluginConfig(name: string, config: PluginConfig): Promise<void>;

  /**
   * 安装插件
   */
  installPlugin(name: string, source: PluginSource): Promise<void>;

  /**
   * 卸载插件
   */
  uninstallPlugin(name: string): Promise<void>;
}
