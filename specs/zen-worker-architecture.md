# Zen-Worker 架构设计

> 基于 code-graph 现有代码的重构方案
> 目标：模块化、可扩展、支持多客户端

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    code-graph Monorepo                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              packages/ (核心库)                        │  │
│  │  ┌─────────────────┐      ┌─────────────────┐       │  │
│  │  │ @codegraph/     │      │ @codegraph/     │       │  │
│  │  │  config         │      │  agent          │       │  │
│  │  │  配置中心        │◄─────│  Agent 核心      │       │  │
│  │  │  - 纯 JS 库     │      │  - Server 模式   │       │  │
│  │  │  - 抽象接口     │      │  - 直接调用模式  │       │  │
│  │  └─────────────────┘      └────────┬────────┘       │  │
│  └─────────────────────────────────────┼─────────────────┘  │
│                                        │                     │
│         ┌──────────────────────────────┼─────────────────┐  │
│         │                              │                 │  │
│  ┌──────▼──────────┐       ┌───────────▼──────────┐     │  │
│  │  zen-code       │       │  zen-worker          │     │  │
│  │  TUI 客户端      │       │  Web UI 客户端        │     │  │
│  │  (现有 tui/)     │       │  (新建)               │     │  │
│  │  - 终端界面      │       │  - Web 应用           │     │  │
│  │  - CLI 工具      │       │  - 浏览器访问         │     │  │
│  │  - Ink 组件      │       │  - React 组件         │     │  │
│  └──────────────────┘       └───────────────────────┘     │  │
│         ▲                              ▲                  │  │
│         └──────────┬───────────────────┘                  │  │
│                    │                                      │  │
│         ┌──────────▼──────────┐                           │  │
│         │ @codegraph/         │                           │  │
│         │  union-client       │                           │  │
│         │  客户端共享包        │                           │  │
│         │  - React Hooks      │                           │  │
│         │  - 共享类型         │                           │  │
│         │  - 工具函数         │                           │  │
│         │  - UI 工具定义      │                           │  │
│         └─────────────────────┘                           │  │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构
```
code-graph/
├── packages/
│   ├── config/              # @codegraph/config - 配置中心
│   ├── agent/               # @codegraph/agent - Agent 核心
│   └── union-client/        # @codegraph/union-client - 客户端共享
├── zen-code/                # TUI 客户端（现有的 tui/）
│   ├── src/
│   │   ├── chat/            # 聊天界面
│   │   ├── cli.ts           # CLI 入口
│   │   └── app.tsx          # TUI 应用入口
│   └── package.json
├── zen-worker/              # Web UI 客户端（新建）
│   ├── src/
│   │   ├── pages/           # 页面
│   │   ├── components/      # 组件
│   │   └── main.tsx         # Web 应用入口
│   ├── public/
│   └── package.json
├── agents/                  # 保留向后兼容
│   └── code/
├── specs/
└── package.json
```

---

## 1. @codegraph/config - 配置中心包

### 设计目标
- **纯 JS 辅助库**：无平台依赖，可在 Node.js 和浏览器中运行
- **接口抽象**：支持文件系统和远程 API 两种实现
- **统一配置**：集中管理 settings.json、skills、plugins

### 目录结构
```
packages/config/
├── src/
│   ├── interfaces/
│   │   ├── IConfigStore.ts        # 配置存储抽象接口
│   │   ├── ISkillStore.ts         # Skill 存储抽象接口
│   │   ├── IPluginStore.ts        # Plugin 存储抽象接口
│   │   └── IRemoteStore.ts        # 远程商店抽象接口
│   ├── implementations/
│   │   ├── FileSystemConfigStore.ts   # 文件系统实现
│   │   ├── FileSystemSkillStore.ts    # Skills 文件系统实现
│   │   └── FileSystemPluginStore.ts   # Plugins 文件系统实现
│   ├── types/
│   │   └── index.ts                # 配置类型定义
│   ├── ConfigManager.ts            # 配置管理器（统一入口）
│   └── index.ts
└── package.json
```

### 核心接口设计

#### IConfigStore.ts
```typescript
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

export interface AppConfig {
  main_model: string;
  model_provider?: string;
  mcp_config?: MCPConfig;
  openai_api_key?: string;
  openai_base_url?: string;
  anthropic_api_key?: string;
  anthropic_base_url?: string;
  stream_refresh_interval?: number;
  enable_thinking?: boolean;
  switch_command?: string;
}
```

#### ISkillStore.ts
```typescript
export interface ISkillStore {
  /**
   * 列出所有可用的 skills
   */
  listSkills(): Promise<Skill[]>;

  /**
   * 读取特定 skill 的内容
   */
  getSkill(name: string): Promise<SkillContent | null>;

  /**
   * 保存或更新 skill
   */
  saveSkill(name: string, content: SkillContent): Promise<void>;

  /**
   * 删除 skill
   */
  deleteSkill(name: string): Promise<void>;

  /**
   * 同步从远程商店拉取 skills
   */
  syncFromRemote(remoteStore: IRemoteStore): Promise<void>;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
}

export interface SkillContent {
  frontmatter: Record<string, any>;
  markdown: string;
}
```

#### IPluginStore.ts
```typescript
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

export interface Plugin {
  name: string;
  version: string;
  enabled: boolean;
}

export interface PluginSource {
  type: 'npm' | 'git' | 'local';
  url?: string;
  path?: string;
}
```

#### IRemoteStore.ts
```typescript
export interface IRemoteStore {
  /**
   * 从远程获取 skill
   */
  fetchSkill(name: string): Promise<SkillContent | null>;

  /**
   * 从远程获取插件
   */
  fetchPlugin(name: string): Promise<PluginPackage | null>;

  /**
   * 列出远程可用的 skills
   */
  listRemoteSkills(): Promise<Skill[]>;

  /**
   * 列出远程可用的插件
   */
  listRemotePlugins(): Promise<Plugin[]>;
}
```

### ConfigManager 统一入口

