/**
 * 配置存储
 * 使用 @codegraph/config 包统一管理配置
 *
 * @deprecated 推荐直接使用 ConfigManager 实例
 * 保留此文件用于向后兼容
 */

import { createFSManager } from '@codegraph/config';
import type { AppConfig, MCPConfig } from '@codegraph/config';
import type { ConfigManager } from '@codegraph/config';

// 导出类型
export type { AppConfig, MCPConfig };

// 创建配置存储实例
export const configStore: ConfigManager = await createFSManager();

/**
 * 初始化配置数据库
 * @deprecated ConfigManager.initialize() 会自动处理
 */
export const initDb = async () => {
  await configStore.initialize();
};

/**
 * 获取配置
 * @deprecated 使用 configStore.getConfig() 代替
 */
export const getConfig = async (): Promise<AppConfig> => {
  return await configStore.getConfig();
};

/**
 * 更新配置
 * @deprecated 使用 configStore.updateConfig() 代替
 */
export const updateConfig = async (newConfig: Partial<AppConfig>) => {
  await configStore.updateConfig(newConfig);
};


/**
 * 将配置同步到环境变量
 * @deprecated FileSystemConfigStore 已经在 initialize 和 updateConfig 中自动同步
 */
export const syncEnvFromConfig = async () => {
  // 读取配置会自动触发环境变量同步
  await configStore.getConfig();
};
