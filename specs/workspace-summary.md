# Workspace 需求总结

## 用户需求

将 zen-swarm 的 Files 页面改造为 **Workspace** 功能：

- Workspace 类似于 VSCode 概念的项目工作空间
- 每个 Workspace 对应一个本地文件夹路径
- 支持创建多个 Workspace 并快速切换
- 与现有 Finder 功能独立，不共享数据

## 功能范围

### ✅ 包含的功能

- 显示文件夹树状结构
- 多 Workspace 切换
- Workspace 管理面板（创建/删除/重命名）
- 文件内容预览（只读）
- 搜索文件内容（ripgrep）

### ❌ 不包含的功能

- 文件编辑功能（编辑需要打开外部编辑器）
- 与 Finder 共享数据或状态

## 数据存储

### workspaces 表结构

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

### 元信息字段

- Workspace 名称
- 创建时间
- 最后访问时间
- 描述/备注

## UI 设计

### 界面位置

- **主界面**：替换现有的 Files 页面
- **管理面板**：独立对话框/模态窗口（通过顶部切换器的 "⚙️ 管理" 按钮触发）

### 顶部切换器

```
[📁 zen-swarm ▼] [⚙️ 管理]
```

### 默认行为

- 记住上次使用的 Workspace（localStorage）

## 技术栈

- **后端**：tRPC + SQLite（复用现有 `data/index.db`）
- **前端**：Zustand + React + Tailwind CSS
- **组件**：复用现有 `FileTree` 和 `PreviewPanel`

## 实现文件

### 后端

```
zen-swarm/src/
├── api/
│   └── workspaces.ts          # tRPC router
├── config/
│   └── workspace-storage.ts   # SQLite storage
```

### 前端

```
zen-swarm/src/frontend/
├── stores/
│   └── workspace.ts           # Zustand store
├── components/
│   └── workspace/
│       ├── WorkspaceSelector.tsx       # 顶部切换器
│       ├── WorkspaceManageDialog.tsx   # 管理对话框
│       └── WorkspaceFileTree.tsx       # 文件树
└── views/
    └── WorkspaceView.tsx    # 主视图
```

## 已确认决策

| 问题           | 决策                           |
| -------------- | ------------------------------ |
| 默认 Workspace | 否，用户首次手动创建           |
| 列表排序方式   | 按最后访问时间排序（最近在前） |
| 快捷键         | 不支持                         |
| 自定义图标     | 不支持                         |
| 导入/导出      | 不支持                         |

## 相关文档

详细设计请参阅：`specs/workspace-design.md`
