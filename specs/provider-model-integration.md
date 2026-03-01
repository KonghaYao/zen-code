# Provider-Model 集成设计规格

## 概述

将 zen-swarm 的 Provider 系统与 Model/Agent 体系建立完整的数据库关联，实现：

1. Provider → Model 的外键关联
2. 彻底摆脱环境变量依赖
3. 支持多 Provider 类型和自定义 Base URL

**状态：✅ 已实现（2025-03-01）**

---

## 问题分析

### 原架构问题

```
┌─────────────────┐     ┌─────────────────┐
│    Provider     │     │     Model       │
├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │
│ name            │     │ model_name      │
│ type            │     │ model_provider  │ ◄── 字符串，无关联
│ apiKey          │     │ temperature     │
│ baseUrl         │     │ ...             │
│ isActive        │     │                 │
└─────────────────┘     └─────────────────┘
        │                       │
        │    ❌ 无关联           │
        └───────────────────────┘

        ↓ 运行时行为

┌─────────────────────────────────────────┐
│  Agent Factory                           │
├─────────────────────────────────────────┤
│  1. 加载 Agent → Model 配置              │
│  2. 获取活跃 Provider                    │
│  3. 验证 provider.type == model_provider │
│  4. 如果不匹配 → fallback 环境变量       │ ◄── 问题！
└─────────────────────────────────────────┘
```

### 问题点

1. **无数据库关联**: Provider 和 Model 之间没有外键约束
2. **类型不匹配风险**: `model_provider` 是自由文本，可能拼写错误
3. **环境变量依赖**: 类型不匹配时 fallback 到环境变量
4. **Provider 类型受限**: 仅支持 `openai` | `anthropic`，不支持 `gemini`、`deepseek` 等

---

## 设计方案

### 新的数据库架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Entity Relationship Diagram                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐  │
│   │   Provider   │──1:N──►│    Model     │──N:1──►│    Agent     │  │
│   ├──────────────┤        ├──────────────┤        ├──────────────┤  │
│   │ id (PK)      │        │ id (PK)      │        │ id (PK)      │  │
│   │ name         │        │ name         │        │ name         │  │
│   │ type (enum)  │        │ provider_id  │◄───────│ model_id (FK)│  │
│   │ api_key      │        │ model_name   │        │ prompt_id    │  │
│   │ base_url     │        │ temperature  │        │ ...          │  │
│   │ is_active    │        │ ...          │        └──────────────┘  │
│   └──────────────┘        └──────────────┘                          │
│                                                                      │
│   ProviderType (代码枚举):                                           │
│   'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'moonshot' |    │
│   'zhipu' | 'custom'                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心改动

1. **Model 表添加 `provider_id` 外键**（应用层约束）
2. **移除 Model 表的 `model_provider` 字段**（通过关联获取）
3. **扩展 Provider Type 枚举**
4. **Agent Factory 直接从 Model → Provider 获取 apiKey**

---

## 数据库 Schema

### Provider 表

```sql
CREATE TABLE providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN (
        'openai',
        'anthropic',
        'gemini',
        'deepseek',
        'moonshot',
        'zhipu',
        'custom'
    )),
    api_key_encrypted TEXT NOT NULL,
    api_key_iv TEXT NOT NULL,
    api_key_auth_tag TEXT NOT NULL,
    base_url TEXT NOT NULL,
    is_active INTEGER DEFAULT 0 CHECK(is_active IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_providers_type ON providers(type);
CREATE INDEX idx_providers_is_active ON providers(is_active);

-- 触发器：确保仅有一个活跃提供商
CREATE TRIGGER ensure_single_active_provider_update
AFTER UPDATE OF is_active ON providers
WHEN NEW.is_active = 1
BEGIN
    UPDATE providers SET is_active = 0 WHERE id != NEW.id AND is_active = 1;
END;

CREATE TRIGGER ensure_single_active_provider_insert
AFTER INSERT ON providers
WHEN NEW.is_active = 1
BEGIN
    UPDATE providers SET is_active = 0 WHERE id != NEW.id AND is_active = 1;
END;
```

### Model 表（实际实现）