```typescript
export class ConfigManager {
  private configStore: IConfigStore;
  private skillStore: ISkillStore;
  private pluginStore: IPluginStore;
  private remoteStore?: IRemoteStore;

  constructor(
    configStore: IConfigStore,
    skillStore: ISkillStore,
    pluginStore: IPluginStore,
    remoteStore?: IRemoteStore
  ) {
    this.configStore = configStore;
    this.skillStore = skillStore;
    this.pluginStore = pluginStore;
    this.remoteStore = remoteStore;
  }

  // 配置相关
  async getConfig(): Promise<AppConfig> {
    return await this.configStore.getConfig();
  }

  async updateConfig(config: Partial<AppConfig>): Promise<void> {
    return await this.configStore.updateConfig(config);
  }

  // Skills 相关
  async listSkills(): Promise<Skill[]> {
    return await this.skillStore.listSkills();
  }

  async getSkill(name: string): Promise<SkillContent | null> {
    return await this.skillStore.getSkill(name);
  }

  async saveSkill(name: string, content: SkillContent): Promise<void> {
    return await this.skillStore.saveSkill(name, content);
  }

  async syncSkillsFromRemote(): Promise<void> {
    if (!this.remoteStore) {
      throw new Error('Remote store not configured');
    }
    return await this.skillStore.syncFromRemote(this.remoteStore);
  }

  // Plugins 相关
  async listPlugins(): Promise<Plugin[]> {
    return await this.pluginStore.listPlugins();
  }

  async installPlugin(name: string, source: PluginSource): Promise<void> {
    return await this.pluginStore.installPlugin(name, source);
  }

  /**
   * 工厂方法：创建默认的文件系统 ConfigManager
   */
  static async createFS(): Promise<ConfigManager> {
    const configStore = new FileSystemConfigStore();
    const skillStore = new FileSystemSkillStore();
    const pluginStore = new FileSystemPluginStore();

    await configStore.initialize();

    return new ConfigManager(configStore, skillStore, pluginStore);
  }

  /**
   * 工厂方法：创建带远程商店的 ConfigManager
   */
  static async createWithRemote(remoteConfig: RemoteStoreConfig): Promise<ConfigManager> {
    const manager = await ConfigManager.createFS();
    const remoteStore = new RemoteAPIStore(remoteConfig);
    // 替换为带远程能力的 manager
    return new RemoteConfigManager(manager, remoteStore);
  }
}
```

### 文件系统实现示例

#### FileSystemConfigStore.ts（基于现有代码重构）
```typescript
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import os from 'os';
import path from 'path';
import fs from 'fs';
import type { IConfigStore, AppConfig } from '../interfaces/IConfigStore.js';

interface Data {
  config: AppConfig;
}

const defaultData: Data = {
  config: {
    main_model: 'claude-sonnet-4-5',
    model_provider: 'openai',
  },
};

export class FileSystemConfigStore implements IConfigStore {
  private db: Low<Data>;
  private zenConfigDir: string;

  constructor() {
    const userHome = os.homedir();
    this.zenConfigDir = path.join(userHome, '.zen-code');
    const dbPath = path.join(this.zenConfigDir, 'settings.json');
    const adapter = new JSONFile<Data>(dbPath);
    this.db = new Low(adapter, defaultData);
  }

  async initialize(): Promise<void> {
    await fs.promises.mkdir(this.zenConfigDir, { recursive: true });
    await this.db.read();

    if (!this.db.data || !this.db.data.config) {
      this.db.data = defaultData;
      await this.db.write();
    }
  }

  async getConfig(): Promise<AppConfig> {
    await this.db.read();
    return this.db.data.config;
  }

  async updateConfig(config: Partial<AppConfig>): Promise<void> {
    await this.db.read();
    Object.assign(this.db.data.config, config);
    await this.db.write();
  }
}
```

#### FileSystemSkillStore.ts
```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import type { ISkillStore, Skill, SkillContent } from '../interfaces/ISkillStore.js';

export class FileSystemSkillStore implements ISkillStore {
  private skillsDir: string;
  private projectSkillsDir: string;

  constructor() {
    const userHome = os.homedir();
    this.skillsDir = path.join(userHome, '.deepagents', 'code', 'skills');
    // 假设当前工作目录是项目根目录
    this.projectSkillsDir = path.join(process.cwd(), '.claude', 'skills');
  }

  async listSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];

    // 列出用户 skills
    const userSkills = await this.listSkillsInDir(this.skillsDir);
    skills.push(...userSkills);

    // 列出项目 skills（优先级更高）
    const projectSkills = await this.listSkillsInDir(this.projectSkillsDir);
    skills.push(...projectSkills);

    return skills;
  }

  private async listSkillsInDir(dir: string): Promise<Skill[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const skills: Skill[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(dir, entry.name, 'SKILL.md');
          try {
            const content = await fs.readFile(skillPath, 'utf-8');
            const frontmatter = this.parseFrontmatter(content);
            skills.push({
              name: entry.name,
              description: frontmatter.description || '',
              path: skillPath,
            });
          } catch {
            // 跳过无效的 skill
          }
        }
      }

      return skills;
    } catch {
      return [];
    }
  }

  async getSkill(name: string): Promise<SkillContent | null> {
    // 先在项目 skills 中查找
    const projectPath = path.join(this.projectSkillsDir, name, 'SKILL.md');
    try {
      const content = await fs.readFile(projectPath, 'utf-8');
      return this.parseSkillContent(content);
    } catch {
      // 未找到，尝试用户 skills
    }

    const userPath = path.join(this.skillsDir, name, 'SKILL.md');
    try {
      const content = await fs.readFile(userPath, 'utf-8');
      return this.parseSkillContent(content);
    } catch {
      return null;
    }
  }

  async saveSkill(name: string, content: SkillContent): Promise<void> {
    const skillDir = path.join(this.skillsDir, name);
    await fs.mkdir(skillDir, { recursive: true });

    const markdown = this.formatSkillContent(content);
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), markdown, 'utf-8');
  }

  async deleteSkill(name: string): Promise<void> {
    const skillDir = path.join(this.skillsDir, name);
    await fs.rm(skillDir, { recursive: true, force: true });
  }

  async syncFromRemote(remoteStore: IRemoteStore): Promise<void> {
    const remoteSkills = await remoteStore.listRemoteSkills();

    for (const skill of remoteSkills) {
      const content = await remoteStore.fetchSkill(skill.name);
      if (content) {
        await this.saveSkill(skill.name, content);
      }
    }
  }

  private parseFrontmatter(markdown: string): Record<string, any> {
    const match = markdown.match(/^---\n(.+?)\n---/s);
    if (!match) return {};

    try {
      return yaml.parse(match[1]);
    } catch {
      return {};
    }
  }

  private parseSkillContent(markdown: string): SkillContent {
    const frontmatter = this.parseFrontmatter(markdown);
    const content = markdown.replace(/^---\n.+?\n---\n*/s, '');

    return { frontmatter, markdown: content };
  }

  private formatSkillContent(content: SkillContent): string {
    const frontmatterYaml = yaml.stringify(content.frontmatter).trim();
    return `---\n${frontmatterYaml}\n---\n\n${content.markdown}`;
  }
}
```

