# 右侧面板系统

> zen-swarm 文件管理器可替换的右侧 Tab 面板系统，集成 Search 和 Chat 功能

---

## 1. 需求概述

将 zen-swarm 文件管理器的右侧面板设计为可替换的 Tab 切换系统，支持多种功能模块，参考 Cursor 的交互设计风格。

### 核心功能

- 可替换的右侧面板系统
- Tab 标签页切换（顶部 Tab，类似 Cursor）
- Chat 功能集成
- 单面板显示模式（一次只显示一个面板）
- 选择性持久化（记住用户偏好，支持重置）

### Chat 功能要求

- AI 对话（与 LLM 交互）
- 代码助手（上下文感知）
- 对话历史记录（底部小图标展开，简化版）
- 多会话管理
- Agent 选择
- 流式响应支持

---

## 2. 系统架构

### 2.1 组件结构

```
FileExplorerView (三栏布局)
├── FileTree (左侧 - 现有)
├── PreviewPanel (中间 - 现有)
└── RightPanelContainer (右侧 - 新增)
    ├── TabBar (Tab 标签栏)
    │   └── Tab (可点击切换)
    └── PanelContent (内容区域)
        ├── SearchPanel (现有)
        ├── ChatPanelMini (新增 - 简化版 Chat)
        └── FuturePanel (预留扩展)
```

### 2.2 核心类型定义

```typescript
// 右侧面板类型
export type RightPanelType = 'search' | 'chat';

// 面板配置
export interface RightPanelConfig {
    id: RightPanelType;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
}

// 面板状态（用于持久化）
export interface RightPanelState {
    activePanel: RightPanelType;
    isVisible: boolean;
    width: number;
}

// 常量
export const RIGHT_PANEL_STATE_KEY = 'zen-swarm:file-explorer:right-panel';
export const DEFAULT_PANEL_STATE: RightPanelState = {
    activePanel: 'search',
    isVisible: true,
    width: 280,
};
```

---

## 3. UI/UX 设计

### 3.1 Tab Bar 设计

参考 Cursor 的 Tab 设计：

- 顶部水平 Tab 栏
- 当前选中 Tab 有视觉高亮（蓝色下划线）
- 支持 Tab 悬停效果
- 显示快捷键提示（hover 时）

### 3.2 面板切换

- 快速切换（无动画或淡入淡出）
- 保持面板状态（切换回来时不重置）

### 3.3 持久化设计

```typescript
// 从 localStorage 加载
const savedState = localStorage.getItem(RIGHT_PANEL_STATE_KEY);
const state = savedState ? JSON.parse(savedState) : DEFAULT_PANEL_STATE;
```

---

## 4. Chat 面板设计

### 4.1 ChatPanelMini 架构

**核心差异：**

- 移除独立左侧 HistorySidebar
- 历史记录通过底部小图标展开（类似 VSCode 命令面板的抽屉）
- 保持核心聊天功能（消息列表、输入框、Agent 选择）
- 压缩头部设计
- 默认宽度 280px

**组件结构：**

```tsx
<ChatPanelMini>
    <ChatHeader>
        <AgentSelect size="small" />
        <StopButton />
    </ChatHeader>
    <MessagesList>{/* 复用 HumanMessage, AIMessage, ToolMessage */}</MessagesList>
    <MiniInput />
    <ChatHistoryButton />
    <ChatHistoryDrawer isOpen={historyOpen}>{/* 历史记录列表 */}</ChatHistoryDrawer>
</ChatPanelMini>
```

### 4.2 历史记录设计

**UI 设计：**

- 底部固定位置的小图标按钮
- 点击展开从底部弹出的抽屉（最大高度 60%）
- 抽屉内显示历史对话列表
- 支持搜索、新建对话、切换对话

**状态共享：** 使用现有的 `@langgraph-js/sdk/react` 的 `ChatProvider`：

```tsx
<ChatProvider
    apiUrl={apiUrl}
    defaultAgent={defaultAgent}
    showHistory={false}
    showGraph={false}
    autoRestoreLastSession={false}
>
    <ChatPanelMini />
</ChatProvider>
```

---

## 5. 文件结构

### 实际实现的文件结构