```sql
CREATE TABLE models (
    id TEXT PRIMARY KEY,
    name TEXT,                             -- 显示名称（可为空）
    provider_id TEXT NOT NULL DEFAULT '',  -- 应用层外键（无 DB 级约束）
    model_name TEXT NOT NULL,              -- 实际模型 ID，如 "gpt-4o"
    stream_usage INTEGER NOT NULL DEFAULT 0,
    enable_thinking INTEGER NOT NULL DEFAULT 0,
    temperature REAL NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    top_p REAL NOT NULL DEFAULT 1.0,
    frequency_penalty REAL NOT NULL DEFAULT 0.0,
    presence_penalty REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_models_provider_id ON models(provider_id);
```

> **注意**：`provider_id` 使用应用层约束而非 SQLite 外键，原因是 providers 表在 `ProviderStorage`
> 中独立管理，避免跨存储层的约束复杂度。完整性通过 API 层的创建/删除检查保证。

### 迁移路径（旧 `model_provider` → 新 `provider_id`）

`BunSqliteStorage.runMigrations()` 在启动时自动处理：

```typescript
// 旧结构：有 model_provider 列
if (getModelsColumns().includes('model_provider')) {
    // 重建表，复制已有 provider_id（通过 ALTER 添加的列）
    // COALESCE(NULLIF(provider_id, ''), '') as provider_id
    return;
}

// 补充：没有 provider_id 列时自动添加
if (!getModelsColumns().includes('provider_id')) {
    db.run("ALTER TABLE models ADD COLUMN provider_id TEXT NOT NULL DEFAULT ''");
}
```

---

## TypeScript 类型定义

### Provider Types（`packages/standard-agent/src/schemas.ts`）

```typescript
export const ProviderTypeSchema = z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'moonshot', 'zhipu', 'custom']);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;
```

### Model Schema（`packages/standard-agent/src/schemas.ts`）

```typescript
export const ModelSchema = z.object({
    id: z.string(),
    name: z.string().optional(), // 显示名称（可选）
    provider_id: z.string(), // 外键关联
    model_name: z.string(), // 实际模型 ID
    stream_usage: z.boolean().default(false),
    enable_thinking: z.boolean().default(false),
    temperature: z.number().default(0.7),
    max_tokens: z.number().default(4096),
    top_p: z.number().default(1.0),
    frequency_penalty: z.number().default(0.0),
    presence_penalty: z.number().default(0.0),
});
```

### Provider Interface（`zen-swarm/src/services/provider/storage.ts`）

```typescript
export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    apiKey: string; // 返回时脱敏（maskApiKey）
    baseUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    gemini: 'https://generativelanguage.googleapis.com',
    deepseek: 'https://api.deepseek.com/v1',
    moonshot: 'https://api.moonshot.cn/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    custom: '',
};
```

---

## API 设计（tRPC）

### tRPC Context（`zen-swarm/src/api/trpc.ts`）

`providerStorage` 已加入 Context：

```typescript
export interface Context {
    agentPackage: AgentPackage;
    cronStorage: CronStorage;
    cronScheduler: CronScheduler;
    providerStorage: ProviderStorage; // ◄── 新增
}
```

### Provider Router（`zen-swarm/src/api/providers.ts`）

新增端点：

| 端点                          | 说明                                          |
| ----------------------------- | --------------------------------------------- |
| `providers.list`              | 列出所有 Provider                             |
| `providers.get`               | 获取单个 Provider                             |
| `providers.getActive`         | 获取活跃 Provider                             |
| `providers.create`            | 创建 Provider                                 |
| `providers.update`            | 更新 Provider                                 |
| `providers.delete`            | 删除 Provider（检查关联 Model，有关联则拒绝） |
| `providers.setActive`         | 设置活跃 Provider                             |
| `providers.getModels`         | 获取 Provider 下的所有 Model                  |
| `providers.getDefaultBaseUrl` | 获取各类型默认 Base URL                       |
| `providers.getProviderTypes`  | 获取所有 Provider 类型信息                    |
| `providers.validateApiKey`    | 验证 API Key 格式                             |

删除检查实现：

```typescript
delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const models = await ctx.agentPackage.storage.getAllModels();
    const linkedModels = models.filter((m) => m.provider_id === input.id);

    if (linkedModels.length > 0) {
        throw new Error(
            `无法删除：有 ${linkedModels.length} 个模型正在使用此 Provider` +
            `（${linkedModels.map((m) => m.name || m.model_name).join(', ')}）`
        );
    }

    await providerStorage.delete(input.id);
    return { success: true, id: input.id };
}),
```

