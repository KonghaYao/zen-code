---
name: zen-swarm-frontend
description:
    Zen-Swarm 前端完整架构：包含五套设计风格（Cyberpunk/Minimal/Organic/Bold/Ultra
    Bold）、核心组件系统（Finder、Dock、Terminal、ProcessMonitor）、布局架构（PanelLayout、DockLayout）、tRPC
    双客户端架构、常见问题修复。适用于需要完整 Web UI 的 AI Agent 项目。
tags:
    - frontend-design
    - css-system
    - react-styling
    - aesthetic-variants
    - layout-fix
    - zen-swarm
    - trpc
    - react-hooks
    - finder
    - dock-component
    - process-monitor
    - panel-layout
    - zustand
category: architecture
created: 2025-01-17
last_updated: 2026-02-27
priority: high
context_scope: project
---

# Zen-Swarm 前端完整架构

## 一、五套设计风格

### 设计对比

| 特性     | Cyberpunk       | Minimal      | Organic/Natural | Bold/Editorial      | Ultra Bold       |
| -------- | --------------- | ------------ | --------------- | ------------------- | ---------------- |
| 主色调   | 深色            | 浅色         | 温暖浅色        | 高对比度浅色        | 超高对比度黑白   |
| 品牌色   | 霓虹（青/洋红） | 蓝色 #3b82f6 | 赤陶色 #d4765c  | 电光靛蓝 #4f46e5    | 蓝色 #2563eb     |
| 边界半径 | 中等            | 0.25-1rem    | 0.5-2rem        | 0.125-0.75rem       | 无圆角 0         |
| 阴影     | 冷霓虹色        | 中性         | 温暖琥珀色      | 清晰锐利            | 硬阴影（无模糊） |
| 动画     | 强烈            | 柔和         | 自然弹性        | 快速（120ms）       | 极速（100ms）    |
| 字体     | 等宽+罗马       | Inter        | Nunito          | Space Grotesk+Inter | Oswald+Inter     |
| 间距     | 宽松            | 标准         | 宽松            | 紧凑                | 紧凑夸张         |
| 边框     | 细              | 1px          | 1-2px           | 2px                 | 4px              |
| 氛围     | 未来科技        | 专业极简     | 友好舒适        | 大胆编辑            | 杂志海报         |

### Minimal 浅色主题配色

```css
/* 中性色板 */
--color-neutral-50: #fafafa; /* 主背景 */
--color-neutral-200: #e5e5e5; /* 边框 subtle */
--color-neutral-300: #d4d4d4; /* 边框默认 */
--color-neutral-900: #171717; /* primary text */

/* 品牌色 */
--color-primary: #3b82f6;
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;
```

---

## 二、布局架构

### 1. PanelLayout 可复用布局系统

**问题**：WorkspaceView.tsx 原来是 443 行的单文件组件，包含四栏布局和面板调整逻辑。

**解决方案**：创建可复用的多面板布局系统，将 WorkspaceView 拆分为 3 个文件：

```
zen-swarm/src/frontend/
├── views/
│   ├── WorkspaceView.tsx      # 主视图（90行）
│   ├── WorkspaceChat.tsx      # ChatProvider包装器（35行）
│   └── WorkspaceContent.tsx   # 内容区域（200行）
└── components/workspace/
    ├── PanelLayout.tsx        # 布局容器，Context管理
    ├── PanelItem.tsx          # 面板项组件
    ├── PanelSplitter.tsx      # 调整手柄
    ├── ResizablePanel.tsx     # 独立面板（可选）
    ├── WorkspaceSelector.tsx  # Workspace切换器
    ├── WorkspaceManageDialog.tsx  # 管理对话框
    └── index.ts               # 统一导出
```

**核心组件**：

```typescript
interface PanelConfig {
    id: string;
    position: PanelPosition;
    defaultWidth?: number;
    visible?: boolean;
}

export const PanelLayout: React.FC<{
    panels: PanelConfig[];
    children: React.ReactNode;
}> = ({ panels, children }) => {
    // Context 统一管理所有面板的状态和调整逻辑
};
```

