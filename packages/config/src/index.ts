// 核心类
export { ConfigManager } from './ConfigManager.js';
export { ConfigServer } from './ConfigServer.js';

// 工厂函数
export { createFSManager, createCustomManager } from './createManager.js';
export { createConfigServer, createServerWithManager } from './createServer.js';
export { createRemoteManager } from './createRemote.js';

// 接口
export type { IConfigStore } from './interfaces/IConfigStore.js';
export type { ISkillStore, IRemoteStore } from './interfaces/ISkillStore.js';
export type { IPluginStore } from './interfaces/IPluginStore.js';
export type { IRemotePromptStore, RemotePromptItem } from './interfaces/IRemotePromptStore.js';
export type { IRemoteSkillStore, RemoteSkillItem } from './interfaces/IRemoteSkillStore.js';

// 实现
export { FileSystemConfigStore } from './implementations/FileSystemConfigStore.js';
export { FileSystemSkillStore } from './implementations/FileSystemSkillStore.js';
export { FileSystemPluginStore } from './implementations/FileSystemPluginStore.js';
export { RemoteConfigStore } from './implementations/RemoteConfigStore.js';
export { RemoteSkillStore } from './implementations/RemoteSkillStore.js';
export { RemotePluginStore } from './implementations/RemotePluginStore.js';
export { BaseRemoteStore } from './implementations/remote/BaseRemoteStore.js';
export { GenericHttpRemoteStore } from './implementations/remote/GenericHttpRemoteStore.js';
export type { GenericStoreConfig, FieldMap } from './implementations/remote/GenericHttpRemoteStore.js';
export { ClawhHubStore, CLAWHUB_BASE_URL } from './implementations/remote/ClawhHubStore.js';

export * from './types';

export { SparkStoreManager, TaskStoreManager } from './implementations/index.js';