### Model Router（`zen-swarm/src/api/models.ts`）

新增端点：

| 端点                    | 说明                                  |
| ----------------------- | ------------------------------------- |
| `models.list`           | 列出所有 Model（含 Provider 信息）    |
| `models.get`            | 获取单个 Model（含 Provider 信息）    |
| `models.create`         | 创建 Model（验证 Provider 存在）      |
| `models.update`         | 更新 Model（更新 provider_id 时验证） |
| `models.delete`         | 删除 Model（检查是否被 Agent 使用）   |
| `models.listByProvider` | 按 Provider 分组列出 Models           |
| `models.createMany`     | 批量创建（验证所有 provider_id）      |

---

## Agent Factory 改造

### 实际实现（`zen-swarm/src/agents/factory.ts`）

```typescript
export async function createSwarmAgent(agentId, pkg, state, options) {
    // 1. 加载 Agent 配置
    const agentConfig = await pkg.getAgent(agentId);

    // 2. 加载 Model 配置
    const modelConfig = await pkg.getModel(agentConfig.modelId);

    // 3. 检查 provider_id 是否已设置
    const providerId = modelConfig.provider_id;
    if (!providerId) {
        throw new Error(
            `Model "${modelConfig.name || modelConfig.id}" has no provider assigned. ` +
                `Please assign a provider in the Model settings.`,
        );
    }

    // 4. 加载 Provider 配置
    const provider = await providerStorage.getById(providerId);
    if (!provider) {
        throw new Error(`Provider not found for model "${modelConfig.name || modelConfig.id}".`);
    }

    // 5. 获取解密后的 API Key
    const decryptedApiKey = await providerStorage.getDecryptedApiKey(providerId);
    if (!decryptedApiKey) {
        throw new Error(`Provider "${provider.name}" has no API Key configured.`);
    }

    // 6. 加载 Prompt
    const promptConfig = await pkg.getPromptWithContent(agentConfig.systemPromptId);

    // 7. 初始化 Chat Model
    const model = await initChatModel(modelConfig.model_name, {
        modelProvider: provider.type as ProviderType,
        temperature: modelConfig.temperature,
        streamUsage: true,
        enableThinking: modelConfig.enable_thinking,
        apiKey: decryptedApiKey,
        baseURL: provider.baseUrl,
        metadata: { agent_id: agentId, model_id: modelConfig.id, provider_id: provider.id },
    });

    // 8. 构建工具 + 中间件，创建 Agent
    // ...
}
```

### 运行时流程

```
Agent 创建流程

  1. pkg.getAgent(agentId)
     └─► { id, name, modelId, systemPromptId, tools, middleware }

  2. pkg.getModel(modelConfig.modelId)
     └─► { id, name, provider_id, model_name, temperature, ... }

  3. providerStorage.getById(provider_id)
     ├─► provider_id 为空 → Error: "has no provider assigned"
     └─► Provider { id, type, baseUrl, ... }

  4. providerStorage.getDecryptedApiKey(provider_id)
     └─► Provider 不存在 → Error: "Provider not found"
         API Key 为空   → Error: "has no API Key configured"

  5. initChatModel(model_name, { modelProvider: provider.type, apiKey, baseURL })
     └─► ChatModel 实例

  6. createAgent({ model, tools, middleware, systemPrompt })

❌ 不再依赖环境变量
❌ 不再需要验证 provider.type == model_provider
```

---

## 初始化流程

### 默认数据初始化（`zen-swarm/src/scripts/init-default-data.ts`）

首次运行时（providers 表为空）自动创建：

| Provider  | Type      | isActive |
| --------- | --------- | -------- |
| OpenAI    | openai    | ✅ 是    |
| Anthropic | anthropic | ❌ 否    |
| DeepSeek  | deepseek  | ❌ 否    |

以及关联的默认 Model：`gpt-4o`、`gpt-4o-mini`、`claude-3-5-sonnet`、`deepseek-chat`

### 启动检查（`zen-swarm/src/server.ts`）

```typescript
// 1. 初始化默认数据（首次运行）
await initDefaultData();

// 2. 检查 Provider 和 Model 状态（打印警告）
await checkProviderModelStatus();
```

`checkProviderModelStatus()` 检查：

- 是否有活跃 Provider
- 哪些 Provider 没有配置 API Key
- 哪些 Model 没有关联 Provider

