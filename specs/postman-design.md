# Postman 模块设计文档

## 概述

Postman 模块是集成在 zen-swarm Web
UI 中的全功能 HTTP 客户端，允许用户在不离开工作台的情况下调试、测试和探索 API 接口。功能对标 Postman /
Insomnia，完整支持请求集合管理、环境变量、认证配置和历史记录。

---

## 架构分层

```
┌─────────────────────────────────────────────────┐
│   zen-swarm/src/frontend/views/Postman/         │  视图层 (React)
│   zen-swarm/src/frontend/components/postman/   │
│   zen-swarm/src/frontend/hooks/usePostman.ts   │
├─────────────────────────────────────────────────┤
│   zen-swarm/src/api/postman.ts                  │  API 层 (tRPC Router)
│   zen-core/src/routes/postman.ts               │
├─────────────────────────────────────────────────┤
│   zen-swarm/src/postman/storage.ts              │  持久层 (SQLite)
│   zen-core/src/postman/storage.ts              │
├─────────────────────────────────────────────────┤
│   zen-swarm/src/postman/types.ts                │  类型定义
│   zen-core/src/postman/types.ts                │
└─────────────────────────────────────────────────┘
```

> `zen-core` 与 `zen-swarm` 各自维护一套平行实现，类型与逻辑完全一致，便于共享/独立部署。

---

## 核心数据模型

### Collection（集合）

```ts
interface Collection {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}
```

集合是请求的分组容器，删除集合会级联删除其下所有请求（`ON DELETE CASCADE`）。

### SavedRequest（已保存请求）

```ts
interface SavedRequest {
    id: string;
    collection_id: string;
    name: string;
    method: HttpMethod;       // GET | POST | PUT | PATCH | DELETE | HEAD | OPTIONS
    url: string;
    headers: KeyValuePair[];
    query_params: KeyValuePair[];
    auth: AuthConfig;
    body: RequestBody;
    sort_order: number;
    created_at / updated_at: string;
}
```

### Environment（环境变量）

```ts
interface Environment {
    id: string;
    name: string;
    variables: KeyValuePair[];  // { key, value, enabled }
    is_active: boolean;
    created_at / updated_at: string;
}
```

同一时刻只有一个环境处于激活状态（`is_active`）。激活环境的变量会在发送请求时自动注入（`{{VAR}}` 语法）。

### HistoryEntry（历史记录）

每次执行请求时自动记录完整快照，包含：

- 请求参数（method / url / headers / body / auth）
- 响应结果（status / headers / body / time_ms / size_bytes）
- 关联的 request_id / collection_id（可选）

---

## 认证类型（AuthConfig）

| 类型      | 说明                                               |
| --------- | -------------------------------------------------- |
| `none`    | 无认证                                             |
| `bearer`  | Bearer Token，注入 `Authorization: Bearer <token>` |
| `basic`   | Basic Auth，Base64 编码用户名+密码                 |
| `api_key` | API Key，可注入到请求头或 Query 参数               |

---

## 请求体类型（BodyType）

| 类型     | Content-Type                        |
| -------- | ----------------------------------- |
| `none`   | 无 body                             |
| `json`   | `application/json`                  |
| `form`   | `application/x-www-form-urlencoded` |
| `text`   | `text/plain`                        |
| `binary` | 二进制（预留）                      |

---

## tRPC API 设计

### Collections

| 过程               | 类型     | 说明                 |
| ------------------ | -------- | -------------------- |
| `listCollections`  | query    | 获取所有集合         |
| `getCollection`    | query    | 按 id 获取           |
| `createCollection` | mutation | 创建集合             |
| `updateCollection` | mutation | 更新名称/描述        |
| `deleteCollection` | mutation | 删除（级联删除请求） |

### Requests

| 过程            | 类型     | 说明                       |
| --------------- | -------- | -------------------------- |
| `listRequests`  | query    | 按 collection_id 列举      |
| `getRequest`    | query    | 按 id 获取                 |
| `createRequest` | mutation | 创建并校验 collection 存在 |
| `updateRequest` | mutation | 部分更新                   |
| `deleteRequest` | mutation | 删除                       |

### Environments

| 过程                   | 类型     | 说明             |
| ---------------------- | -------- | ---------------- |
| `listEnvironments`     | query    | 获取所有环境     |
| `getActiveEnvironment` | query    | 获取当前激活环境 |
| `createEnvironment`    | mutation | 创建             |
| `updateEnvironment`    | mutation | 更新变量等       |
| `setActiveEnvironment` | mutation | 设为激活（互斥） |
| `deleteEnvironment`    | mutation | 删除             |

### History

| 过程                 | 类型     | 说明                    |
| -------------------- | -------- | ----------------------- |
| `listHistory`        | query    | 分页获取，默认 limit=50 |
| `getHistoryEntry`    | query    | 按 id 获取              |
| `clearHistory`       | mutation | 清空（可按时间过滤）    |
| `deleteHistoryEntry` | mutation | 删除单条                |

### 发送请求

| 过程   | 类型     | 说明                         |
| ------ | -------- | ---------------------------- |
| `send` | mutation | 执行 HTTP 请求并可选保存历史 |

#### `send` 执行流程

