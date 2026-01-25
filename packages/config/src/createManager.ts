import { ConfigManager } from './ConfigManager.js';
import { IConfigStore } from './interfaces/IConfigStore.js';
import { IPluginStore } from './interfaces/IPluginStore.js';
import type { IRemoteStore, ISkillStore } from './interfaces/ISkillStore.js';

/**
 * 创建文件系统 ConfigManager
 *
 * @example
 * const manager = await createFSManager();
 * await manager.initialize();
 */
export async function createFSManager(): Promise<ConfigManager> {
  const { FileSystemConfigStore } = await import('./implementations/FileSystemConfigStore.js');
  const { FileSystemSkillStore } = await import('./implementations/FileSystemSkillStore.js');
  const { FileSystemPluginStore } = await import('./implementations/FileSystemPluginStore.js');

  const configStore = new FileSystemConfigStore();
  const skillStore = new FileSystemSkillStore();
  const pluginStore = new FileSystemPluginStore();

  const manager = new ConfigManager(configStore, skillStore, pluginStore);
  await manager.initialize();
  return manager;
}

/**
 * 创建自定义 ConfigManager
 *
 * @example
 * const manager = await createCustomManager({
 *   configStore: new MyConfigStore(),
 *   skillStore: new MySkillStore(),
 *   pluginStore: new MyPluginStore(),
 *   remoteStore: new MyRemoteStore(),
 * });
 */
export async function createCustomManager(options: {
  configStore: IConfigStore;
  skillStore: ISkillStore;
  pluginStore: IPluginStore;
  remoteStore?: IRemoteStore;
}): Promise<ConfigManager> {
  const { configStore, skillStore, pluginStore, remoteStore } = options;
  const manager = new ConfigManager(configStore, skillStore, pluginStore, remoteStore);
  await manager.initialize();
  return manager;
}