---

## 已知问题与修复记录

### Bug：dist 未重新构建导致 `provider_id` 为 undefined

**现象**：`Model "xxx" has no provider assigned` 错误，但数据库数据正确。

**根因**：

- `packages/standard-agent/dist/index.js` 是旧版构建
- 旧 `rowToModel()` 返回 `model_provider: row.model_provider`（字段已不存在）
- 新 `factory.ts` 读取 `modelConfig.provider_id`，在旧 dist 下为 `undefined`
- `!undefined === true` → 触发错误

**修复**：重新构建 package

```bash
bun run build:packages
```

**预防**：修改 `packages/standard-agent/src/` 后必须重新构建。 `loader.ts` 中 `BunSqliteStorage` 通过 `/src/`
路径直接引用源文件，但 `AgentPackage` 等通过 `@langgraph-js/standard-agent` 加载 dist。

---

## 实现任务清单

### Phase 1: 数据库 Schema 改造

- [x] 扩展 Provider Type 枚举（添加 gemini, deepseek, moonshot, zhipu, custom）
- [x] 为 Model 表添加 `provider_id` 字段
- [x] 更新 `BunSqliteStorage.createTables()`
- [x] 添加 `runMigrations()` 迁移旧 `model_provider` 列

### Phase 2: 存储层改造

- [x] 更新 `ProviderStorage` 支持新的 Provider 类型（CHECK 约束扩展）
- [x] 更新 `ModelRow` / `ModelSchema` 类型（`provider_id` 替换 `model_provider`）
- [x] 实现 `getModelWithProvider()` 联合查询
- [x] 删除 Provider 前检查关联 Model
- [x] `ProviderStorage.getDecryptedApiKey()` 供 factory 运行时使用

### Phase 3: API 改造

- [x] Provider Router 扩展（getModels, getProviderTypes, delete 关联检查）
- [x] Model Router 更新（provider_id 验证, listByProvider, list 含 Provider 信息）
- [x] tRPC Context 添加 `providerStorage`
- [x] Hono 适配器传入 `providerStorage`

### Phase 4: Agent Factory 改造

- [x] `createSwarmAgent()` 从 Model → Provider 获取配置
- [x] 移除环境变量 fallback 逻辑
- [x] 完善错误提示（provider 未配置、API Key 缺失）
- [x] `initChatModel()` 使用 `provider.type` 和 `provider.baseUrl`

### Phase 5: UI 改造

- [x] Model 表单添加 Provider 选择器（`ModelForm.tsx`）
- [x] Model 卡片展示关联 Provider（`ModelCard.tsx`）
- [x] Models Panel 按 Provider 分组展示（`ModelsPanel/index.tsx`）
- [x] Provider Panel 支持新的 Provider 类型

### Phase 6: 初始化脚本

- [x] `init-default-data.ts` 初始化默认 Provider 和 Model
- [x] `checkProviderModelStatus()` 启动时状态检查
- [x] `server.ts` 集成初始化流程

---

## 风险和缓解措施

| 风险                                  | 影响 | 缓解措施                                                         | 状态              |
| ------------------------------------- | ---- | ---------------------------------------------------------------- | ----------------- |
| dist 未重建导致 provider_id 丢失      | 高   | 修改 packages/standard-agent/src 后运行 `bun run build:packages` | ⚠️ 已遇到，已修复 |
| 用户未配置 Provider API Key           | 中   | 启动时 `checkProviderModelStatus()` 打印警告；factory 报错清晰   | ✅ 已处理         |
| 删除 Provider 时关联 Model 孤立       | 中   | Router 层检查关联 Model，有关联则拒绝删除                        | ✅ 已处理         |
| 旧环境变量配置被忽略                  | 中   | `migrateFromEnvVars()` 自动从环境变量迁移（仅首次）              | ✅ 已处理         |
| model_provider → provider_id 数据迁移 | 高   | `runMigrations()` 自动处理，无需手动操作                         | ✅ 已处理         |

---

## 变更日志

| 日期       | 版本 | 变更内容                                                    |
| ---------- | ---- | ----------------------------------------------------------- |
| 2025-03-01 | 1.0  | 初始设计文档                                                |
| 2025-03-01 | 1.1  | 实现完成，回写实际代码与设计差异；记录 dist 构建 bug 及修复 |
