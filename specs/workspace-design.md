# Workspace 设计文档

> **状态**: ✅ 已实现（2026-03-06 验证 - `zen-swarm/src/api/workspaces.ts` + WorkspaceStorage + 前端 stores 均已实现）

## 概述

Workspace 是 zen-swarm 中类似 VSCode 概念的项目工作空间管理功能。每个 Workspace 对应一个本地文件夹路径，用户可以创建多个 Workspace 并在它们之间快速切换。

## 功能范围

### 核心功能

- ✅ 显示文件夹树状结构（类似 VSCode 侧边栏）
- ✅ 多 Workspace 切换
- ✅ Workspace 管理面板（创建/删除/重命名）
- ✅ 文件内容预览（只读）
- ✅ 搜索文件内容（ripgrep）

### 明确不包含的功能

- ❌ 文件编辑（编辑需要打开外部编辑器）
- ❌ 与 Finder 共享数据或状态

## 数据模型

### workspaces 表

```sql
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    root_path TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    last_accessed_at TEXT,
    updated_at TEXT NOT NULL
);
```

### 字段说明

| 字段               | 类型 | 说明                 | 示例                                   |
| ------------------ | ---- | -------------------- | -------------------------------------- |
| `id`               | TEXT | 主键，UUID           | `550e8400-e29b-41d4-a716-446655440000` |
| `name`             | TEXT | 显示名称，唯一       | `zen-swarm`                            |
| `root_path`        | TEXT | 根文件夹路径         | `/Users/xxx/projects/zen-swarm`        |
| `description`      | TEXT | 描述信息（可选）     | `Main project workspace`               |
| `created_at`       | TEXT | 创建时间（ISO 8601） | `2025-02-22T10:00:00Z`                 |
| `last_accessed_at` | TEXT | 最后访问时间（可选） | `2025-02-22T15:30:00Z`                 |
| `updated_at`       | TEXT | 更新时间             | `2025-02-22T15:30:00Z`                 |

### 索引

```sql
CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);
CREATE INDEX IF NOT EXISTS idx_workspaces_last_accessed ON workspaces(last_accessed_at DESC);
```

## 前端架构

### 目录结构

```
zen-swarm/src/
├── api/
│   └── workspaces.ts          # tRPC router
├── config/
│   └── workspace-storage.ts   # SQLite storage
├── frontend/
│   ├── stores/
│   │   └── workspace.ts       # Zustand store
│   ├── components/
│   │   └── workspace/
│   │       ├── WorkspaceSelector.tsx       # 顶部切换器
│   │       ├── WorkspaceManageDialog.tsx     # 管理对话框
│   │       ├── WorkspaceFileTree.tsx        # 文件树
│   │       └── WorkspacePreviewPanel.tsx    # 预览面板
│   └── views/
│       └── WorkspaceView.tsx   # 主视图
```

### Zustand Store 设计

```typescript
interface Workspace {
    id: string;
    name: string;
    rootPath: string;
    description?: string;
    createdAt: string;
    lastAccessedAt?: string;
    updatedAt: string;
}

interface WorkspaceState {
    // 当前 Workspace
    currentWorkspace: Workspace | null;

    // Workspace 列表
    workspaces: Workspace[];

    // 是否为首次启动（没有 Workspace）
    isFirstLaunch: boolean;

    // UI 状态
    showManageDialog: boolean;
    isRefreshing: boolean;

    // 操作方法
    setCurrentWorkspace: (id: string) => Promise<void>;
    loadWorkspaces: () => Promise<void>;
    createWorkspace: (input: CreateWorkspaceInput) => Promise<void>;
    updateWorkspace: (id: string, input: UpdateWorkspaceInput) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;
    openManageDialog: () => void;
    closeManageDialog: () => void;
}
```

## UI 设计

### 主界面布局

```
┌─────────────────────────────────────────────────────────────┐
│ Workspace Selector (顶部切换器)                              │
│ [zen-swarm ▼] [⚙️ 管理]                                      │
├──────────────────┬──────────────────────────────────────────┤
│ 文件树           │ 预览面板                                 │
│ (可折叠)         │                                          │
│                  │                                          │
│ 📁 src/          │ # File content...                        │
│ 📁 api/          │                                          │
│ 📄 package.json  │                                          │
│ 📄 README.md     │                                          │
│                  │                                          │
├──────────────────┴──────────────────────────────────────────┤
│ 状态栏 (可选)                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Workspace 管理

**位置**：独立对话框/模态窗口

**触发方式**：点击顶部切换器中的 "⚙️ 管理" 按钮

**功能**：

- 创建新 Workspace
- 重命名 Workspace
- 删除 Workspace
- 切换到另一个 Workspace

### 切换器设计

```
┌─────────────────────────────────────────────────────────────┐
│ [📁 zen-swarm ▼] [⚙️ 管理]                                    │
└─────────────────────────────────────────────────────────────┘
```

点击下拉菜单显示所有 Workspace：

```
┌─────────────────────────────────┐
│ 📁 zen-swarm        (当前)       │
│ 📁 code-graph                   │
│ 📁 another-project              │
├─────────────────────────────────┤
│ ⚙️ 管理 Workspace...             │
└─────────────────────────────────┘
```

### 管理对话框设计

```
┌─────────────────────────────────────────────────────────┐
│  Workspace 管理                          [X]            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [ + 新建 Workspace ]                                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📁 zen-swarm                     [编辑] [删除]   │   │
│  │    Main project workspace                       │   │
│  │    最后访问: 2小时前                              │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 📁 code-graph                    [编辑] [删除]   │   │
│  │    Core architecture project                     │   │
│  │    最后访问: 昨天                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                     [关闭]               │
└─────────────────────────────────────────────────────────┘
```

## API 设计

### tRPC Router

```typescript
// zen-swarm/src/api/workspaces.ts

