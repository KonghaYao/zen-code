---
name: "react-web-ui-complete"
description: "React/Web UI 完整架构：zen-worker 交互系统（InteractionContext 迁移、工具层职责分离、渲染器注册）、shadcn/ui 组件系统、布局架构（IconNavbar + ChatSidebar）、会话隔离模式（chatId 字段、clearAll 双重保护）、状态更新模式（updateCount 计数器）。涵盖 InteractionContext、渲染器注册系统、useApprovalIntegration、统一面板系统、路径别名配置、Tailwind CSS 修复等核心特性。"
tags: ["zen-worker", "react", "interaction-context", "approval-system", "shadcn-ui", "layout", "session-isolation", "state-management", "renderer-registry", "useApprovalIntegration", "tailwind", "css-variables"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-25"
priority: "high"
context_scope: "project"
---

# React/Web UI 完整架构

## 架构概述

React/Web UI 包含四大核心子系统：
1. **统一交互系统** - InteractionContext、工具层职责分离、渲染器注册
2. **shadcn/ui 组件系统** - 全面重构和统一 UI 风格
3. **布局架构** - IconNavbar + ChatSidebar 双侧边栏
4. **会话隔离与状态管理** - chatId 字段隔离、updateCount 模式

---

## 一、统一交互系统

### 背景与演进

zen-worker 的交互系统经历了从审批系统到统一交互系统的演进。最初使用 ApprovalContext 管理工具审批，后来迁移到 union-client 的 InteractionContext 实现统一管理（approval、selection、input、confirm 等多种交互类型）。

### 核心架构

**组件职责**：

1. **InteractionContext**（union-client） - 管理所有类型的交互
   - 提供方法访问器：`addInteraction()`、`getInteractions()`、`updateInteraction()`
   - 不直接暴露状态（封装原则）

2. **渲染器注册系统** - 类型安全的渲染器管理
   - 两参数签名：`register<T>(type: T['type'], renderer: InteractionRenderer<T>)`
   - 支持动态注册不同类型的交互渲染器

3. **useApprovalIntegration** - 全局工具检测（后备机制）
   - 监听 renderMessages
   - 检测工具调用（isToolCallMessage）
   - 为非 UI 工具添加 approval 类型交互
   - **跳过 UI 工具**（terminal、ask_user_with_options 自己处理）

4. **UnifiedUIPanel** - 统一交互面板
   - 使用 `getInteractions()` 获取交互列表
   - 为每个交互创建独立 Tab
   - 自动导航到下一个 pending 请求

5. **工具层**（terminal.tsx、ask_user_with_options.tsx）
   - 检测 `tool.state === 'interrupted'`（HITL 生效标志）
   - 自己创建正确类型的交互：
     - terminal → approval
     - ask_user_with_options → selection
   - 监听交互状态变化
   - 执行 `tool.sendResumeData()`

### 架构流程（优先级分层）

**优先级 1：HITL 中间件生效（tool.state === 'interrupted'）**
```
工具被 HITL 中间件中断
    ↓
工具 render 函数检测到 interrupted 状态
    ↓
工具自己创建正确类型的交互 (approval/selection)
    ↓
UnifiedUIPanel 显示 → 对应的 Renderer 渲染
    ↓
用户操作 → 状态变化
    ↓
工具监听状态变化 → tool.sendResumeData()
```

**优先级 2：HITL 中间件未生效（后备机制）**
```
工具调用未被中断
    ↓
useApprovalIntegration 全局检测 renderMessages
    ↓
创建 approval 类型交互（跳过 UI 工具）
    ↓
UnifiedUIPanel 显示 → ApprovalRenderer 渲染
    ↓
用户操作 → 状态变化
    ↓
useApprovalIntegration 监听 → tool.sendResumeData()
```

### 关键修复

#### 1. InteractionContext 使用方式

**问题**：union-client 的 InteractionContext 不直接暴露 `interactions` 状态

**修复**：
```typescript
// ❌ 错误：直接访问状态
const { interactions } = ctx;

// ✅ 正确：使用方法访问器
const { getInteractions } = ctx;
const interactions = getInteractions();
```

#### 2. 渲染器注册系统

**问题**：zen-worker 的 register 方法签名与 zen-code 不一致

**修复**：
```typescript
// ❌ 错误：单参数签名
registry.register(renderer: T)

// ✅ 正确：两参数签名
registry.register<T extends InteractionContent>(
    type: T['type'],
    renderer: InteractionRenderer<T>
)
```

#### 3. 工具层职责划分

**问题**：zen-worker 最初错误地只查找 useApprovalIntegration 创建的交互

**修复**：
```typescript
// terminal.tsx
if (interrupt?.reviewConfig && tool.state === 'interrupted' && !interactionId) {
  const content: ApprovalContent = {
    type: 'approval',
    toolCall: { name: tool.message.name!, args: tool.getInputRepaired() },
    editableFields: ['args'],
  };
  const interaction = addInteraction(content, { tool, metadata: {...} });
  setInteractionId(interaction.id);
}

// ask_user_with_options.tsx
if (tool.state === 'interrupted' && !interactionId) {
  const content: SelectionContent = {
    type: 'selection',
    options: input.options.map(...),
    singleSelect: input.type === 'single_select',
    allowCustomInput: input.allow_custom_input ?? true,
  };
  const interaction = addInteraction(content, { tool, metadata: {...} });
  setInteractionId(interaction.id);
}
```

**职责**：
- HITL 中间件生效时，工具收到 interrupted 状态
- 工具自己创建正确类型的交互（approval 或 selection）
- 监听交互状态变化
- 执行 `tool.sendResumeData()`

---

## 二、会话隔离与状态管理

### 背景与问题

zen-worker 的审批系统遇到两个严重问题：
1. 面板切换时：已处理的审批状态不更新，仍显示为 pending
2. 会话切换时：会话A的审批交互出现在会话B中，可能导致误操作

### 解决方案 1：updateCount 计数器模式

**问题1根源**：useMemo 依赖引用不变

```typescript
// ❌ 错误：函数引用不变，useMemo 不触发
const pendingInteractions = useMemo(
  () => ctx.getInteractions().filter(i => i.state === 'idle' || i.state === 'active'),
  [ctx.getInteractions()]  // 函数引用始终不变
);

// ✅ 正确：使用 updateCount 强制更新
const pendingInteractions = useMemo(
  () => ctx.getInteractions().filter(i => i.state === 'idle' || i.state === 'active'),
  [ctx.updateCount]  // 每次更新时递增
);
```

**实现**：
```typescript
const [updateCount, setUpdateCount] = useState(0);

// 每次修改 interactions 时递增
const updateInteraction = useCallback((id: string, updates: Partial<AnyPanelInteraction>) => {
  setInteractions(prev => prev.map(int =>
    int.id === id ? { ...int, ...updates, updatedAt: new Date() } : int
  ));
  setUpdateCount(c => c + 1);  // 触发依赖更新
}, []);
```

### 解决方案 2：会话隔离 - chatId 字段

**问题2根源**：会话切换时 interactions 状态未清空

**解决方案**：在 InteractionMetadata 中添加 `chatId` 字段

```typescript
export interface InteractionMetadata {
  // ... 现有字段
  chatId?: string; // 会话 ID（用于会话隔离）
}
```

**useApprovalIntegration 实现**：
```typescript
// 添加交互时附带 chatId
addInteraction(
  { type: 'approval', toolCall: {...}, editableFields: ['args'] },
  {
    tool: toolCallInfo.tool,
    metadata: {
      title: `审批 ${toolCallInfo.name}`,
      description: (message as any).description,
      groupKey: 'approvals',
      chatId: currentChatId, // 关键：实现会话隔离
    },
  }
);

// 检测重复时只检查当前会话
const currentSessionInteractions = currentInteractions.filter(
  i => i.metadata.chatId === currentChatId
);
```

**UnifiedUIPanel 过滤**：
```typescript
const { currentChatId } = useChat();

// 只获取当前会话的交互
const allSessionInteractions = useMemo(
  () => ctx.getInteractions().filter(i => i.metadata.chatId === currentChatId),
  [ctx.updateCount, currentChatId]
);

// 会话切换时重置 activeTab
useEffect(() => {
  setActiveTab(null);
}, [currentChatId]);
```

### 解决方案 3：双重保护机制

**ChatSidebar - 用户主动切换时**：
```typescript
const handleSessionClick = async (thread: any) => {
  clearAll();  // 立即清空，快速响应
  await toHistoryChat(thread);
  navigate(...);
};

const handleCreateNew = async () => {
  clearAll();  // 创建新会话前清空
  await createNewChat();
  navigate('/');
};
```

**ChatPage - 监听会话变化**（兜底保护）：
```typescript
const { currentChatId } = useChat();
const { clearAll } = useInteractionContext();

// 兜底保护：currentChatId 变化时清空
useEffect(() => {
  console.log('[ChatPage] Session changed, clearing interactions:', currentChatId);
  clearAll();
}, [currentChatId, clearAll]);
```

### 动态 key 强制重渲染

```typescript
<InteractionRendererWrapper
  key={`${interaction.id}-${interaction.state}`}  // 状态变化时重新创建组件
  interaction={interaction}
  renderer={renderer}
  onChange={...}
/>
```

### 缓存清理

```typescript
const processedMessageIds = useRef<Set<string>>(new Set());

// 会话切换时清空缓存
useEffect(() => {
  processedMessageIds.current.clear();
}, [currentChatId]);
```

### 注意事项

1. **updateCount 性能**：每次状态更新都递增，高频场景需评估性能影响
2. **双重保护**：ChatSidebar 和 ChatPage 都调用 clearAll，确保不会遗漏
3. **缓存清理**：任何与特定会话相关的缓存都要在切换时清空
4. **组件 key**：使用动态 key 确保状态变化时组件重新创建

---

## 三、shadcn/ui 组件系统重构

### 路径别名配置

**tsconfig.json** - 添加路径映射：
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "src/*": ["./src/*"]
    }
  }
}
```

**vite.config.ts** - 添加 Vite 解析配置：
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
    },
  },
});
```