### 使用示例
```typescript
import { ConfigManager } from '@codegraph/config';

// 创建配置管理器
const configManager = await ConfigManager.createFS();

// 读取配置
const config = await configManager.getConfig();
console.log(config.main_model);

// 更新配置
await configManager.updateConfig({ main_model: 'gpt-4' });

// 列出 skills
const skills = await configManager.listSkills();

// 获取特定 skill
const organizerSkill = await configManager.getSkill('organizer');

// 保存新 skill
await configManager.saveSkill('my-skill', {
  frontmatter: { name: 'my-skill', description: 'My custom skill' },
  markdown: '# Instructions\n...'
});
```

---

## 2. @codegraph/agent - Agent 包

### 设计目标
- **统一 Agent 能力**：封装现有的 LangGraph agent
- **双模式入口**：Server 模式和直接调用模式
- **配置解耦**：通过配置中心获取配置

### 目录结构
```
packages/agent/
├── src/
│   ├── core/
│   │   ├── Agent.ts                # Agent 核心类
│   │   ├── AgentBuilder.ts         # Agent 构建器
│   │   └── types.ts                # Agent 类型定义
│   ├── server/
│   │   ├── AgentServer.ts          # Server 模式实现
│   │   └── routes.ts               # API 路由
│   ├── direct/
│   │   └── DirectAgent.ts          # 直接调用模式实现
│   ├── middlewares/
│   │   └── index.ts                # 导出现有 middlewares
│   ├── tools/
│   │   └── index.ts                # 导出现有 tools
│   ├── graph.ts                    # LangGraph 定义
│   └── index.ts
└── package.json
```

### 核心 Agent 类

```typescript
import { StateGraph } from '@langchain/langgraph';
import { ConfigManager } from '@codegraph/config';
import type { AppConfig } from '@codegraph/config';

export interface AgentOptions {
  configManager: ConfigManager;
  middlewares?: AgentMiddleware[];
  recursionLimit?: number;
}

export class Agent {
  private configManager: ConfigManager;
  private graph: StateGraph;
  private middlewares: AgentMiddleware[];
  private recursionLimit: number;

  constructor(options: AgentOptions) {
    this.configManager = options.configManager;
    this.middlewares = options.middlewares || [];
    this.recursionLimit = options.recursionLimit || 200;
    this.graph = this.buildGraph();
  }

  /**
   * 构建 LangGraph
   */
  private buildGraph(): StateGraph {
    // 这里迁移现有的 graph.ts 逻辑
    // 包括 middleware 链的构建
    const graph = new StateGraph({ /* ... */ });

    // 应用 middlewares
    for (const middleware of this.middlewares) {
      // ...
    }

    return graph.compile();
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<AppConfig> {
    return await this.configManager.getConfig();
  }

  /**
   * 执行 Agent
   */
  async invoke(
    input: any,
    options?: { recursionLimit?: number }
  ): Promise<any> {
    const config = await this.getConfig();

    const initialState = {
      ...input,
      main_model: config.main_model,
      enable_thinking: config.enable_thinking,
    };

    return await this.graph.invoke(initialState, {
      recursionLimit: options?.recursionLimit || this.recursionLimit,
    });
  }

  /**
   * 流式执行 Agent
   */
  async stream(
    input: any,
    options?: { recursionLimit?: number }
  ): AsyncGenerator<any, void, unknown> {
    const config = await this.getConfig();

    const initialState = {
      ...input,
      main_model: config.main_model,
      enable_thinking: config.enable_thinking,
    };

    yield* this.graph.stream(initialState, {
      recursionLimit: options?.recursionLimit || this.recursionLimit,
    });
  }
}
```

### Server 模式（基于现有 server.ts）

```typescript
import { Hono } from 'hono';
import { registerGraph } from '@langgraph-js/pure-graph';
import { Agent } from '../core/Agent.js';
import { ConfigManager } from '@codegraph/config';

export class AgentServer {
  private agent: Agent;
  private app: Hono;
  private port: number;

  constructor(port: number = 8123) {
    this.port = port;
    this.app = new Hono();
    this.agent = this.createAgent();
    this.setupRoutes();
  }

  private async createAgent(): Promise<Agent> {
    const configManager = await ConfigManager.createFS();

    return new Agent({
      configManager,
      middlewares: [], // 这里可以注入 middlewares
    });
  }

  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (c) => {
      return c.json({ status: 'ok' });
    });

    // 注册 LangGraph
    registerGraph('code', this.agent['graph']);
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    // 使用现有的 Hono adapter
    const app = await import('@langgraph-js/pure-graph/dist/adapter/hono');
    const adapter = app.default;

    this.app.fire();

    console.log(`🚀 Agent Server listening on port ${this.port}`);
  }

  /**
   * 获取 fetch handler（用于 Cloudflare Workers 等）
   */
  get fetch(): Request => Response {
    return this.app.fetch;
  }

  /**
   * 获取端口
   */
  getPort(): number {
    return this.port;
  }
}
```