```
1. 解析环境变量（优先 environment_id，其次当前激活环境）
2. {{VAR}} 插值（URL / Headers / Body / Auth）
3. 构建完整 URL（拼接 query_params）
4. 注入 Auth Header（bearer / basic / api_key）
5. 设置 Content-Type（根据 body.type 自动推断）
6. fetch() 发送请求
7. 收集响应 status / headers / body / time_ms / size_bytes
8. 若 save_to_history=true，写入 history 表
9. 返回 SendRequestResult
```

---

## 持久层（SQLite）

数据库使用 `bun:sqlite`，文件路径默认 `./data/index.db`，支持传入已有 Database 实例共享连接。

### 表结构

```sql
postman_collections   -- 集合
postman_requests      -- 已保存请求，外键关联 collections
postman_environments  -- 环境变量
postman_history       -- 执行历史
```

### 索引

```sql
idx_postman_requests_collection   -- 按 collection_id 快速列举
idx_postman_history_executed      -- 历史按时间倒序
idx_postman_history_request       -- 历史关联请求
```

JSON 字段（headers / query_params / auth / body / response_headers）以 JSON 字符串存储，读取时反序列化。

---

## 前端设计

### 布局（三栏）

```
┌──────────────┬──────────────────────────────┬───────────────┐
│  Sidebar     │      Request Editor           │  Response     │
│  Collections │  URL bar + Method Selector    │               │
│  & History   │  Tabs: Params|Headers|Auth|   │  Status       │
│  (tabbed)    │        Body                   │  Headers      │
│              │                               │  Body         │
└──────────────┴──────────────────────────────┴───────────────┘
```

### 状态管理

前端使用 TanStack Query 管理服务端状态，本地编辑状态通过 `ActiveRequest` 对象在组件内维护。

```ts
interface ActiveRequest {
    id?: string; // 有值表示已保存
    collection_id?: string;
    name: string;
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    query_params: KeyValuePair[];
    auth: AuthConfig;
    body: RequestBody;
    isDirty?: boolean; // 未保存变更标志（显示 ● 提示）
}
```

**脏标记**：URL / Headers / Body 等任何字段变更时设置 `isDirty=true`，保存成功后清除。

### Hooks（`usePostman.ts`）

| Hook                                                                                                 | 说明              |
| ---------------------------------------------------------------------------------------------------- | ----------------- |
| `useCollections`                                                                                     | 集合列表          |
| `useRequests(collectionId)`                                                                          | 集合内请求列表    |
| `useEnvironments` / `useActiveEnvironment`                                                           | 环境管理          |
| `useHistory(limit)`                                                                                  | 历史记录          |
| `useSendRequest`                                                                                     | 执行请求 mutation |
| `useCreateRequest` / `useUpdateRequest` / `useDeleteRequest`                                         | 请求 CRUD         |
| `useCreateCollection` / `useUpdateCollection` / `useDeleteCollection`                                | 集合 CRUD         |
| `useCreateEnvironment` / `useUpdateEnvironment` / `useSetActiveEnvironment` / `useDeleteEnvironment` | 环境 CRUD         |
| `useClearHistory` / `useDeleteHistoryEntry`                                                          | 历史管理          |

### 子组件

| 组件                 | 职责                                               |
| -------------------- | -------------------------------------------------- |
| `CollectionSidebar`  | 集合树 + 请求列表，支持新建/删除                   |
| `HistoryPanel`       | 历史记录列表，点击恢复请求                         |
| `KeyValueEditor`     | 通用 Key-Value 表格（Headers / Params / 环境变量） |
| `AuthEditor`         | 认证类型切换 + 字段填写                            |
| `BodyEditor`         | body 类型选择 + 编辑区                             |
| `ResponsePanel`      | 响应状态、Headers、Body 展示                       |
| `EnvironmentManager` | 环境创建/编辑/激活 Modal                           |
| `PostmanDockIcon`    | Dock 图标入口                                      |

---

## 文件清单

### 新增文件

```
zen-core/src/postman/types.ts
zen-core/src/postman/storage.ts
zen-core/src/routes/postman.ts
zen-swarm/src/postman/types.ts
zen-swarm/src/postman/storage.ts
zen-swarm/src/api/postman.ts
zen-swarm/src/frontend/types/postman.ts
zen-swarm/src/frontend/hooks/usePostman.ts
zen-swarm/src/frontend/views/Postman/index.tsx
zen-swarm/src/frontend/components/postman/CollectionSidebar.tsx
zen-swarm/src/frontend/components/postman/HistoryPanel.tsx
zen-swarm/src/frontend/components/postman/KeyValueEditor.tsx
zen-swarm/src/frontend/components/postman/AuthEditor.tsx
zen-swarm/src/frontend/components/postman/BodyEditor.tsx
zen-swarm/src/frontend/components/postman/ResponsePanel.tsx
zen-swarm/src/frontend/components/postman/EnvironmentManager.tsx
zen-swarm/src/frontend/components/dock/icons/PostmanDockIcon.tsx
```

### 修改文件

```
zen-core/src/bootstrap.ts          -- 注册 postmanRouter
zen-core/src/router.ts             -- 导出 postmanRouter
zen-swarm/src/api/hono.ts          -- 挂载 postman 路由
zen-swarm/src/api/index.ts         -- 导出 postmanRouter
zen-swarm/src/api/trpc.ts          -- 注册到 appRouter
zen-swarm/src/frontend/components/app-registry/registry.ts  -- 注册 PostmanView
zen-swarm/src/frontend/components/app-registry/types.ts     -- 扩展 AppId
```
