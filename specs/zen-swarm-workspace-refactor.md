# Zen Swarm Workspace 重构设计

## 概述

简化 zen-swarm 的 workspace UI，保留核心 Chat 功能，移除多余界面，优化历史记录展示。

## 最新更新（2025-03-01）

**进一步简化 UI：**

- ✅ 删除顶部 WorkspaceSelector 工具栏
- ✅ 每个分组右侧添加管理按钮（三个点图标）
- ✅ 点击管理按钮直接打开该 workspace 的编辑对话框
- ✅ 删除底部的 [+ Add Workspace] 按钮（管理对话框中已有新建功能）

**服务器优化：**

- ✅ 删除 `updateLastAccessed` API 接口和相关方法
- ✅ 移除 `last_accessed_at` 字段的更新逻辑（保留字段用于数据迁移兼容）

**功能修复：**

- ✅ 顶部按钮从 "New Chat" 改为 "Add Workspace"，点击打开管理对话框创建新 workspace
- ✅ 修复 workspace 分组中的 "新建会话" 按钮逻辑：切换到目标 workspace 后等待 ChatProvider 重新渲染，再创建新 chat

**状态管理优化：**

- ✅ 修复创建 workspace 后不应自动切换的问题：只在当前没有 workspace 时才自动切换
- ✅ ChatProvider 添加 `key={currentWorkspace.id}` 确保切换 workspace 时正确重新初始化
- ✅ WorkspaceManageDialog 移到 ChatProvider 外部，避免对话框操作导致聊天状态重置

## 需求

### 核心功能

- **单个核心 Chat 界面**：只保留 Chat + History sidebar
- **右侧自定义展示界面暂时为空**：不显示任何内容
- **后端逻辑保持不变**：不需要任何后端修改

### Chat 界面布局

#### 显示方式

- **改为窗口模式**（类似 config 应用），不再作为 full-screen 应用
- 窗口显示在桌面中央，带有 macOS 风格的 traffic lights

#### 面板结构

```
┌─────────────────────────────────────────────────────┐
│  🤖 Chat                          🔴 🟡 🟢           │
├──────────────────┬──────────────────────────────────┤
│  History         │  Chat Messages                   │
│  (240px)         │  (剩余宽度)                      │
│                  │                                  │
│  ▾ Workspace A (+)                                   │
│    chat1                                             │
│    chat2                                             │
│                                                     │
│  ▸ Workspace B (+)                                   │
│    chat3                                             │
│                                                     │
│  [+ Add Workspace]                                   │
│                  │  ...                             │
│                  │                                  │
│                  │                                  │
│                  │  [输入框]                        │
└──────────────────┴──────────────────────────────────┘
```

**布局说明**：

- History 侧边栏**无外边框**，通过背景色区分
- 布局**紧凑**：减少内边距和间距
- 每个 Workspace 分组右侧有 **+** 按钮，用于在该 workspace 下创建新会话
- 底部有 **[+ Add Workspace]** 按钮，用于添加新 workspace
- 展开的分组标题前有 ▾，折叠的分组标题前有 ▸
- chat1、chat2、chat3 表示历史记录条目

### History Sidebar

#### UI 设计原则

- **无边框布局**：通过背景色和间距区分，不使用 border
- **紧凑设计**：减少内边距（padding）和间距（gap）
- **清晰的层级**：使用颜色深浅和字体大小区分不同层级

#### 分组展示

- **按 metadata.path 分组**（path 对应 workspace）
- **每个 workspace 作为一个可折叠分组**（类似文件夹）
- 每个分组显示：
    - 折叠/展开图标（▾ / ▸）
    - Workspace 名称（取 path 的最后一部分）
    - 记录数量徽章（小圆点 + 数字）
    - **+** 按钮（在该 workspace 下创建新会话）

#### 数量限制

- **只显示最近 50 条历史记录**
- 按更新时间降序排列

#### 分组展开状态

- 默认展开当前 workspace 的分组
- 其他 workspace 分组默认折叠

#### 底部操作

- **[+ Add Workspace]** 按钮：打开添加 workspace 的对话框
- 使用主色调（var(--color-primary)）突出显示

### Chat 界面

#### 功能保留

- 消息展示（Human、AI、Tool）
- 输入框
- Agent 选择器
- Stop 生成按钮
- 消息滚动与自动跟随

#### 功能移除

- 文件树面板
- 预览面板
- 其他右侧面板

## 技术实现

### 组件结构

#### 新增/修改组件

```
zen-swarm/src/frontend/
├── views/
│   └── ChatView.tsx (新增 - 单一 Chat 窗口)
├── components/
│   └── HistoryGroupedSidebar.tsx (新增 - 分组历史侧边栏)
└── layouts/
    └── DockLayout.tsx (修改 - 移除 full-screen 逻辑)
```

#### 废弃组件

```
zen-swarm/src/frontend/views/
├── WorkspaceView.tsx (废弃)
├── WorkspaceChat.tsx (废弃)
├── WorkspaceContent.tsx (废弃)
└── components/workspace/ (废弃 - PanelLayout 等)
```

### ChatView 组件设计

```typescript
interface ChatViewProps {
    // 当前选中的 workspace
    workspaceId: string;
    rootPath: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ workspaceId, rootPath }) => {
    return (
        <ChatProvider
            apiUrl="http://127.0.0.1:8124/api/langgraph"
            defaultAgent="swarm"
            // historyFilter - 只查询当前 workspace
            historyFilter={{
                metadata: { path: rootPath },
                limit: 50,
                sortBy: 'updated_at',
                sortOrder: 'desc',
            }}
        >
            <div className="flex h-full">
                {/* History Sidebar */}
                <HistoryGroupedSidebar />

                {/* Chat Panel */}
                <ChatPanel />
            </div>
        </ChatProvider>
    );
};
```