### 直接调用模式（基于现有 nonInteractive.ts）

```typescript
import { HumanMessage } from 'langchain';
import { Agent } from '../core/Agent.js';
import { ConfigManager } from '@codegraph/config';

export class DirectAgent {
  private agent: Agent;

  constructor() {
    this.agent = this.createAgent();
  }

  private async createAgent(): Promise<Agent> {
    const configManager = await ConfigManager.createFS();

    return new Agent({
      configManager,
      middlewares: [], // 这里可以注入 middlewares
    });
  }

  /**
   * 执行任务（非交互模式）
   */
  async run(prompt: string): Promise<any> {
    const initialState = {
      messages: [new HumanMessage(prompt)],
    };

    const result = await this.agent.invoke(initialState);

    const messages = result.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (lastMessage) {
      console.log(lastMessage.text);
    }

    return result;
  }

  /**
   * 流式执行任务
   */
  async runStream(prompt: string): AsyncGenerator<any, void, unknown> {
    const initialState = {
      messages: [new HumanMessage(prompt)],
    };

    yield* this.agent.stream(initialState);
  }
}
```

### 使用示例

#### Server 模式
```typescript
import { AgentServer } from '@codegraph/agent/server';

const server = new AgentServer(8123);
await server.start();
```

#### 直接调用模式
```typescript
import { DirectAgent } from '@codegraph/agent/direct';

const agent = new DirectAgent();
await agent.run('帮我分析这个文件');
```

#### 创建自定义 Agent
```typescript
import { Agent } from '@codegraph/agent';
import { ConfigManager } from '@codegraph/config';
import { SubAgentsMiddleware } from '@codegraph/agent/middlewares';

const configManager = await ConfigManager.createFS();
const agent = new Agent({
  configManager,
  middlewares: [
    new SubAgentsMiddleware(),
    // 其他 middlewares...
  ],
});

const result = await agent.invoke({
  messages: [new HumanMessage('你好')],
});
```

---

## 3. @codegraph/union-client - 客户端共享包

### 设计目标
- **代码复用**：汇总 TUI 和 Web UI 共用的逻辑
- **统一接口**：提供一致的 Hooks 和工具
- **类型安全**：共享 TypeScript 类型定义
- **轻量级**：只包含必要的共享代码

### 目录结构
```
packages/union-client/
├── src/
│   ├── hooks/
│   │   ├── useAgent.ts              # Agent 连接 Hook（核心）
│   │   ├── useConfig.ts             # 配置管理 Hook
│   │   ├── useSkills.ts             # Skills 管理 Hook
│   │   ├── usePlugins.ts            # 插件管理 Hook
│   │   └── useMemory.ts             # 记忆系统 Hook
│   ├── types/
│   │   ├── agent.ts                 # Agent 相关类型
│   │   ├── config.ts                # 配置类型
│   │   ├── message.ts               # 消息类型
│   │   └── tool.ts                  # 工具类型
│   ├── ui-tools/
│   │   ├── createUITool.ts          # UI 工具创建函数
│   │   ├── ToolManager.ts           # 工具管理器
│   │   └── tools.ts                 # 工具定义（read_file, write_file 等）
│   ├── utils/
│   │   ├── formatMessage.ts         # 消息格式化
│   │   ├── parseThinking.ts         # 思考内容解析
│   │   └── streamParser.ts          # 流式响应解析
│   └── index.ts
└── package.json
```

### 核心 Hooks

#### useAgent.ts（通用 Agent Hook）
```typescript
import { useChat } from '@langgraph-js/sdk/react';

export interface UseAgentOptions {
  serverUrl?: string;
  graphId?: string;
  recursionLimit?: number;
}

export function useAgent(options: UseAgentOptions = {}) {
  const {
    serverUrl = 'http://localhost:8123',
    graphId = 'code',
    recursionLimit = 200
  } = options;

  const chat = useChat({
    apiUrl: serverUrl,
    graphId,
    recursionLimit,
  });

  return {
    // 消息相关
    messages: chat.messages,
    sendMessage: chat.sendMessage,

    // 状态
    isLoading: chat.isLoading,
    error: chat.error,

    // 工具调用
    tools: chat.tools,

    // 配置
    config: chat.config,
    updateConfig: chat.updateConfig,

    // 生命周期
    reset: chat.reset,
  };
}
```

#### useConfig.ts（配置管理 Hook）
```typescript
import { useState, useEffect } from 'react';
import type { AppConfig } from './types/config';

export function useConfig(serverUrl: string = 'http://localhost:8123') {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载配置
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const response = await fetch(`${serverUrl}/config`);
        if (!response.ok) throw new Error('Failed to load config');
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [serverUrl]);

  // 更新配置
  const updateConfig = async (updates: Partial<AppConfig>) => {
    try {
      const response = await fetch(`${serverUrl}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update config');

      const newConfig = await response.json();
      setConfig(newConfig);
      return newConfig;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    config,
    loading,
    error,
    updateConfig,
  };
}
```

#### useSkills.ts（Skills 管理 Hook）
```typescript
import { useState, useEffect } from 'react';
import type { Skill, SkillContent } from './types/config';