### 页面组件重构

#### ConfigPage
- 使用 `Card` 系列组件替换原生 section 布局
- 使用 `Label + Input` 组合替换原生表单元素
- 使用 `Select` 组件替换原生 `<select>`
- 使用 `Checkbox` 组件替换原生 checkbox

#### ChatPage
- 使用 `ScrollArea` 包裹消息列表优化滚动体验
- 使用 `Textarea` 组件替换原生 textarea
- 使用 `Badge` 显示加载状态
- 使用 `Alert` 组件显示错误信息

#### Sidebar
- 使用 `Separator` 组件替换原生边框
- 使用 `ScrollArea` 优化导航滚动体验

### Toast 通知系统

修改 `src/components/ui/sonner.tsx` 使用项目的 ThemeContext：
```typescript
import { useTheme } from "../../contexts/ThemeContext"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme === 'dark' ? 'dark' : 'light'}
      // ...
    />
  )
}
```

### 统一工具渲染组件

创建 `src/components/ToolCard.tsx`，支持：
- 8 种颜色主题（blue, green, yellow, orange, purple, gray, indigo, red）
- 4 种状态（loading, success, error, pending）
- 可选的 ScrollArea 支持长内容
- 完整的暗色模式支持
- 类型安全的 TypeScript 接口

**使用示例**：
```typescript
<ToolCard
  icon="📄"
  title={file_path}
  operation="read"
  meta={`${totalLines} lines`}
  output={output}
  variant="blue"
  scrollable={true}
/>
```

