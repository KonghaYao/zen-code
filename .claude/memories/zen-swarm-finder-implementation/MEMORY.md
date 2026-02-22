---
name: zen-swarm-finder-implementation
description:
    为 zen-swarm 开发了完整的 macOS 风格 Finder
    文件管理器，包括三种视图模式（图标/列表/分栏）、侧边栏、工具栏、右键菜单、快速预览、属性检查器等完整功能。使用
    Zustand 进行状态管理，支持 localStorage 持久化，集成现有后端 API。适用于需要 Web 文件管理器的项目。
tags:
    - finder
    - file-manager
    - react
    - zustand
    - macos-style
category: architecture
created: 2025-01-22
last_updated: 2026-02-22
priority: high
context_scope: project
status: completed
completion_date: 2026-02-22
---

# ## 背景

## 背景

为 zen-swarm 项目开发 macOS 风格的 Finder 文件管理器，使用现有的 tRPC 后端 API。

## 架构设计

### 组件结构

- **FinderView** - 主视图组件 (`src/frontend/views/Finder/FinderView.tsx`)
- **FinderToolbar** - 工具栏，包含导航、搜索、视图切换
- **FinderSidebar** - 侧边栏，包含收藏夹、标签
- **FinderIconView/FinderListView/FinderColumnView** - 三种视图模式
- **FinderContextMenu** - 右键菜单
- **FinderPreview** - 快速预览面板
- **FinderInspector** - 属性检查器
- **FinderDialogs** - 对话框系统
- **FinderStatusBar** - 状态栏

### 状态管理

使用 Zustand 进行状态管理，文件路径：`src/frontend/stores/finder.ts`

关键状态：

- 导航状态：当前路径、历史记录
- 选择状态：多选、锚点、焦点
- 视图选项：视图模式、排序、显示隐藏文件
- 侧边栏、预览、检查器、对话框状态

## 关键实现

### 类型定义

文件路径：`src/frontend/types/finder.ts`

定义了完整的 Finder 类型系统，包括：

- FinderItem（文件/目录项）
- ViewMode（视图模式）
- FinderState（状态管理）

### 视图模式切换

```typescript
// 支持三种视图模式
type ViewMode = 'icons' | 'list' | 'columns';

// 列表视图支持列宽调整
const handleColumnResize = useCallback((column: string, width: number) {
  setColumnWidths(prev ({ ...prev, [column]: width }));
}, []);

// 分栏视图的多级浏览
const handleColumnNavigate = useCallback((path: string, index: number) {
  setColumnView(prev ({
    columns: prev.columns.slice(0, index + 1),
    activeColumnIndex: index
  }));
  loadColumnData(path, index + 1);
}, []);
```

### 键盘快捷键

- `⌘A` - 全选
- `⌘N` - 新建文件夹
- `⌘⇧N` - 新建文件
- `⌘C/X/V` - 复制/剪切/粘贴
- `Space` - 快速预览
- `⌘I` - 获取信息

### 集成到 Dock 系统

修改 `src/frontend/components/app-registry/registry.ts`，添加 Finder 应用：

```typescript
{
  id: 'finder',
  name: 'Finder',
  icon: '🗂️',
  description: '文件管理器',
  viewComponent: FinderView,
  keyboardShortcut: 'Cmd+5',
  contextMenuActions: ['open', 'help'],
}
```

## 常见问题修复

1. **导入路径错误**：修复了组件之间的导入路径，确保正确的模块导出
2. **Zustand 依赖**：添加 `bun add zustand`
3. **类型注解**：修复 useFinderStore 调用中的类型注解错误
4. **返回值**：确保所有函数有返回值或显式 void

## 文件列表

- ✅ `src/frontend/types/finder.ts` - 类型定义 (9861 字节)
- ✅ `src/frontend/stores/finder.ts` - Zustand 状态管理 (34937 字节)
- ✅ `src/frontend/views/Finder/FinderView.tsx` - 主视图 (23829 字节)
- ✅ `src/frontend/components/finder/Toolbar/FinderToolbar.tsx` - 工具栏 (13320 字节)
- ✅ `src/frontend/components/finder/Sidebar/FinderSidebar.tsx` - 侧边栏 (动态加载实现)
- ✅ `src/frontend/components/finder/Views/FinderIconView.tsx` - 图标视图 (8048 字节)
- ✅ `src/frontend/components/finder/Views/FinderListView.tsx` - 列表视图 (13176 字节)
- ✅ `src/frontend/components/finder/Views/FinderColumnView.tsx` - 分栏视图 (11269 字节)
- ✅ `src/frontend/components/finder/ContextMenu/FinderContextMenu.tsx` - 右键菜单 (13028 字节)
- ✅ `src/frontend/components/finder/Preview/FinderPreview.tsx` - 预览面板 (11486 字节)
- ✅ `src/frontend/components/finder/Inspector/FinderInspector.tsx` - 检查器 (14150 字节)
- ✅ `src/frontend/components/finder/Dialogs/FinderDialogs.tsx` - 对话框 (15189 字节)
- ✅ `src/frontend/components/finder/StatusBar/FinderStatusBar.tsx` - 状态栏 (4355 字节)

## 使用方式

1. 点击 Dock 中的 Finder 图标启动
2. 使用侧边栏导航到不同目录
3. 双击文件夹进入，使用工具栏切换视图模式
4. 右键查看更多操作选项
5. 按 Space 快速预览文件