export const workspacesRouter = router({
    // 获取所有 Workspace
    getAll: publicProcedure.query(async () => { ... }),

    // 获取单个 Workspace
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => { ... }),

    // 创建 Workspace
    create: publicProcedure
        .input(z.object({
            name: z.string().min(1),
            rootPath: z.string().min(1),
            description: z.string().optional(),
        }))
        .mutation(async ({ input }) => { ... }),

    // 更新 Workspace
    update: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
        }))
        .mutation(async ({ input }) => { ... }),

    // 删除 Workspace
    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => { ... }),

    // 更新最后访问时间
    updateLastAccessed: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => { ... }),

    // 验证路径是否有效
    validatePath: publicProcedure
        .input(z.object({ path: z.string() }))
        .query(async ({ input }) => { ... }),
});
```

## 实现计划

### Phase 1: 数据层

1. 创建 `WorkspaceStorage` 类（SQLite）
2. 创建 `workspaces` 表和索引
3. 实现 CRUD 操作
4. 实现 `updateLastAccessed` 方法

### Phase 2: 后端 API

1. 创建 `workspacesRouter` tRPC router
2. 实现所有 API 端点
3. 集成到主 router (`api/index.ts`)

### Phase 3: 前端 Store

1. 创建 `useWorkspaceStore` Zustand store
2. 实现状态管理
3. 实现 API 调用
4. 实现本地存储（保存当前 Workspace ID）

### Phase 4: UI 组件

1. 创建 `WorkspaceView` 主视图
2. 创建 `WorkspaceSelector` 顶部切换器
3. 创建 `WorkspaceManageDialog` 管理对话框
4. 创建 `WorkspaceFileTree` 文件树组件（复用现有 FileTree）
5. 创建 `WorkspacePreviewPanel` 预览面板

### Phase 5: 集成与测试

1. 替换现有 Files 页面
2. 实现 Workspace 记住上次使用
3. 测试创建/删除/切换流程
4. 测试文件树和预览功能

## 技术细节

### 路径安全

- 验证路径是否存在
- 验证路径是否为目录
- 防止路径遍历攻击

### 性能优化

- 文件树懒加载（按需加载子目录）
- 预览内容缓存
- 列表虚拟滚动（如果需要）

### 用户体验

- 记住上次使用的 Workspace（localStorage）
- 加载状态指示
- 错误提示（路径不存在、名称重复等）
- 快捷键支持（可选）

## 与现有代码的关系

### 重用组件

- ✅ `FileTree` 组件（从 `FileExplorerView`）
- ✅ `PreviewPanel` 组件
- ✅ `StatusBar` 组件（可选）

### 新增组件

- `WorkspaceSelector` - 顶部切换器
- `WorkspaceManageDialog` - 管理对话框

### 修改文件

- `src/api/index.ts` - 添加 `workspacesRouter`
- `src/frontend/views/FileExplorerView.tsx` - 改造为 `WorkspaceView`
- `src/frontend/components/app-registry/registry.ts` - 更新应用描述

## 数据迁移

### 迁移策略

不需要数据迁移，Workspace 是全新功能。

### 默认 Workspace

首次启动时，可以创建一个默认 Workspace 指向项目根目录。

## 测试计划

### 单元测试

- `WorkspaceStorage` CRUD 操作
- `workspacesRouter` API 端点

### 集成测试

- Workspace 创建和切换流程
- 文件树加载和展开
- 预览功能

### UI 测试

- 管理对话框交互
- 切换器下拉菜单
- 文件树双击展开

## 待确认问题

1. **默认 Workspace** - 首次启动是否需要创建默认 Workspace？
2. **快捷键** - 是否需要支持快捷键切换 Workspace？
3. **排序方式** - Workspace 列表按什么排序？（名称、最后访问、创建时间）
4. **图标** - Workspace 是否支持自定义图标？
5. **导入/导出** - 是否需要支持 Workspace 配置的导入/导出？

## 参考资料

- VSCode Workspace 功能
- 现有 `FileExplorerView` 实现
- 现有 `CronStorage` SQLite 实现
- 现有 `ZenSwarmMcpStorage` 实现