---

## 四、布局架构

### 背景与需求

zen-worker 需要实现类似 zen-code 的会话管理功能，并优化侧边栏布局。原有的 Sidebar 组件（3352 字节）占用空间大，需要重构为更紧凑的 icon 导航形式。

### 双侧边栏布局

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

### 统一数据源：`useChat` Hook

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

### IconNavbar 组件

**文件**: `zen-worker/src/components/Layout/IconNavbar.tsx` (3536 字节)

**特性**:
- 宽度 64px，图标居中显示
- 使用 `lucide-react` 图标库（MessageSquare, Settings, Target 等）
- Radix UI Tooltip 显示导航项名称
- 主题切换按钮集成在底部
- 高亮当前页面（蓝色背景 + 阴影）

### ChatSidebar 组件

**移除功能**:
- localStorage 存储（STORAGE_KEY）
- 手动 CRUD 操作
- 编辑/重命名功能（LangGraph API 不支持）
- 删除会话功能

**新增功能**:
- 搜索过滤（按 thread_id）
- 刷新按钮（Loader2 动画）
- 状态指示器（Circle 图标 + 颜色映射）
- Tooltip 显示完整 thread_id

---

## 五、样式主题系统修复

### 背景与问题

使用 shadcn/ui 时发现：
1. border 颜色不随亮/暗模式切换
2. `focus-visible:outline-none` 和 ring 样式不生效