export function useSkills(serverUrl: string = 'http://localhost:8123') {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载 Skills 列表
  useEffect(() => {
    async function loadSkills() {
      try {
        setLoading(true);
        const response = await fetch(`${serverUrl}/skills`);
        if (!response.ok) throw new Error('Failed to load skills');
        const data = await response.json();
        setSkills(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    loadSkills();
  }, [serverUrl]);

  // 获取特定 Skill
  const getSkill = async (name: string): Promise<SkillContent | null> => {
    try {
      const response = await fetch(`${serverUrl}/skills/${name}`);
      if (!response.ok) throw new Error('Failed to get skill');
      return await response.json();
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  // 保存 Skill
  const saveSkill = async (name: string, content: SkillContent): Promise<void> => {
    try {
      const response = await fetch(`${serverUrl}/skills/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });

      if (!response.ok) throw new Error('Failed to save skill');

      // 重新加载列表
      const listResponse = await fetch(`${serverUrl}/skills`);
      const data = await listResponse.json();
      setSkills(data);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // 删除 Skill
  const deleteSkill = async (name: string): Promise<void> => {
    try {
      const response = await fetch(`${serverUrl}/skills/${name}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete skill');

      setSkills(skills.filter(s => s.name !== name));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    skills,
    loading,
    error,
    getSkill,
    saveSkill,
    deleteSkill,
  };
}
```

### 共享类型定义

#### types/agent.ts
```typescript
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface AgentState {
  messages: AgentMessage[];
  tools: ToolCall[];
  config: AppConfig;
  isLoading: boolean;
  error?: Error;
}
```

#### types/message.ts
```typescript
import type { Message as LangGraphMessage } from '@langgraph-js/sdk';

export interface ParsedMessage {
  id: string;
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  thinking?: string;        // AI 思考内容
  toolCalls?: ToolCall[];   // 工具调用
  metadata?: Record<string, any>;
}

export function parseMessage(message: LangGraphMessage): ParsedMessage {
  // 解析逻辑...
}
```

### UI 工具系统

#### ui-tools/createUITool.ts
```typescript
import type { ToolRenderData } from '@langgraph-js/sdk';
import { createUITool as sdkCreateUITool } from '@langgraph-js/sdk';

export interface UIToolConfig {
  name: string;
  description: string;
  parameters?: any;
  handler: (args: any, toolManager: ToolManager) => Promise<any>;
  render?: (data: ToolRenderData) => React.ReactNode;
}

export function createUITool(config: UIToolConfig) {
  return sdkCreateUITool({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    handler: config.handler,
    render: config.render,
  });
}
```

#### ui-tools/tools.ts（定义所有工具）
```typescript
import { createUITool } from './createUITool';

// 读取文件工具
export const read_file_tool = createUITool({
  name: 'read_file',
  description: 'Read a file from the filesystem',
  parameters: { file_path: { type: 'string' } },
  handler: async ({ file_path }, toolManager) => {
    // 实现逻辑...
  },
  render: (data) => {
    // TUI 和 Web UI 各自实现渲染
    return null;
  },
});

// 写入文件工具
export const write_file_tool = createUITool({
  name: 'write_file',
  description: 'Write content to a file',
  parameters: { file_path: { type: 'string' }, content: { type: 'string' } },
  handler: async ({ file_path, content }, toolManager) => {
    // 实现逻辑...
  },
});

// 终端工具
export const terminal_tool = createUITool({
  name: 'terminal',
  description: 'Execute terminal commands',
  parameters: { command: { type: 'string' } },
  handler: async ({ command }, toolManager) => {
    // 实现逻辑...
  },
});

// 批量命令工具
export const batch_command_tool = createUITool({
  name: 'batch_command',
  description: 'Execute multiple commands in batch',
  parameters: { commands: { type: 'array' } },
  handler: async ({ commands }, toolManager) => {
    // 实现逻辑...
  },
});

// 导出所有工具
export const allTools = [
  read_file_tool,
  write_file_tool,
  terminal_tool,
  batch_command_tool,
  // ... 其他工具
];
```

### 工具函数

#### utils/formatMessage.ts
```typescript
import type { ParsedMessage } from '../types/message';

export function formatMessage(message: ParsedMessage): string {
  if (message.type === 'tool') {
    return `[Tool] ${message.content}`;
  }

  if (message.thinking) {
    return `Thinking: ${message.thinking}\n\n${message.content}`;
  }

  return message.content;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}
```

#### utils/parseThinking.ts
```typescript
import { getThinkingContent } from '@langgraph-js/sdk';

export function parseThinkingContent(message: any): string | null {
  try {
    return getThinkingContent(message) || null;
  } catch {
    return null;
  }
}

export function hasThinking(message: any): boolean {
  return parseThinkingContent(message) !== null;
}
```

### 使用示例

#### 在 zen-code (TUI) 中使用
```typescript
import { useAgent, useConfig } from '@codegraph/union-client';
import { Box, Text } from 'ink';

export function Chat() {
  const { messages, sendMessage, isLoading } = useAgent();
  const { config, updateConfig } = useConfig();

  return (
    <Box>
      <Text>当前模型: {config?.main_model}</Text>
      {/* TUI 组件 */}
    </Box>
  );
}
```

#### 在 zen-worker (Web) 中使用
```typescript
import { useAgent, useConfig } from '@codegraph/union-client';

export function ChatPage() {
  const { messages, sendMessage, isLoading } = useAgent();
  const { config, updateConfig } = useConfig();

  return (
    <div>
      <p>当前模型: {config?.main_model}</p>
      {/* Web 组件 */}
    </div>
  );
}
```

### 依赖关系
```json
{
  "name": "@codegraph/union-client",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./src/index.ts",
    "./hooks": "./src/hooks/index.ts",
    "./types": "./src/types/index.ts",
    "./ui-tools": "./src/ui-tools/index.ts"
  },
  "dependencies": {
    "@codegraph/config": "workspace:*",
    "@langgraph-js/sdk": "^4.4.0",
    "react": "^18.3.1"
  },
  "peerDependencies": {
    "react": "^18.3.1"
  }
}
```

---

## 4. zen-code - TUI 客户端

### 设计目标
- **TUI 交互**：终端用户界面，基于 Ink
- **CLI 工具**：命令行工具，支持非交互模式
- **现有代码迁移**：将 tui/ 重命名为 zen-code/

### 目录结构（迁移后）
```
zen-code/
├── src/
│   ├── chat/
│   │   ├── Chat.tsx               # 主聊天界面
│   │   ├── store/
│   │   │   └── index.ts           # 配置存储（迁移到 @codegraph/config）
│   │   ├── components/            # TUI 组件
│   │   │   ├── MessageAI.tsx
│   │   │   ├── MessageTool.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── ...
│   │   ├── tools/                 # UI 工具定义
│   │   │   ├── read_file.tsx
│   │   │   ├── write_file.tsx
│   │   │   ├── terminal.tsx
│   │   │   └── ...
│   │   ├── hooks/                 # TUI Hooks
│   │   │   └── useRalphLoop.ts
│   │   └── context/
│   │       └── CommandHandler.tsx
│   ├── cli.ts                     # CLI 入口（支持多种模式）
│   ├── app.tsx                    # TUI 应用入口
│   ├── nonInteractive.ts          # 非交互模式
│   └── index.ts
├── package.json
└── tsconfig.json
```

### CLI 模式
```typescript
// zen-code CLI 使用示例
zen-code                    # 启动 TUI
zen-code init               # 初始化配置
zen-code -p "你的任务"       # 非交互模式
zen-code --yolo             # YOLO 模式
echo "任务" | zen-code      # 管道模式
```

### 依赖关系
```json
{
  "name": "zen-code",
  "dependencies": {
    "@codegraph/config": "workspace:*",
    "@codegraph/agent": "workspace:*",
    "ink": "^4.4.1",
    "react": "^18.3.1",
    "@langgraph-js/sdk": "^4.4.0"
  }
}
```

---

## 4. zen-worker - Web UI 客户端

### 设计目标
- **Web 界面**：现代化的 Web 应用
- **实时通信**：通过 WebSocket 与 Agent Server 通信
- **跨平台**：支持浏览器访问

### 目录结构
```
zen-worker/
├── src/
│   ├── pages/
│   │   ├── ChatPage.tsx           # 聊天页面
│   │   ├── ConfigPage.tsx         # 配置页面
│   │   ├── SkillsPage.tsx         # Skills 管理页面
│   │   ├── PluginsPage.tsx        # 插件管理页面
│   │   └── HistoryPage.tsx        # 历史记录页面
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── MessageList.tsx    # 消息列表
│   │   │   ├── MessageItem.tsx    # 消息项
│   │   │   ├── InputArea.tsx      # 输入区域
│   │   │   └── ToolCall.tsx       # 工具调用展示
│   │   ├── Config/
│   │   │   ├── ModelSelector.tsx  # 模型选择器
│   │   │   ├── ApiKeyInput.tsx    # API Key 输入
│   │   │   └── ThinkingToggle.tsx # 思考模式开关
│   │   ├── Skills/
│   │   │   ├── SkillList.tsx      # Skill 列表
│   │   │   ├── SkillEditor.tsx    # Skill 编辑器
│   │   │   └── SkillCreate.tsx    # 创建 Skill
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx        # 侧边栏
│   │   │   ├── Header.tsx         # 头部
│   │   │   └── Main.tsx           # 主内容区
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   ├── hooks/
│   │   ├── useAgent.ts            # Agent 连接 Hook
│   │   ├── useConfig.ts           # 配置 Hook
│   │   ├── useSkills.ts           # Skills Hook
│   │   ├── useWebSocket.ts        # WebSocket Hook
│   │   └── useTheme.ts            # 主题 Hook
│   ├── lib/
│   │   ├── api.ts                 # API 客户端
│   │   └── websocket.ts           # WebSocket 客户端
│   ├── styles/
│   │   ├── globals.css
│   │   └── theme.css
│   ├── App.tsx                    # 应用根组件
│   ├── main.tsx                   # 入口文件
│   └── router.tsx                 # 路由配置
├── public/
│   ├── index.html
│   └── favicon.ico
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

### 核心页面设计

#### ChatPage.tsx
```typescript
import React, { useState } from 'react';
import { useAgent } from '../hooks/useAgent';
import { MessageList } from '../components/Chat/MessageList';
import { InputArea } from '../components/Chat/InputArea';
import { ToolCall } from '../components/Chat/ToolCall';

export function ChatPage() {
  const { messages, sendMessage, isLoading, tools } = useAgent();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Zen Worker</h2>
        <nav className="space-y-2">
          <a href="/" className="block p-2 rounded hover:bg-gray-800">聊天</a>
          <a href="/config" className="block p-2 rounded hover:bg-gray-800">配置</a>
          <a href="/skills" className="block p-2 rounded hover:bg-gray-800">Skills</a>
          <a href="/history" className="block p-2 rounded hover:bg-gray-800">历史</a>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          <MessageList messages={messages} />
          {isLoading && <div className="text-gray-500">思考中...</div>}
        </div>

        <div className="border-t p-4">
          <InputArea
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            disabled={isLoading}
          />
        </div>
      </main>

      {/* 工具调用面板 */}
      {tools.length > 0 && (
        <aside className="w-80 bg-gray-50 p-4 overflow-auto">
          <h3 className="font-bold mb-2">工具调用</h3>
          {tools.map((tool, i) => (
            <ToolCall key={i} tool={tool} />
          ))}
        </aside>
      )}
    </div>
  );
}
```

#### ConfigPage.tsx
```typescript
import React from 'react';
import { useConfig } from '../hooks/useConfig';
import { ModelSelector } from '../components/Config/ModelSelector';
import { ApiKeyInput } from '../components/Config/ApiKeyInput';
import { ThinkingToggle } from '../components/Config/ThinkingToggle';

export function ConfigPage() {
  const { config, loading, updateConfig } = useConfig();

  if (loading) return <div>加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">配置</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">模型设置</h2>
          <ModelSelector
            value={config.main_model}
            onChange={(model) => updateConfig({ main_model: model })}
          />
          <ThinkingToggle
            checked={config.enable_thinking}
            onChange={(enabled) => updateConfig({ enable_thinking: enabled })}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">API 密钥</h2>
          <ApiKeyInput
            label="OpenAI API Key"
            value={config.openai_api_key || ''}
            onChange={(key) => updateConfig({ openai_api_key: key })}
          />
          <ApiKeyInput
            label="Anthropic API Key"
            value={config.anthropic_api_key || ''}
            onChange={(key) => updateConfig({ anthropic_api_key: key })}
          />
        </section>
      </div>
    </div>
  );
}
```

### 核心 Hooks

#### useAgent.ts
```typescript
import { useChat } from '@langgraph-js/sdk/react';

export interface UseAgentOptions {
  serverUrl?: string;
  graphId?: string;
}

export function useAgent(options: UseAgentOptions = {}) {
  const { serverUrl = 'http://localhost:8123', graphId = 'code' } = options;

  const chat = useChat({
    apiUrl: serverUrl,
    graphId,
  });

  return {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    isLoading: chat.isLoading,
    error: chat.error,
    tools: chat.tools,
  };
}
```

#### useConfig.ts
```typescript
import { useState, useEffect } from 'react';
import type { AppConfig } from '@codegraph/config';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 Agent Server API 获取配置
    fetch('http://localhost:8123/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      });
  }, []);

  const updateConfig = async (updates: Partial<AppConfig>) => {
    const response = await fetch('http://localhost:8123/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const newConfig = await response.json();
    setConfig(newConfig);
  };

  return { config, loading, updateConfig };
}
```

#### useWebSocket.ts（用于实时通信）
```typescript
import { useEffect, useState } from 'react';

export function useWebSocket(url: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const websocket = new WebSocket(url);

    websocket.onopen = () => setConnected(true);
    websocket.onclose = () => setConnected(false);

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [url]);

  const send = (data: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  return { connected, send };
}
```

### 技术栈
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: React Router v6
- **样式**: Tailwind CSS
- **状态管理**: React Hooks (+ Zustand 可选)
- **HTTP 客户端**: fetch / axios
- **实时通信**: WebSocket / Server-Sent Events

### 依赖关系
```json
{
  "name": "zen-worker",
  "dependencies": {
    "@codegraph/config": "workspace:*",
    "@codegraph/agent": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.20.0",
    "@langgraph-js/sdk": "^4.4.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "@types/react": "^18.2.0"
  }
}
```

---

## 5. Monorepo 结构

### 根目录 package.json
```json
{
  "name": "code-graph",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "zen-code",
    "zen-worker"
  ],
  "scripts": {
    "dev:server": "bun run agents/code/server.ts",
    "dev:tui": "bun run zen-code/src/cli.ts",
    "dev:web": "bun run zen-worker",
    "build": "pnpm -r --filter './packages/*' build && pnpm --filter zen-code build && pnpm --filter zen-worker build",
    "build:packages": "pnpm -r --filter './packages/*' build",
    "build:zen-code": "pnpm --filter zen-code build",
    "build:zen-worker": "pnpm --filter zen-worker build",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "@types/node": "^20.19.30",
    "typescript": "^5.9.3"
  }
}
```

### 包之间的依赖关系
```
@codegraph/config
  ↓ (被依赖)
@codegraph/agent ──────────────→ @langgraph-js/sdk
  ↓                              ↓
@codegraph/union-client ────────→ @langgraph-js/sdk/react
  ↓           ↓
  ↓           └──────────────────┐
  ↓                              ↓
zen-code (TUI)          zen-worker (Web)
  ↓                        ↓
@langgraph-js/sdk        @langgraph-js/sdk/react
```

**依赖说明**：
- `@codegraph/config`: 纯配置中心，无平台依赖
- `@codegraph/agent`: 依赖 config，提供 Agent 能力
- `@codegraph/union-client`: 依赖 config 和 agent，提供共享的客户端逻辑
- `zen-code`: 依赖 config、agent、union-client，使用 Ink 渲染 TUI
- `zen-worker`: 依赖 config、agent、union-client，使用 React 渲染 Web UI

### package.json 依赖示例

#### @codegraph/config
```json
{
  "name": "@codegraph/config",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "lowdb": "^7.0.1",
    "yaml": "^2.8.2",
    "zod": "^4.3.5"
  }
}
```

#### @codegraph/agent
```json
{
  "name": "@codegraph/agent",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server/AgentServer.ts",
    "./direct": "./src/direct/DirectAgent.ts",
    "./middlewares": "./src/middlewares/index.ts"
  },
  "dependencies": {
    "@codegraph/config": "workspace:*",
    "@langchain/anthropic": "^1.3.10",
    "@langchain/core": "^1.1.15",
    "@langchain/langgraph": "^1.1.0",
    "@langchain/mcp-adapters": "^1.1.1",
    "@langchain/openai": "^1.2.2",
    "@langgraph-js/pure-graph": "^2.10.0",
    "hono": "^4.11.4"
  }
}
```

#### @codegraph/union-client
```json
{
  "name": "@codegraph/union-client",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./src/index.ts",
    "./hooks": "./src/hooks/index.ts",
    "./types": "./src/types/index.ts",
    "./ui-tools": "./src/ui-tools/index.ts"
  },
  "dependencies": {
    "@codegraph/config": "workspace:*",
    "@langgraph-js/sdk": "^4.4.0",
    "react": "^18.3.1"
  },
  "peerDependencies": {
    "react": "^18.3.1"
  }
}
```

#### zen-code
```json
{
  "name": "zen-code",
  "version": "1.0.0",
  "type": "module",
  "bin": "./dist/cli.js",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@codegraph/config": "workspace:*",
    "@codegraph/agent": "workspace:*",
    "@codegraph/union-client": "workspace:*",
    "ink": "^4.4.1",
    "react": "^18.3.1",
    "@langgraph-js/sdk": "^4.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.19.30",
    "tsx": "^4.21.0"
  }
}
```

#### zen-worker
```json
{
  "name": "zen-worker",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@codegraph/config": "workspace:*",
    "@codegraph/agent": "workspace:*",
    "@codegraph/union-client": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.20.0",
    "@langgraph-js/sdk": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.9.3",
    "vite": "^5.0.0"
  }
}
```

---

## 6. 迁移路径

### 阶段 1：配置中心抽离（1-2 天）
1. 创建 `packages/config/` 目录
2. 实现核心接口（IConfigStore, ISkillStore, IPluginStore）
3. 实现文件系统版本（FileSystemConfigStore, FileSystemSkillStore）
4. 将 `tui/src/chat/store/index.ts` 逻辑迁移到 `FileSystemConfigStore`
5. 在 TUI 中测试新配置系统

### 阶段 2：Agent 包重构（2-3 天）
1. 创建 `packages/agent/` 目录
2. 实现 `Agent` 核心类
3. 重构 `server.ts` 到 `AgentServer`
4. 重构 `nonInteractive.ts` 到 `DirectAgent`
5. 迁移 middlewares 和 tools 到新包
6. 保持向后兼容（现有入口仍然工作）

### 阶段 3：TUI 迁移（1-2 天）
1. 重命名 `tui/` → `zen-code/`
2. 更新 `zen-code/package.json` 依赖 `@codegraph/config` 和 `@codegraph/agent`
3. 更新导入路径使用 workspace 包
4. 更新根 package.json 的 `dev` 脚本
5. 测试所有 CLI 模式（TUI、非交互、管道）

### 阶段 4：Web UI 开发（5-7 天）
1. 创建 `zen-worker/` 目录
2. 初始化 Vite + React + TypeScript 项目
3. 配置 Tailwind CSS
4. 实现核心页面（ChatPage、ConfigPage、SkillsPage）
5. 实现 Hooks（useAgent、useConfig、useWebSocket）
6. 连接 Agent Server API
7. 实现实时通信（WebSocket）
8. 样式和响应式设计

### 阶段 5：文档和测试（1-2 天）
1. 为每个包添加 README
2. 添加使用示例
3. 添加单元测试
4. 更新主项目 README

---

## 7. 使用示例

### zen-code (TUI)

```bash
# 安装
pnpm install

# 启动 TUI
pnpm dev:tui

# 非交互模式
pnpm dev:tui -p "帮我分析这个文件"

# 管道模式
echo "分析代码" | pnpm dev:tui

# YOLO 模式
pnpm dev:tui --yolo
```

### zen-worker (Web UI)

```bash
# 启动 Agent Server（终端 1）
pnpm dev:server

# 启动 Web UI（终端 2）
pnpm dev:web

# 访问
# http://localhost:5173
```

### API 使用

```typescript
// 使用 @codegraph/config
import { ConfigManager } from '@codegraph/config';

const configManager = await ConfigManager.createFS();
const config = await configManager.getConfig();
await configManager.updateConfig({ main_model: 'gpt-4' });

// 使用 @codegraph/agent
import { Agent } from '@codegraph/agent';
import { ConfigManager } from '@codegraph/config';

const configManager = await ConfigManager.createFS();
const agent = new Agent({ configManager });

const result = await agent.invoke({
  messages: [new HumanMessage('你好')],
});

// 使用 @codegraph/union-client（在 React 组件中）
import { useAgent, useConfig } from '@codegraph/union-client';

function MyComponent() {
  const { messages, sendMessage, isLoading } = useAgent();
  const { config, updateConfig } = useConfig();

  return (
    <div>
      <button onClick={() => updateConfig({ main_model: 'gpt-4' })}>
        切换模型
      </button>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg.content}</li>
        ))}
      </ul>
    </div>
  );
}
```

const configManager = await ConfigManager.createFS();
const agent = new Agent({ configManager });

const result = await agent.invoke({
  messages: [new HumanMessage('你好')],
});
```

---

## 8. 向后兼容性

### 现有入口保持工作
```typescript
// 现有代码仍然可以工作
import { graph } from './agents/code/graph.js';

// 内部实现迁移到新架构，但 API 不变
export const graph = createGraph(); // 使用 @codegraph/agent 内部实现
```

### 渐进式迁移
- `tui/` → `zen-code/` 只是重命名和依赖更新
- `agents/code/` 内部实现迁移到 `@codegraph/agent`
- 现有 CLI 命令保持不变
- 新功能优先使用新架构

---

## 9. 部署方案

### 开发环境
```bash
# 三个独立进程
pnpm dev:server   # Agent Server (8123)
pnpm dev:tui      # TUI (终端)
pnpm dev:web      # Web UI (5173)
```

### 生产环境

#### 方案 1：单机部署
```bash
# 启动 Agent Server
bun run packages/agent/src/server.ts

# 启动 Web UI（反向代理）
cd zen-worker && bun run start
```

#### 方案 2：Docker 部署
```dockerfile
# docker/Dockerfile
FROM oven/bun:1

WORKDIR /app

# 安装依赖
COPY package.json pnpm-lock.yaml ./
RUN bun install

# 构建
COPY . .
RUN bun run build

# 启动
EXPOSE 8123 3000
CMD ["bun", "run", "start:all"]
```

#### 方案 3：分离部署
- **Agent Server**: 部署到服务器/Cloudflare Workers
- **Web UI**: 部署到 Vercel/Netlify（静态构建）
- **TUI**: 本地安装使用

---

## 10. 优势

### 模块化
- 每个包职责单一，易于维护
- 可以独立版本化和发布
- 清晰的依赖关系

### 可扩展
- 新客户端可以复用 `@codegraph/agent`
- 新配置来源可以实现 `IConfigStore`
- 插件系统支持扩展

### 可测试
- 纯函数和抽象接口易于测试
- 可以 mock 依赖
- 单元测试覆盖率高

### 类型安全
- TypeScript 全程支持
- 接口定义清晰
- workspace 依赖类型共享

### 性能优化
- 配置缓存
- 按需加载
- 流式处理
- WebSocket 实时通信

### 用户体验
- TUI：适合开发者、快速操作
- Web UI：可视化、跨平台、实时协作
- CLI：自动化、CI/CD 集成

---

## 11. 待讨论的问题

1. **远程商店实现**：是否需要内置远程商店实现？还是只提供接口？
2. **插件系统**：插件的具体实现方式？
3. **认证机制**：Server 模式的认证和授权？
4. **状态管理**：Web UI 是否需要 Zustand 或继续用 Hooks？
5. **实时协作**：是否需要多用户同时使用同一个 Agent？
6. **部署方案**：Agent Server 的部署方案（Docker、Cloudflare Workers 等）？
7. **离线模式**：是否需要支持完全离线使用（本地 LLM）？