### 2. 左右分栏布局模式

```tsx
// 外层容器：固定高度，防止内容超出
className = 'flex gap-6 h-[calc(100vh-8rem)] overflow-hidden';

// 左侧导航：固定宽度，可滚动
className = 'w-64 flex flex-col gap-2';

// 右侧内容：占据剩余空间，垂直滚动
className = 'flex-1 overflow-y-auto';
```

### 3. Modal 状态管理

```tsx
interface ModalState {
    showCreateModal: boolean;
    editingItem: T | null;
    showDeleteModal: boolean;
}

// 事件处理
const handleOpenCreateModal = () => setShowCreateModal(true);
const handleEditItem = (item: T) => {
    setEditingItem(item);
    setShowCreateModal(true);
};
```

---

## 三、核心组件系统

### 1. macOS 风格 Dock 组件

#### 磨砂玻璃效果（CSS）

```css
.dock-container {
    /* 磨砂玻璃核心样式 */
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(30px) saturate(180%);

    /* 柔和边框 + 内发光 */
    border: 0.5px solid rgba(255, 255, 255, 0.4);
    box-shadow:
        0 0 0 0.5px rgba(0, 0, 0, 0.04),
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 8px 16px rgba(0, 0, 0, 0.08),
        0 24px 48px rgba(0, 0, 0, 0.08),
        inset 0 0.5px 0 rgba(255, 255, 255, 0.6);

    /* 固定高度避免图标放大时容器变形 */
    height: 4.125rem; /* 66px */
    min-height: 4.125rem;
    border-radius: 1.375rem; /* 22px */
}
```

#### 放大动画（JS + CSS 变量）

```typescript
const calculateSizes = (mouseX: number) => {
    const items = dockRef.current?.querySelectorAll('.dock-item');
    items?.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(mouseX - itemCenterX);
        const maxDistance = 150;
        const minSize = 52,
            maxSize = 76;

        if (distance < maxDistance) {
            const ratio = 1 - distance / maxDistance;
            const size = minSize + (maxSize - minSize) * Math.pow(ratio, 1.5);
            (item as HTMLElement).style.setProperty('--dock-item-size', `${size}px`);
        } else {
            (item as HTMLElement).style.setProperty('--dock-item-size', `${minSize}px`);
        }
    });
};
```

**CSS 过渡动画**：

```css
.dock-item {
    width: var(--dock-item-size, 3.25rem);
    height: var(--dock-item-size, 3.25rem);
    transition:
        width 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
        height 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dock-icon-btn:hover {
    transform: translateY(-0.5rem);
}
```

### 2. Finder 文件管理器

#### 完整功能

- 三种视图模式：图标/列表/分栏
- 侧边栏：收藏夹、标签、动态加载文件夹
- 工具栏：导航、搜索、视图切换
- 右键菜单：复制、剪切、重命名、路径复制、创建 workspace
- 快速预览：按 Space 预览文件内容
- 属性检查器：显示文件详细信息
- 键盘快捷键：⌘A 全选、⌘N 新建、⌘C/X/V 复制剪切粘贴、Space 快速预览

#### 组件结构

```
FinderView.tsx (主视图)
├── FinderToolbar.tsx (工具栏)
├── FinderSidebar.tsx (侧边栏，动态加载)
├── FinderIconView.tsx (图标视图)
├── FinderListView.tsx (列表视图)
├── FinderColumnView.tsx (分栏视图)
├── FinderContextMenu.tsx (右键菜单)
├── FinderPreview.tsx (快速预览)
├── FinderInspector.tsx (属性检查器)
└── FinderStatusBar.tsx (状态栏)
```

#### 关键问题修复

**问题 1：侧边栏动态加载 + HashRouter 冲突**

- 侧边栏从硬编码的 macOS 路径改为动态加载
- `useSearchParams` 在 HashRouter 中会导致 hash 清空跳转 dashboard
- 解决方案：使用本地 `useState` 管理侧边栏状态，避免 `useSearchParams`

**问题 2：右键菜单路径处理**

