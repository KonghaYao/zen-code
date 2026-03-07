# Remote Prompt & Skills Store 设计文档

## 概述

为 zen-swarm 添加远程 prompt 和 skills 仓库支持，允许用户从社区平台或自建 HTTP 服务拉取 prompts 和 skills，并一键导入到本地。

**核心原则**：

- 只读拉取（read-only pull），不向远程推送
- 抽象接口驱动，支持多平台实现
- 复用现有本地存储机制

---

## 架构总览

```
抽象接口层  →  基类实现层  →  tRPC API 层  →  前端 UI 层
```

### 数据流

```
StorePanel
  ↓ trpc.store.search / trpc.store.list
storeRouter (zen-swarm/src/api/store.ts)
  ↓
IRemotePromptStore / IRemoteSkillStore 实现类
  ↓ HTTP fetch
远程平台 API

[导入 Prompt] trpc.store.importPrompt
  ↓
ctx.agentPackage.storage.insertPrompt()  →  SQLite

[导入 Skill] trpc.store.importSkill
  ↓
写文件 ~/.claude/skills/<name>/SKILL.md
```

---

## 第一层：抽象接口

**位置**：`packages/config/src/interfaces/`

### IRemotePromptStore.ts

```typescript
export interface RemotePromptItem {
    id: string;
    name: string;
    description?: string;
    content: string;
    tags?: string[];
    author?: string;
    source_url?: string;
    metadata?: Record<string, any>;
}

export interface IRemotePromptStore {
    /** 列出远程可用的 prompts（支持分页） */
    listRemotePrompts(options?: { page?: number; limit?: number }): Promise<RemotePromptItem[]>;

    /** 搜索 prompts */
    searchRemotePrompts(query: string): Promise<RemotePromptItem[]>;

    /** 获取单个 prompt 的完整内容 */
    fetchPrompt(id: string): Promise<RemotePromptItem | null>;
}
```

### IRemoteSkillStore.ts（扩展现有 IRemoteStore）

```typescript
export interface RemoteSkillItem {
    name: string;
    description?: string;
    content: string; // SKILL.md 完整内容（含 YAML frontmatter）
    tags?: string[];
    author?: string;
    source_url?: string;
}

export interface IRemoteSkillStore {
    listRemoteSkills(options?: { page?: number; limit?: number }): Promise<RemoteSkillItem[]>;
    searchRemoteSkills(query: string): Promise<RemoteSkillItem[]>;
    fetchSkill(name: string): Promise<RemoteSkillItem | null>;
}
```

---

## 第二层：基类实现

**位置**：`packages/config/src/implementations/remote/`

### BaseRemoteStore.ts

公共 HTTP 工具基类，子类直接继承：

```typescript
export abstract class BaseRemoteStore {
    protected baseUrl: string;
    protected headers: Record<string, string>;

    constructor(config: { baseUrl: string; apiKey?: string; headers?: Record<string, string> }) {
        this.baseUrl = config.baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
            ...config.headers,
        };
    }

    protected async get<T>(path: string, params?: Record<string, string>): Promise<T> {
        const url = new URL(path, this.baseUrl);
        if (params) {
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }
        const res = await fetch(url.toString(), { headers: this.headers });
        if (!res.ok) throw new Error(`Remote store request failed: ${res.status} ${res.statusText}`);
        return res.json() as T;
    }
}
```

### GenericHttpRemoteStore.ts

通用可配置实现，支持自定义字段映射：

```typescript
export interface GenericStoreConfig {
    baseUrl: string;
    apiKey?: string;
    /** 字段映射：将远程 API 响应字段映射到标准字段 */
    fieldMap?: {
        id?: string;
        name?: string;
        description?: string;
        content?: string;
        tags?: string;
    };
    /** API 路径配置 */
    paths?: {
        listPrompts?: string; // 默认 /prompts
        searchPrompts?: string; // 默认 /prompts/search
        getPrompt?: string; // 默认 /prompts/:id
        listSkills?: string; // 默认 /skills
        searchSkills?: string; // 默认 /skills/search
        getSkill?: string; // 默认 /skills/:name
    };
}

export class GenericHttpRemoteStore extends BaseRemoteStore implements IRemotePromptStore, IRemoteSkillStore {
    // ... 使用 fieldMap 做字段转换
}
```

---

## 第三层：tRPC API

**新文件**：`zen-swarm/src/api/store.ts`

