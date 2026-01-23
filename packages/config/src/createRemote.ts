import { ConfigManager } from './ConfigManager.js';
import { RemoteConfigStore } from './implementations/RemoteConfigStore.js';
import { RemoteSkillStore } from './implementations/RemoteSkillStore.js';
import { RemotePluginStore } from './implementations/RemotePluginStore.js';

/**
 * 创建远程 ConfigManager（连接到 ConfigServer）
 *
 * @param baseUrl - ConfigServer 的地址，默认 http://localhost:3000
 *
 * @example
 * // 连接到远程服务器
 * const manager = await createRemoteManager('http://localhost:3000');
 * const config = await manager.getConfig();
 */
export async function createRemoteManager(baseUrl: string = 'http://localhost:3000'): Promise<ConfigManager> {
  const configStore = new RemoteConfigStore(baseUrl);
  const skillStore = new RemoteSkillStore(baseUrl);
  const pluginStore = new RemotePluginStore(baseUrl);

  const manager = new ConfigManager(configStore, skillStore, pluginStore);
  await manager.initialize();

  return manager;
}