区分 `SidebarItem` 和 `FinderFileItem` 类型，实现相对路径到绝对路径的转换：

```typescript
// 判断是否是侧边栏项目
const isSidebarItem =
    item &&
    item.path &&
    item.name &&
    item.icon &&
    item.id &&
    (item.type === 'folder' ||
        item.type === 'favorite' ||
        item.type === 'tag' ||
        item.type === 'device' ||
        item.type === 'network');

// 相对路径转换为绝对路径
const resolveToAbsolutePath = (inputPath: string): string => {
    const isRealAbsolutePath =
        inputPath.startsWith('/') &&
        (inputPath.includes('/Users/') || inputPath.includes('/home/') || inputPath.length > 30);

    if (isRealAbsolutePath) {
        return path.resolve(inputPath);
    }

    const relativePath = inputPath.startsWith('/') ? inputPath.slice(1) : inputPath;
    return path.resolve(rootPath, relativePath);
};
```

### 3. Process Monitor 进程监控面板

#### 架构设计

**后端实现** (`src/services/processMonitor.ts`):

- 跨平台进程信息采集（macOS/Linux/Windows）
- 使用 `ps` 命令获取进程列表（Unix）或 `wmic`（Windows）
- 进程树构建、系统统计、日志获取、进程终止

**前端组件** (`src/frontend/components/monitor/`):

- `MonitorTabs` - 6 个标签页（CPU、Memory、Energy、Disk、Network、Agents）
- `ProcessToolbar` - 搜索框、视图切换、刷新按钮
- `ProcessList` - 可排序、可搜索的进程列表
- `ProcessDetail` - 进程详情面板
- `ProcessLog` - 滚动日志查看器
- `ProcessTree` - 进程树视图

**tRPC Router** (`src/api/monitor.ts`):

```typescript
export const monitorRouter = router({
    listProcesses: publicProcedure
        .input(z.object({ view: z.enum(['zen-swarm', 'system']).default('zen-swarm') }))
        .query(async ({ input }) => {
            if (input.view === 'zen-swarm') {
                return await processMonitor.getZenSwarmProcesses();
            }
            return await processMonitor.getProcessList();
        }),
    getProcess: publicProcedure.input(z.object({ pid: z.number() })).query(...),
    killProcess: publicProcedure.input(z.object({
        pid: z.number(),
        signal: z.enum(['SIGTERM', 'SIGKILL']).default('SIGTERM')
    })).mutation(...),
    // ...
});
```

---

## 四、tRPC 双客户端架构

### 问题一：hooks[lastArg] is not a function

**根本原因**：tRPC 的 `createTRPCReact()` 只提供 React Hooks，**不提供** `.query()` 和 `.mutate()` 方法。

**解决方案：双客户端架构**

```tsx
import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

// React Hooks 客户端 - 用于组件顶层
export const trpc = createTRPCReact<AppRouter>();

// 普通客户端 - 用于事件处理器和 stores
export const apiClient = createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: '/api/trpc' })],
});
```

**使用示例**：

```tsx
// ✅ 组件顶层使用 React Hooks
const { data } = trpc.prompts.list.useQuery();

// ✅ 事件处理器中使用 apiClient
const handleToggleVersions = async (promptId: string) => {
    const versions = await apiClient.prompts.getVersions.query({ promptId });
};
```

### 问题二：DashboardView 死循环

**根本原因**：`useCallback` 返回的函数引用每次渲染都可能变化，导致 useEffect 无限重新执行。

**解决方案：useEffect + useRef**

```tsx
export function DashboardView() {
    const { agents, agentsLoading, loadAgents } = useAgentsStore();
    const hasLoadedAgents = useRef(false);

    useEffect(() => {
        if (!hasLoadedAgents.current) {
            loadAgents();
            hasLoadedAgents.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 空依赖数组，只执行一次
}
```

### 使用场景对照表

