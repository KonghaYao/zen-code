import { ConfigServer } from './ConfigServer.js';
import type { ConfigManager } from './ConfigManager.js';

/**
 * 创建配置服务器（使用默认 ConfigManager）
 */
export async function createConfigServer(): Promise<ConfigServer> {
  const { createFSManager } = await import('./createManager.js');
  const manager = await createFSManager();
  return new ConfigServer(manager);
}

/**
 * 创建配置服务器（使用自定义 ConfigManager）
 */
export function createServerWithManager(manager: ConfigManager): ConfigServer {
  return new ConfigServer(manager);
}