### 根本原因

1. **tailwind.config.js 的 theme 为空**：缺少 Tailwind 颜色类到 CSS 变量的映射
2. **CSS 硬编码冲突**：`border-color: #eee` 和 `outline: none` 覆盖了 shadcn 样式

### 解决方案

#### 1. tailwind.config.js 配置

添加完整的颜色映射（`tailwind.config.js`）：

```javascript
theme: {
  extend: {
    colors: {
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      'ring-offset': 'hsl(var(--background))', // 关键：ring offset 背景色
      primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
      secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
      destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
      accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
      card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    },
  },
}
```

#### 2. index.css 修复

**错误做法**（不生效）：
```css
@layer base {
  * {
    @apply border-border;  /* ❌ @apply 不能使用变量类名 */
    outline: none;         /* ❌ 干扰 focus-visible */
  }
}
```

**正确做法**：
```css
@layer base {
  * {
    border-color: hsl(var(--border));  /* ✅ 直接使用 CSS 变量 */
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

---

## 适用场景

- zen-worker Web UI 完整交互系统
- 使用 union-client 的 InteractionContext
- 需要统一管理多种类型交互（approval、selection、input、confirm）
- HITL 中间件集成（tool.state === 'interrupted'）
- 类型安全的渲染器注册系统
- React 项目使用 shadcn/ui 组件系统的全面迁移
- 需要会话隔离的多会话应用
- 需要紧凑导航栏的多页面应用
- 使用 shadcn/ui + Tailwind CSS 的项目

---

## 关键注意事项

### 交互系统
- **InteractionContext 封装**：只提供方法访问器，不直接暴露状态
- **工具层职责**：HITL 生效时自己创建交互，类型正确（approval 或 selection）
- **useApprovalIntegration**：作为后备机制，跳过 UI 工具，避免重复
- **渲染器注册**：使用两参数签名，提供更好的类型推断

### 会话隔离
- **updateCount 性能**：每次状态更新都递增，高频场景需评估性能影响
- **双重保护**：ChatSidebar 和 ChatPage 都调用 clearAll，确保不会遗漏
- **缓存清理**：任何与特定会话相关的缓存都要在切换时清空
- **组件 key**：使用动态 key 确保状态变化时组件重新创建

### shadcn/ui 组件系统
- 路径别名配置需要同时更新 tsconfig.json 和 vite.config.ts
- shadcn/ui 组件使用 "src/lib/utils" 导入路径，需要配置路径别名支持

### 样式主题
- @apply 指令不能直接使用像 `border-border` 这样的 Tailwind 变量类
- 全局 outline: none 会干扰 focus-visible 的 ring 效果，应移除
- ring-offset 颜色必须配置为 `--background`，否则 ring 效果不完整

---

## 相关文件

### 交互系统核心架构
- `packages/union-client/src/interaction/` - 统一交互系统（共享）
- `zen-worker/src/interaction/context.tsx` - InteractionContext 实现
- `zen-worker/src/interaction/UnifiedUIPanel.tsx` - 统一交互面板
- `zen-worker/src/interaction/registry.ts` - 渲染器注册系统

### 工具层
- `zen-worker/src/hooks/useApprovalIntegration.ts` - 全局工具检测（后备机制）
- `zen-worker/src/tools/terminal.tsx` - 终端工具（approval 类型交互）
- `zen-worker/src/tools/ask_user_with_options.tsx` - 用户选择工具（selection 类型交互）

### 布局系统
- `zen-worker/src/components/Layout/index.tsx` - 布局容器
- `zen-worker/src/components/Layout/IconNavbar.tsx` - 图标导航栏
- `zen-worker/src/components/Layout/ChatSidebar.tsx` - 会话侧边栏

### shadcn/ui 组件系统
- `zen-worker/src/components/ToolCard.tsx` - 统一工具渲染组件
- `zen-worker/src/components/ui/` - shadcn/ui 组件库
- `zen-worker/vite.config.ts` - Vite 路径别名配置
- `zen-worker/tsconfig.json` - TypeScript 路径别名配置

### 样式主题
- `zen-worker/tailwind.config.js` - Tailwind 颜色变量映射
- `zen-worker/src/index.css` - CSS 变量和全局样式