| 使用场景       | API                                | 示例                                                 |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| 组件顶层查询   | `trpc.xxx.useQuery()`              | `const { data } = trpc.prompts.list.useQuery()`      |
| 组件顶层修改   | `trpc.xxx.useMutation()`           | `const mutation = trpc.prompts.create.useMutation()` |
| 事件处理器调用 | `apiClient.xxx.query()`            | `await apiClient.prompts.getVersions.query({ id })`  |
| Store 中调用   | `apiClient.xxx.query()`            | `await apiClient.agents.list.query()`                |
| 手动刷新缓存   | `trpc.useUtils().xxx.invalidate()` | `utils.prompts.list.invalidate()`                    |

---

## 五、常见问题修复

### 1. Bun Select 组件修复

**问题**：Bun 环境下原生 `<select>` 的 `e.currentTarget` 为 null，导致 Runtime Error。

**解决方案：自定义 Select 组件**

```tsx
interface SelectProps<T> {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
}

// 支持键盘导航：ArrowUp/ArrowDown/Enter/Space/Escape
// 点击外部自动关闭
// 支持禁用和 loading 状态
```

### 2. 数据库字段映射转换

```typescript
// 提交时转换
const submitData = {
    model_id: formData.model, // model → model_id
    system_prompt_id: formData.system_prompt, // system_prompt → system_prompt_id
};

// 编辑回显时转换
formData.model = agent.model_id || agent.model;
formData.system_prompt = agent.system_prompt_id || agent.systemPromptId;
```

### 3. 外键约束处理

```typescript
// 提交前验证非空
if (!formData.model || !formData.system_prompt) {
    alert('请填写所有必填字段');
    return;
}

// 跳过空键
const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== ''),
);
```

### 4. 卡片溢出处理

```tsx
// 容器：防止内容溢出
className = 'overflow-hidden min-w-0';

// 文本：截断并显示 tooltip
className = 'truncate';
title = { fullText };
```

---

## 六、设计决策总结

| 决策               | 理由                                           |
| ------------------ | ---------------------------------------------- |
| 五套设计风格       | 支持不同场景，展示设计能力                     |
| 磨砂玻璃效果       | 符合 macOS 设计语言，现代感                    |
| PanelLayout 可复用 | 减少代码重复，提高维护性                       |
| tRPC 双客户端      | React Hooks 用于组件，apiClient 用于事件处理器 |
| 自定义 Select      | 避免 Bun 环境兼容性问题                        |
| Finder 动态加载    | 反映实际项目结构，避免硬编码路径               |
| 本地状态管理       | 避免 useSearchParams 导致的 hash 清空问题      |

---

## 相关文件

### 布局系统

- `src/frontend/components/workspace/PanelLayout.tsx` - 可复用布局容器
- `src/frontend/views/WorkspaceView.tsx` - 工作区视图

### Dock 组件

- `src/frontend/components/dock/DockContainer.tsx` - Dock 容器
- `src/frontend/components/dock/DockAppItem.tsx` - 单个图标
- `src/frontend/global.css:650-750` - Dock 样式

### Finder 组件

- `src/frontend/views/Finder/FinderView.tsx` - Finder 主视图
- `src/frontend/components/finder/Sidebar/FinderSidebar.tsx` - 动态侧边栏
- `src/frontend/components/finder/ContextMenu/FinderContextMenu.tsx` - 右键菜单
- `src/frontend/types/finder.ts` - Finder 类型定义
- `src/frontend/stores/finder.ts` - Zustand 状态管理

### Process Monitor

- `src/services/processMonitor.ts` - 进程监控服务
- `src/api/monitor.ts` - tRPC Router
- `src/frontend/components/monitor/` - Monitor 组件

### tRPC 架构

- `src/frontend/api.ts` - 双客户端定义
- `src/frontend/views/DashboardView.tsx` - Dashboard 视图（死循环修复）
- `src/frontend/views/AgentConfigView.tsx` - Agent 配置视图
- `src/frontend/views/ResourcesView.tsx` - 资源管理视图

### 表单组件

- `src/frontend/components/ui/Select.tsx` - 自定义 Select 组件
- `src/frontend/components/panels/*/Form.tsx` - 各面板表单
