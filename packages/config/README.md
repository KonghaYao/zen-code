# @codegraph/config

统一的配置管理系统，提供管理器、服务器和客户端三种模式。

## 架构

- **ConfigManager**: 配置管理核心类
- **ConfigServer**: HTTP 服务器（基于原生 fetch API，跨平台）
- **Remote Implementations**: 远程客户端实现
- **Adapters**: 平台适配器（Node.js / Bun / Deno）

## 使用方式

### 1. 本地模式（文件系统）

```typescript
import { createFSManager } from '@codegraph/config';

const manager = await createFSManager();
const config = await manager.getConfig();
```

### 2. 服务器模式

```typescript
import { createConfigServer, startServer } from '@codegraph/config';

// 启动服务器
const server = await createConfigServer();
const adapter = await startServer(server, 3000);

// 停止服务器
await adapter.close();
```

### 3. 客户端模式（远程连接）

```typescript
import { createRemoteManager } from '@codegraph/config';

// 连接到远程 ConfigServer
const manager = await createRemoteManager('http://localhost:3000');

// 使用方式与本地完全相同
const config = await manager.getConfig();
await manager.updateConfig({ main_model: 'claude-3-5' });

const skills = await manager.listSkills();
await manager.saveSkill('my-skill', { description: '...', content: '...' });
```

### 4. 自定义实现

```typescript
import { createCustomManager } from '@codegraph/config';

const manager = await createCustomManager({
  configStore: new MyConfigStore(),
  skillStore: new MySkillStore(),
  pluginStore: new MyPluginStore(),
});
```

### 5. 指定平台启动服务器

```typescript
import { createConfigServer, startNodeServer, startBunServer, startDenoServer } from '@codegraph/config';

const server = await createConfigServer();

// Node.js
const nodeAdapter = await startNodeServer(server, 3000);

// Bun
const bunAdapter = await startBunServer(server, 3000);

// Deno
const denoAdapter = await startDenoServer(server, 3000);
```

### 6. 集成到现有服务器

```typescript
import { createConfigServer } from '@codegraph/config';

const configServer = await createConfigServer();

// 集成到其他 fetch 服务器
Bun.serve({
  port: 3000,
  async fetch(request) {
    // 代理到 config server
    if (request.url.startsWith('/api/')) {
      return configServer.fetch(request);
    }
    // 其他路由...
    return new Response('Not found', { status: 404 });
  },
});
```

## API 端点

### 配置
- `GET /api/config` - 获取配置
- `POST /api/config` - 更新配置

### Skills
- `GET /api/skills` - 列出所有 skills
- `GET /api/skill?name=xxx` - 获取 skill 详情
- `PUT /api/skill` - 保存 skill `{name, content}`
- `DELETE /api/skill` - 删除 skill `{name}`
- `POST /api/skills/sync` - 从远程同步 skills

### Plugins
- `GET /api/plugins` - 列出所有 plugins
- `GET /api/plugin/config?name=xxx` - 获取 plugin 配置
- `PUT /api/plugin/config` - 更新 plugin 配置 `{name, config}`
- `POST /api/plugin/install` - 安装 plugin `{name, source}`
- `DELETE /api/plugin` - 卸载 plugin `{name}`

### 健康检查
- `GET /api/health` - 健康检查

## 远程实现类

```typescript
import { RemoteConfigStore, RemoteSkillStore, RemotePluginStore } from '@codegraph/config';

// 单独使用远程实现
const configStore = new RemoteConfigStore('http://localhost:3000');
const skillStore = new RemoteSkillStore('http://localhost:3000');
const pluginStore = new RemotePluginStore('http://localhost:3000');

// 或使用工厂函数
const manager = await createRemoteManager('http://localhost:3000');
```

## 技术栈

- ✅ 原生 fetch API（Request/Response）
- ✅ 简单路径匹配（无依赖）
- ✅ 跨平台支持（Node.js / Bun / Deno）
- ✅ 无第三方框架依赖
- ✅ JSON 自动序列化
- ✅ 远程客户端实现

## 平台支持

| 平台 | 状态 | 启动方式 |
|------|------|---------|
| Node.js | ✅ | `startNodeServer()` 或 `startServer()` |
| Bun | ✅ | `startBunServer()` 或 `startServer()` |
| Deno | ✅ | `startDenoServer()` 或 `startServer()` |

## 设计原则

1. **跨平台**: 通过适配器模式支持多个运行时
2. **无依赖**: 只使用 Web 标准 API
3. **可组合**: 可集成到任何支持 fetch 的服务器
4. **类型安全**: 完整的 TypeScript 类型支持
5. **统一接口**: 本地和远程使用相同的 API
