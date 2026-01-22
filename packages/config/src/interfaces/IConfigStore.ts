import type { AppConfig } from '../types/index.js';

/**
 * 配置存储抽象接口
 */
export interface IConfigStore {
  /**
   * 读取核心配置文件
   */
  getConfig(): Promise<AppConfig>;

  /**
   * 更新核心配置
   */
  updateConfig(config: Partial<AppConfig>): Promise<void>;

  /**
   * 初始化配置存储
   */
  initialize(): Promise<void>;
}
