---
name: "zen-worker-layout-architecture"
description: "zen-worker UI 架构重构：实现了 icon-only 导航栏和会话管理侧边栏，采用 `useChat` hook 统一数据源，支持响应式布局和实时会话切换；适用于需要与 zen-code TUI 保持数据一致性的 Web UI 场景"
tags: ["zen-worker", "layout", "useChat", "sidebar", "langgraph"]
category: "architecture"
created: "2025-01-24"
last_updated: "2025-01-24"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

zen-worker 需要实现类似 zen-code 的会话管理功能，并优化侧边栏布局。原有的 Sidebar 组件（3352 字节）占用空间大，需要重构为更紧凑的 icon 导航形式。

## 架构决策

### 1. 双侧边栏布局

**文件**: `zen-worker/src/components/Layout/index.tsx`

采用响应式布局结构：
- **IconNavbar** (64px): 左侧固定图标导航，所有页面显示
- **ChatSidebar** (288px): 聊天页面专属会话列表，条件渲染
- **Main**: 主内容区

```typescript
// 关键逻辑：路由判断控制 ChatSidebar 显示
const isChatPage = location.pathname === '/';
return (
  <div className="flex h-screen">
    <IconNavbar />
    {isChatPage && <ChatSidebar />}
    <div className="flex-1">
      <Header />
      <Main><Outlet /></Main>
    </div>
  </div>
);
```

### 2. 统一数据源：`useChat` Hook

**决策原因**: 
- ChatSidebar 原使用 localStorage 模拟数据
- zen-code 的 HistoryPanel 使用 `@langgraph-js/sdk/react` 的 `useChat` hook
- 需要两个组件共享真实会话数据，保持一致性

**数据获取**:
```typescript
const {
  historyList,        // 历史会话列表
  currentChatId,      // 当前会话 ID
  refreshHistoryList, // 刷新列表
  toHistoryChat,      // 切换到历史会话
  createNewChat,      // 创建新会话
} = useChat();
```

**应用文件**:
- `zen-worker/src/components/Layout/ChatSidebar.tsx`
- `zen-worker/src/pages/HistoryPage.tsx`

### 3. 数据结构映射

LangGraph SDK 返回的 thread 对象结构：
```typescript
interface Thread {
  thread_id: string;    // 完整会话 ID
  status: string;       // idle | busy | error | interrupted
  updated_at: string;   // ISO 8601 时间戳
}
```

**UI 显示映射**:
- thread_id: 显示前 8 位 + "..."（如 `a1b2c3d4...`）
- status: 状态指示器（🟢 idle / 🟡 busy / 🔴 error）
- updated_at: 相对时间格式化

### 4. 时间格式化逻辑

**文件**: `ChatSidebar.tsx`, `HistoryPage.tsx`

```typescript
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'HH:MM';              // 今天
  if (days === 1) return '昨天';               // 昨天
  if (days < 7) return `${days}天前`;          // 本周
  return 'M月D日 HH:MM';                       // 其他
};
```

## 实现细节

### IconNavbar 组件

**文件**: `zen-worker/src/components/Layout/IconNavbar.tsx` (3536 字节)

**特性**:
- 宽度 64px，图标居中显示
- 使用 `lucide-react` 图标库（MessageSquare, Settings, Target 等）
- Radix UI Tooltip 显示导航项名称
- 主题切换按钮集成在底部
- 高亮当前页面（蓝色背景 + 阴影）

**关键代码**:
```typescript
<TooltipProvider delayDuration={0}>
  <aside className="w-16 bg-gray-900">
    <nav className="flex-1 flex flex-col items-center gap-2">
      {navigation.map((item) => (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            <NavLink to={item.href}>{/* 图标 */}</NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{item.name}</TooltipContent>
        </Tooltip>
      ))}
    </nav>
  </aside>
</TooltipProvider>
```

### ChatSidebar 组件

**文件**: `zen-worker/src/components/Layout/ChatSidebar.tsx` (重构后)

**移除功能**:
- localStorage 存储（STORAGE_KEY）
- 手动 CRUD 操作（createNewSession, deleteSession, saveEdit）
- 编辑/重命名功能（LangGraph API 不支持）
- 删除会话功能

**新增功能**:
- 搜索过滤（按 thread_id）
- 刷新按钮（Loader2 动画）
- 状态指示器（Circle 图标 + 颜色映射）
- Tooltip 显示完整 thread_id

**UI 结构**:
```
┌─────────────────────┐
│ 会话列表       [↻] [+]│
│ [搜索框]            │
├─────────────────────┤
│ 💬 a1b2c3d4... 🟢    │
│    今天 14:30        │
├─────────────────────┤
│ 💬 e5f6g7h8... 🟡    │
│    昨天 09:15        │
├─────────────────────┤
│ 2 个会话            │
└─────────────────────┘
```

### HistoryPage 组件

**文件**: `zen-worker/src/pages/HistoryPage.tsx`

**额外特性**（ChatSidebar 不具备）:
- 状态过滤器（全部/空闲/忙碌/错误）
- 卡片列表布局（包含序号徽章）
- "当前" Badge 标记
- 序号圆圈（index + 1）

## 技术栈

- **图标**: lucide-react (^0.563.0)
- **Tooltip**: @radix-ui/react-tooltip (^1.2.8)
- **Chat SDK**: @langgraph-js/sdk/react (^4.4.0)
- **样式**: Tailwind CSS (^4.1.18)

## 注意事项

1. **会话 ID 同步**: ChatSidebar 通过 URL 参数 `?session=xxx` 管理会话，但实际切换由 `toHistoryChat` 处理
2. **状态持久化**: LangGraph SDK 自动处理会话持久化，无需 localStorage
3. **删除限制**: 当前不支持删除会话（LangGraph API 限制）
4. **重命名限制**: 当前不支持编辑会话标题（thread_id 不可变）
5. **响应式设计**: IconNavbar 和 ChatSidebar 均为固定宽度，不涉及移动端适配

## 适用场景

- 需要 TUI 和 Web UI 数据一致的架构
- 使用 LangGraph SDK 的 React 应用
- 需要紧凑导航栏的多页面应用
- 实时会话列表显示和切换