### HistoryGroupedSidebar 组件设计

#### 数据结构

```typescript
interface HistoryGroup {
    workspaceName: string; // 从 path 提取的名称
    rootPath: string; // 完整路径
    threads: Thread[]; // 该 workspace 的历史记录
    count: number; // 记录数量
    isExpanded: boolean; // 是否展开
}
```

#### 实现要点

1. **数据获取**
    - 使用 `useChat` 的 `historyList`
    - 获取所有 50 条历史记录（无 path 过滤）

2. **分组逻辑**

    ```typescript
    const groupHistories = (threads: Thread[]): HistoryGroup[] => {
        const groups = new Map<string, HistoryGroup>();

        threads.forEach((thread) => {
            const path = (thread.metadata?.path as string) || 'default';
            const workspaceName = path.split('/').pop() || path;

            if (!groups.has(path)) {
                groups.set(path, {
                    workspaceName,
                    rootPath: path,
                    threads: [],
                    count: 0,
                    isExpanded: path === currentRootPath,
                });
            }

            groups.get(path)!.threads.push(thread);
            groups.get(path)!.count++;
        });

        return Array.from(groups.values());
    };
    ```

3. **分组展示**
    - 使用可折叠的 UI（Accordion 模式）
    - 每个分组显示：workspace 名称 + 记录数量徽章
    - 折叠时只显示分组标题，展开时显示所有记录

4. **切换 workspace**
    - 点击不同 workspace 的历史记录时：
        - **重要**：需要更新 ChatProvider 的 `historyFilter`，将 `metadata.path` 设置为目标 workspace 的 path
        - 刷新聊天历史（使用 `refreshHistoryList()`）
        - 切换到选中的历史记录（使用 `toHistoryChat(thread)`）
        - 保持当前选中的历史记录高亮

5. **historyFilter 更新机制**
    - ChatView 组件需要管理 `currentRootPath` 状态
    - 当用户切换 workspace 时：
        1. 更新 `currentRootPath` 状态
        2. 重新渲染 ChatProvider，传入新的 `historyFilter.metadata.path`
        3. ChatProvider 会自动查询该 workspace 下的历史记录
    - 示例代码：

        ```typescript
        const [currentRootPath, setCurrentRootPath] = useState('/path/to/workspace');

        return (
            <ChatProvider
                historyFilter={{
                    metadata: { path: currentRootPath },
                    limit: 50,
                    sortBy: 'updated_at',
                    sortOrder: 'desc',
                }}
            >
                <HistoryGroupedSidebar
                    currentRootPath={currentRootPath}
                    onWorkspaceChange={setCurrentRootPath}
                />
            </ChatProvider>
        );
        ```

### DockLayout 修改

#### AppRegistry 更新

```typescript
// zen-swarm/src/frontend/components/app-registry/index.ts
export const apps: AppInfo[] = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        icon: '🐝',
        viewComponent: DashboardView,
    },
    {
        id: 'config',
        name: 'Config',
        icon: '⚙️',
        viewComponent: ConfigView,
    },
    {
        id: 'chat',
        name: 'Chat',
        icon: '💬',
        viewComponent: ChatView, // 使用新组件
        isFullScreen: false, // 改为窗口模式
    },
    // 移除 workspaces 应用
];
```

#### 默认路由

- 启动时默认显示 chat 应用（而非 dashboard）

## 迁移步骤

### 第一阶段：准备

1. ✅ 创建 `ChatView.tsx` 组件（简化版 WorkspaceContent）
2. ✅ 创建 `HistoryGroupedSidebar.tsx` 组件
3. ✅ 创建 `ChatPanel.tsx` 组件（独立提取）
4. ✅ 测试 ChatProvider 的 historyFilter 配置

### 第二阶段：集成

1. ✅ 更新 `app-registry/index.ts`，添加 chat 应用
2. ✅ 修改 `DockLayout.tsx`，支持窗口模式
3. ✅ 将 WorkspaceSelector 和 WorkspaceManageDialog 迁移到 `workspace-dialogs/` 目录

### 第三阶段：清理

1. ✅ 删除 `WorkspaceView.tsx`、`WorkspaceChat.tsx`
2. ✅ 删除 `WorkspaceContent.tsx`（保留 ChatPanel 等独立组件）
3. ✅ 删除 `components/workspace/` 目录（PanelLayout 等）
4. ✅ 更新文档和注释

### 第四阶段：优化

1. ✅ 优化分组 UI 的展开/折叠动画
2. ✅ 添加 workspace 切换的过渡效果
3. ✅ 性能测试（大量历史记录时的渲染性能）

## 完成状态

**重构已完成**，所有四个阶段均已完成：

- ✅ 简化的 Chat 界面（Chat + History sidebar）
- ✅ 按 workspace 分组的历史记录展示
- ✅ 窗口模式（而非 full-screen）
- ✅ 保留的组件：WorkspaceSelector, WorkspaceManageDialog, ChatPanel
- ✅ 废弃的组件：WorkspaceView, WorkspaceChat, WorkspaceContent, PanelLayout

## 注意事项

### 性能考虑

- 50 条历史记录的渲染性能需要测试
- 使用 `useMemo` 缓存分组结果
- 考虑虚拟滚动（如果记录很多）

### 用户体验

- 保持与现有 Chat 功能一致的交互
- 切换 workspace 时要有明确的视觉反馈
- 分组展开状态要持久化（使用 localStorage）

### 后端兼容性

- 确保不修改任何后端 API
- ChatProvider 的 historyFilter 参数保持兼容

## 未来扩展

右侧自定义展示界面预留扩展点：

- 可以添加文件预览面板
- 可以添加任务列表
- 可以添加状态机可视化
- 可以添加调试信息面板
