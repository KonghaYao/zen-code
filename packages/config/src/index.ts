// 核心类
export { ConfigManager } from './ConfigManager.js';

// 接口
export { IConfigStore } from './interfaces/IConfigStore.js';
export { ISkillStore, IRemoteStore } from './interfaces/ISkillStore.js';
export { IPluginStore } from './interfaces/IPluginStore.js';

// 实现
export { FileSystemConfigStore } from './implementations/FileSystemConfigStore.js';
export { FileSystemSkillStore } from './implementations/FileSystemSkillStore.js';
export { FileSystemPluginStore } from './implementations/FileSystemPluginStore.js';

// 类型
export type {
  AppConfig,
  MCPConfig,
  Skill,
  SkillContent,
  Plugin,
  PluginConfig,
  PluginSource,
  PluginPackage,
  RemoteStoreConfig,
} from './types/index.js';