```typescript
export const storeRouter = router({
  // 获取已配置的 store 列表
  listStores: publicProcedure.query(...),

  // 列出/搜索远程 prompts
  listRemotePrompts: publicProcedure
    .input(z.object({ storeId: z.string(), page: z.number().optional() }))
    .query(...),

  searchRemotePrompts: publicProcedure
    .input(z.object({ storeId: z.string(), query: z.string() }))
    .query(...),

  // 列出/搜索远程 skills
  listRemoteSkills: publicProcedure
    .input(z.object({ storeId: z.string(), page: z.number().optional() }))
    .query(...),

  searchRemoteSkills: publicProcedure
    .input(z.object({ storeId: z.string(), query: z.string() }))
    .query(...),

  // 导入到本地
  importPrompt: publicProcedure
    .input(z.object({ storeId: z.string(), promptId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 拉取远程内容 → ctx.agentPackage.storage.insertPrompt()
    }),

  importSkill: publicProcedure
    .input(z.object({ storeId: z.string(), skillName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 拉取远程内容 → 写文件 ~/.claude/skills/<name>/SKILL.md
    }),
});
```

**修改**：`zen-swarm/src/api/index.ts` 添加 `store: storeRouter`

---

## 第四层：前端面板

**新目录**：`zen-swarm/src/frontend/components/panels/StorePanel/`

### 文件结构

```
StorePanel/
├── index.tsx          # 主组件（Tab: Prompts / Skills）
├── StoreCard.tsx      # 单个条目卡片（含导入按钮）
└── StorePreview.tsx   # 预览 Modal（展示完整 content）
```

### UI 布局

```
┌─────────────────────────────────────────────────────┐
│  ● ● ●    Store                                      │
│  [Prompts] [Skills]          [Store: my-store ▼]    │
├─────────────────────────────────────────────────────┤
│  🔍 Search prompts...                                │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ Prompt Name      │  │ Prompt Name      │         │
│  │ description...   │  │ description...   │         │
│  │ [Preview] [导入] │  │ [Preview] [已导入]│         │
│  └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────┘
```

**状态标记**：

- 未导入 → `[Import]` 按钮（蓝色）
- 已导入 → `[Imported]` badge（灰色，disabled）

---

## 配置格式

**存储位置**：`~/.zen-code/settings.json` 中增加 `remote_stores` 字段

```json
{
    "remote_stores": [
        {
            "id": "team-store",
            "name": "Team Prompt Library",
            "type": "generic_http",
            "baseUrl": "https://prompts.mycompany.com",
            "apiKey": "sk-xxx",
            "enabled": true,
            "fieldMap": {
                "id": "uuid",
                "name": "title",
                "content": "body"
            }
        },
        {
            "id": "local-store",
            "name": "Local Dev Store",
            "type": "generic_http",
            "baseUrl": "http://localhost:4000",
            "enabled": true
        }
    ]
}
```

---

## 文件变更清单

### 新建文件

| 文件                                                                   | 说明                            |
| ---------------------------------------------------------------------- | ------------------------------- |
| `packages/config/src/interfaces/IRemotePromptStore.ts`                 | 远程 prompt 源抽象接口          |
| `packages/config/src/interfaces/IRemoteSkillStore.ts`                  | 远程 skill 源抽象接口（独立版） |
| `packages/config/src/implementations/remote/BaseRemoteStore.ts`        | HTTP 基类                       |
| `packages/config/src/implementations/remote/GenericHttpRemoteStore.ts` | 通用 HTTP 实现                  |
| `zen-swarm/src/api/store.ts`                                           | tRPC store 路由                 |
| `zen-swarm/src/frontend/components/panels/StorePanel/index.tsx`        | 主面板组件                      |
| `zen-swarm/src/frontend/components/panels/StorePanel/StoreCard.tsx`    | 条目卡片                        |
| `zen-swarm/src/frontend/components/panels/StorePanel/StorePreview.tsx` | 预览 Modal                      |

### 修改文件

| 文件                                            | 改动                                         |
| ----------------------------------------------- | -------------------------------------------- |
| `packages/config/src/interfaces/ISkillStore.ts` | 更新 `IRemoteStore` 注释，与新接口保持一致   |
| `packages/config/src/index.ts`                  | 导出新接口和实现类                           |
| `zen-swarm/src/api/index.ts`                    | 注册 `storeRouter`                           |
| `zen-swarm/src/config/loader.ts`                | 加载 `remote_stores` 配置，初始化 store 实例 |
| `~/.zen-code/settings.json` schema              | 增加 `remote_stores` 字段定义                |

---

## 扩展性说明

后续接入新平台只需：

```typescript
// 继承 BaseRemoteStore，实现两个接口
export class PromptHubStore extends BaseRemoteStore implements IRemotePromptStore, IRemoteSkillStore {
    async listRemotePrompts() {
        /* 调用 PromptHub API */
    }
    async searchRemotePrompts(query) {
        /* ... */
    }
    async fetchPrompt(id) {
        /* ... */
    }
    // skills 同理
}
```

在 `loader.ts` 中根据 `type` 字段工厂化创建实例即可。
