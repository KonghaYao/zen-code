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
storeInstance.installRemoteSkill()  →  解压 zip 到 ~/.claude/skills/<name>/
  （若未实现 installRemoteSkill，回退为只写 SKILL.md）
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
    listRemotePrompts(options?: { page?: number; limit?: number }): Promise<RemotePromptItem[]>;
    searchRemotePrompts(query: string): Promise<RemotePromptItem[]>;
    fetchRemotePrompt(id: string): Promise<RemotePromptItem | null>;
}
```

### IRemoteSkillStore.ts

```typescript
export interface RemoteSkillItem {
    name: string;
    description?: string;
    content: string; // SKILL.md 完整内容（含 YAML frontmatter）
    tags?: string[];
    author?: string;
    source_url?: string;
    version?: string;
    downloads?: number;
    stars?: number;
}

export interface IRemoteSkillStore {
    listRemoteSkills(options?: { page?: number; limit?: number }): Promise<RemoteSkillItem[]>;
    searchRemoteSkills(query: string): Promise<RemoteSkillItem[]>;
    fetchRemoteSkill(name: string): Promise<RemoteSkillItem | null>;

    /**
     * 下载并安装 skill 到指定目录（可选）。
     * 实现方可下载完整 zip 包并解压；未实现时由调用方回退到只写 SKILL.md。
     */
    installRemoteSkill?(name: string, destDir: string): Promise<void>;
}
```

---

## 第二层：基类与实现

**位置**：`packages/config/src/implementations/remote/`

### BaseRemoteStore.ts

公共 HTTP 工具基类，提供带超时的 `get<T>()` 方法：

```typescript
export abstract class BaseRemoteStore {
    protected readonly baseUrl: string;
    protected readonly headers: Record<string, string>;
    protected readonly timeout: number; // 默认 10000ms

    protected async get<T>(path: string, params?: Record<string, string>): Promise<T>;
}
```

### GenericHttpRemoteStore.ts

通用可配置实现，支持自定义字段映射和路径配置：

```typescript
export interface GenericStoreConfig extends BaseRemoteStoreConfig {
    fieldMap?: {
        id?: string;
        name?: string;
        description?: string;
        content?: string;
        tags?: string;
        author?: string;
        source_url?: string;
    };
    paths?: {
        listPrompts?: string; // 默认 /prompts
        searchPrompts?: string; // 默认 /prompts/search
        getPrompt?: string; // 默认 /prompts
        listSkills?: string; // 默认 /skills
        searchSkills?: string; // 默认 /skills/search
        getSkill?: string; // 默认 /skills
    };
}