```
zen-swarm/src/frontend/
├── types/
│   └── rightPanel.ts                       # 类型定义
├── components/fileExplorer/
│   ├── RightPanel/
│   │   ├── RightPanelContainer.tsx         # 容器组件
│   │   ├── TabBar.tsx                      # Tab 栏
│   │   ├── Tab.tsx                         # 单个 Tab
│   │   ├── ChatPanelMini.tsx               # 简化版 Chat（含 MiniInput）
│   │   ├── ChatHeader.tsx                  # Chat 头部
│   │   ├── ChatHistoryButton.tsx           # 底部历史按钮
│   │   ├── ChatHistoryDrawer.tsx           # 历史抽屉
│   │   └── index.ts                        # 导出
│   ├── Search/
│   │   └── SearchPanel.tsx                 # 保持原位置
│   └── index.tsx                           # 更新导出
├── views/
│   └── FileExplorerView.tsx                # 使用新面板系统
└── global.css                              # 添加 slide-up 动画
```

---

## 6. 键盘快捷键

| 快捷键                         | 功能               |
| ------------------------------ | ------------------ |
| `Cmd+Shift+F` / `Ctrl+Shift+F` | 切换到 Search 面板 |
| `Cmd+Shift+I` / `Ctrl+Shift+I` | 切换到 Chat 面板   |

---

## 7. 性能优化（Vercel React Best Practices）

| 优化点                          | 实现方式                                         |
| ------------------------------- | ------------------------------------------------ |
| `rerender-memo`                 | `MessageItem` 和 `HistoryItem` 使用 `React.memo` |
| `rerender-move-effect-to-event` | 自动滚动仅在用户接近底部时触发                   |
| `js-combine-iterations`         | 历史记录过滤使用 `useMemo` 合并计算              |
| `js-early-exit`                 | 辅助函数提前返回，类型安全                       |
| Controlled State                | 面板状态由父组件控制，支持受控和持久化           |

---

## 8. 验收标准

### 功能验收

- [x] 右侧面板支持 Tab 切换
- [x] Search 面板功能正常（搜索、结果显示、点击跳转）
- [x] Chat 面板功能正常：
    - [x] 发送消息
    - [x] 接收 AI 响应
    - [x] Agent 选择
    - [x] 流式响应
    - [x] 停止生成
- [x] Chat 历史记录功能正常：
    - [x] 底部按钮展开/收起
    - [x] 显示历史列表
    - [x] 切换对话
    - [x] 新建对话
    - [x] 搜索历史
- [x] 面板状态持久化（刷新后恢复）
- [x] 键盘快捷键工作正常

### 性能验收

- [x] Tab 切换无卡顿
- [x] 消息列表滚动流畅
- [x] 历史抽屉展开/收起动画流畅

### UI/UX 验收

- [x] 样式符合 Cursor/VSCode 规范
- [x] 动画效果流畅自然（slide-up）
- [x] 错误提示友好

---

## 9. 设计决策记录

### 决策 1: Chat 历史记录实现方式

- **选择**: 底部小图标展开抽屉
- **理由**: 节省面板空间，保持界面简洁，参考 VSCode 命令面板设计

### 决策 2: 面板默认宽度

- **选择**: 280px（与现有 SearchPanel 一致）
- **理由**: 保持现有设计一致性，适合窄屏

### 决策 3: 面板最小化功能

- **选择**: 不需要，只能隐藏/显示整个面板
- **理由**: 简化实现，已有完整的隐藏/显示功能

### 决策 4: 状态管理位置

- **选择**: 状态提升到 FileExplorerView
- **理由**: 便于快捷键控制、持久化和面板间协调

---

## 10. 未来扩展

### 可添加的面板

```typescript
// 只需在配置中添加新条目
const RIGHT_PANELS: RightPanelConfig[] = [
    { id: 'search', label: 'Search', icon: <SearchIcon /> },
    { id: 'chat', label: 'AI Chat', icon: <ChatIcon /> },
    // 未来扩展：
    // { id: 'outline', label: 'Outline', icon: <OutlineIcon /> },
    // { id: 'git', label: 'Git', icon: <GitIcon /> },
    // { id: 'extensions', label: 'Extensions', icon: <ExtensionsIcon /> },
];
```

---

## 11. 参考资源

- 现有 ChatPanel: `zen-swarm/src/frontend/components/ChatPanel.tsx`
- 现有 SearchPanel: `zen-swarm/src/frontend/components/fileExplorer/Search/SearchPanel.tsx`
- LangGraph SDK: `@langgraph-js/sdk/react`
- Vercel React Best Practices: `.claude/skills/vercel-react-best-practices/`
