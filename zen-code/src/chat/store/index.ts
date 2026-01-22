/**
 * 配置存储
 * 使用 @codegraph/config 包统一管理配置
 */

import { FileSystemConfigStore } from '@codegraph/config';
import type { AppConfig, MCPConfig } from '@codegraph/config';

// 导出类型
export type { AppConfig, MCPConfig };

// 创建配置存储实例
const configStore = new FileSystemConfigStore();

/**
 * 初始化配置数据库
 */
export const initDb = async () => {
  await configStore.initialize();
};

/**
 * 获取配置
 * 注意：为了兼容性，这里改为异步
 */
export const getConfig = async (): Promise<AppConfig> => {
  return await configStore.getConfig();
};

/**
 * 更新配置
 */
export const updateConfig = async (newConfig: Partial<AppConfig>) => {
  await configStore.updateConfig(newConfig);
};

/**
 * 获取配置文件路径
 */
export const dbPath = (): string => {
  return configStore.getZenConfigDir() + '/settings.json';
};

/**
 * 将配置同步到环境变量
 * 注意：FileSystemConfigStore 已经在 initialize 和 updateConfig 中自动同步
 * 这个函数保留用于手动同步场景
 */
export const syncEnvFromConfig = async () => {
  // 读取配置会自动触发环境变量同步
  await configStore.getConfig();
};