export class GenericHttpRemoteStore extends BaseRemoteStore implements IRemotePromptStore, IRemoteSkillStore {
    // 不实现 installRemoteSkill，回退到写 SKILL.md
}
```

### ClawhHubStore.ts

[ClawhHub](https://clawhub.ai) 平台专属实现，对接公开 REST API v1。

**支持能力**：仅 Skills（ClawhHub 无 Prompt 概念）

**关键 API 端点**：

| 端点                                           | 用途                                                |
| ---------------------------------------------- | --------------------------------------------------- |
| `GET /api/v1/skills?limit=&cursor=&sort=`      | 列表（`sort`: `downloads`/`stars`/`trending` 等）   |
| `GET /api/v1/search?q=...`                     | 搜索，返回 `{ results: [...] }`                     |
| `GET /api/v1/skills/{slug}`                    | 详情，返回 `{ skill: {...}, latestVersion: {...} }` |
| `GET /api/v1/skills/{slug}/file?path=SKILL.md` | 拉取单个文件内容                                    |
| `GET /api/v1/download?slug=&version=&tag=`     | 下载完整 zip 包（`application/zip`）                |

**注意：API 响应字段与通用实现不同**

```
列表/详情：displayName（展示名）、summary（描述）、stats.downloads、stats.stars、latestVersion.version
搜索：results 数组（非 items），字段有 displayName、summary、version
```

**`installRemoteSkill` 实现**：

1. 调用 `/api/v1/download?slug=...` 获取 zip 二进制
2. 使用 `fflate.unzipSync` 解压
3. 自动剥离 zip 顶层目录前缀（如 `agent/SKILL.md` → `SKILL.md`）
4. 写出所有文件到 `destDir`

---

## 第三层：tRPC API

**文件**：`zen-swarm/src/api/store.ts`

```typescript
export function createStoreRouter(remoteStoreStorage: RemoteStoreStorage) {
    return router({
        // Store 配置管理
        listStores,
        addStore,
        updateStore,
        deleteStore,

        // Prompt 操作
        listRemotePrompts,
        searchRemotePrompts,
        importPrompt,

        // Skill 操作
        listRemoteSkills,
        getRemoteSkill,
        searchRemoteSkills,

        importSkill: publicProcedure
            .input(z.object({ storeId: z.string(), skillName: z.string() }))
            .mutation(async ({ input }) => {
                const storeInstance = createStoreInstance(entry);
                const skillDir = join(homedir(), '.claude', 'skills', skillName);
                mkdirSync(skillDir, { recursive: true });

                if (storeInstance.installRemoteSkill) {
                    // 下载完整 zip，解压所有文件
                    await storeInstance.installRemoteSkill(input.skillName, skillDir);
                } else {
                    // 回退：只写 SKILL.md
                    const item = await storeInstance.fetchRemoteSkill(input.skillName);
                    writeFileSync(join(skillDir, 'SKILL.md'), item.content, 'utf-8');
                }
                return { name: skillName };
            }),
    });
}
```

---

## 第四层：前端面板

**目录**：`zen-swarm/src/frontend/components/panels/StorePanel/`

```
StorePanel/
├── index.tsx          # 主组件（Tab: Prompts / Skills，搜索，Store 切换）
├── StoreCard.tsx      # 单个条目卡片（含导入/预览按钮）
└── StorePreview.tsx   # 预览 Modal（展示完整 SKILL.md 内容）
```

**Hooks**：`zen-swarm/src/frontend/hooks/useStore.ts`

| Hook                                    | 说明                       |
| --------------------------------------- | -------------------------- |
| `useStores()`                           | 获取已配置的 store 列表    |
| `useRemoteSkills(storeId)`              | 列出远程 skills            |
| `useSearchRemoteSkills(storeId, query)` | 搜索，query > 1 字符时触发 |
| `useGetRemoteSkill(storeId, skillName)` | 预览时按需拉取完整内容     |
| `useImportSkill()`                      | 导入 mutation              |

**ClawhHub 特殊行为**：

- Tab 自动限制为 `['skills']`（不显示 Prompts Tab）
- 搜索框回车或点击 Search 按钮触发（不实时搜索）

---

## 配置存储

**实际存储**：SQLite（随 zen-swarm 数据库，非 `settings.json`）

**表结构**：`remote_stores`

```sql
CREATE TABLE remote_stores (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    type     TEXT NOT NULL DEFAULT 'generic_http',  -- 'generic_http' | 'clawhub'
    base_url TEXT NOT NULL,
    api_key  TEXT,
    field_map TEXT,   -- JSON，GenericHttpRemoteStore 字段映射
    paths    TEXT,    -- JSON，GenericHttpRemoteStore 路径配置
    enabled  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
)
```

---

## 文件变更清单

### 新建文件

| 文件                                                                   | 说明                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| `packages/config/src/interfaces/IRemotePromptStore.ts`                 | 远程 prompt 源抽象接口                           |
| `packages/config/src/interfaces/IRemoteSkillStore.ts`                  | 远程 skill 源抽象接口（含 `installRemoteSkill`） |
| `packages/config/src/implementations/remote/BaseRemoteStore.ts`        | HTTP 基类（带超时）                              |
| `packages/config/src/implementations/remote/GenericHttpRemoteStore.ts` | 通用 HTTP 实现                                   |
| `packages/config/src/implementations/remote/ClawhHubStore.ts`          | ClawhHub 平台实现（zip 安装）                    |
| `zen-swarm/src/services/remote-store/storage.ts`                       | SQLite 持久化                                    |
| `zen-swarm/src/api/store.ts`                                           | tRPC store 路由                                  |
| `zen-swarm/src/frontend/components/panels/StorePanel/index.tsx`        | 主面板组件                                       |
| `zen-swarm/src/frontend/components/panels/StorePanel/StoreCard.tsx`    | 条目卡片                                         |
| `zen-swarm/src/frontend/components/panels/StorePanel/StorePreview.tsx` | 预览 Modal                                       |
| `zen-swarm/src/frontend/hooks/useStore.ts`                             | React Query hooks                                |

### 修改文件

| 文件                           | 改动                           |
| ------------------------------ | ------------------------------ |
| `packages/config/src/index.ts` | 导出新接口和实现类             |
| `packages/config/package.json` | 新增 `fflate` 依赖（zip 解压） |
| `zen-swarm/src/api/index.ts`   | 注册 `storeRouter`             |

---

## 扩展：接入新平台

继承 `BaseRemoteStore`，实现接口即可：

```typescript
export class MyPlatformStore extends BaseRemoteStore implements IRemotePromptStore, IRemoteSkillStore {
    async listRemoteSkills() {
        /* 调用平台 API */
    }
    async searchRemoteSkills(query: string) {
        /* ... */
    }
    async fetchRemoteSkill(name: string) {
        /* ... */
    }

    // 如果平台提供完整包下载，实现此方法
    async installRemoteSkill(name: string, destDir: string) {
        /* ... */
    }
}
```

在 `store.ts` 的 `createStoreInstance` 工厂函数中按 `type` 字段创建实例，无需修改其他代码。
