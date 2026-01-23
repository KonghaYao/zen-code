// 核心类
export { ConfigManager } from './ConfigManager.js';
export { ConfigServer } from './ConfigServer.js';

// 工厂函数
export { createFSManager, createCustomManager } from './createManager.js';
export {
  createConfigServer,
  createServerWithManager,
} from './createServer.js';
export { createRemoteManager } from './createRemote.js';


// 接口
export type { IConfigStore } from './interfaces/IConfigStore.js';
export type { ISkillStore, IRemoteStore } from './interfaces/ISkillStore.js';
export type { IPluginStore } from './interfaces/IPluginStore.js';

// 实现
export { FileSystemConfigStore } from './implementations/FileSystemConfigStore.js';
export { FileSystemSkillStore } from './implementations/FileSystemSkillStore.js';
export { FileSystemPluginStore } from './implementations/FileSystemPluginStore.js';
export { RemoteConfigStore } from './implementations/RemoteConfigStore.js';
export { RemoteSkillStore } from './implementations/RemoteSkillStore.js';
export { RemotePluginStore } from './implementations/RemotePluginStore.js';

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
