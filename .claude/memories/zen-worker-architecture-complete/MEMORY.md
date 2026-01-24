---
name: "zen-worker-architecture-complete"
description: "zen-worker Web UI 完整架构：包括统一交互系统（InteractionContext）、shadcn/ui 组件系统重构、样式主题修复和前端集成。涵盖从 ApprovalContext 到 InteractionContext 的迁移、职责分离原则、渲染器注册系统、工具层职责划分、路径别名配置、Toaster 通知系统、Tailwind CSS 修复等。适用于 zen-worker Web UI 的完整架构实现。"
tags: ["zen-worker", "interaction-context", "approval-system", "renderer-registry", "useApprovalIntegration", "shadcn-ui", "react", "refactoring", "component-library", "tailwind", "css-variables", "theme-configuration"]
category: "architecture"
created: "2025-01-23"
last_updated: "2025-01-24"
priority: "high"
context_scope: "project"
---

# zen-worker Web UI 完整架构

## 架构概述

zen-worker Web UI 包含三大核心子系统：
1. **统一交互系统** - InteractionContext 迁移和工具集成
2. **shadcn/ui 组件系统** - 全面重构和统一 UI 风格
3. **样式主题系统** - Tailwind CSS 和 CSS 变量修复

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
工具自己创建正确类型的交互
  - terminal → approval
  - ask_user_with_options → selection
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

**关键点**：
- HITL 生效时，工具自己创建交互（类型正确：approval 或 selection）
- HITL 未生效时，useApprovalIntegration 作为后备（统一 approval 类型）
- UI 工具跳过检测（避免重复）
- 通过 `exists` 检测机制避免重复添加交互

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

**修复位置**：
- `zen-worker/src/interaction/UnifiedUIPanel.tsx:48`
- `zen-worker/src/pages/ChatPage.tsx:52`

**原因**：InteractionContextValue 接口只提供方法访问器，遵循封装原则

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

**修复位置**：
- `zen-worker/src/interaction/registry.ts:31-37`
- `zen-worker/src/interaction/setup.ts:18-21`

**使用示例**：
```typescript
// 注册
rendererRegistry.register('approval', ApprovalRenderer);
rendererRegistry.register('selection', SelectionRenderer);

// 使用时自动推断类型
const renderer = registry.getRenderer(interaction); // 类型安全
```

**原因**：zen-code 使用两参数签名提供更好的类型推断

#### 3. useApprovalIntegration 职责

**问题**：最初错误地只为所有工具添加 approval 交互，导致 UI 工具重复处理

**修复**：
```typescript
const UI_TOOLS = ['terminal', 'ask_user_with_options'];

// 在检测工具调用时跳过 UI 工具
if (UI_TOOLS.includes(toolCallInfo.name)) {
    console.log('[useApprovalIntegration] Skipping UI tool:', toolCallInfo.name);
    processedMessageIds.current.add(messageId);
    continue;
}
```

**原因**：
- UI 工具在 HITL 生效时会自己创建正确类型的交互
- useApprovalIntegration 只作为后备机制（当 HITL 未生效时）
- 避免重复添加交互

#### 4. 工具层职责划分（最终对齐）

**问题**：zen-worker 最初错误地只查找 useApprovalIntegration 创建的交互，没有自己创建交互

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

#### 5. InteractionRendererWrapper 数据传递

**问题**：渲染器接收的数据格式与 zen-code 不一致

**修复**：
```typescript
// ❌ 错误：可选链 + 直接传递
config.layout: ...interaction.config?.layout,
renderer.render(interaction, onChange)

// ✅ 正确：直接访问 + 合并 config
config.layout: ...interaction.config.layout,
renderer.render({...interaction, config}, onChange)
```

**修复位置**：`zen-worker/src/interaction/InteractionRendererWrapper.tsx:28-35, 54-58`

**原因**：
- PanelInteraction 的 config 字段是必需的，不需要可选链
- zen-code 会将合并后的 config 传递给 renderer，确保渲染器接收到一致的配置
- InteractionContext 的 addInteraction 正确初始化了 config，包含默认值

#### 6. 从 ApprovalContext 迁移到 InteractionContext

**清理废弃组件**：
- 删除 `GlobalApprovalPanel` 的导入和使用
- 删除 `ApprovalProvider`，只保留 `InteractionProvider`

### 工具检测逻辑

**isToolCallMessage**：
```typescript
function isToolCallMessage(message: any): boolean {
    return (
        message.type === 'tool' ||
        (message.content && Array.isArray(message.content.tool_calls) && message.content.tool_calls.length > 0)
    );
}
```

**extractToolCallInfo**：
```typescript
function extractToolCallInfo(message: any) {
    let toolCall: { name: string; args: any } | null = null;
    let tool: any = null;

    // 优先从 content.tool_calls[0] 获取
    if (message.content?.tool_calls?.[0]) {
        const tc = message.content.tool_calls[0];
        toolCall = { name: tc.name, args: tc.args };
        tool = tc.tool;
    }
    // 其次从 message.name 获取
    else if (message.name) {
        toolCall = { name: message.name, args: message.content || {} };
    }

    return { toolCall, tool };
}
```

**getMessageId**：
```typescript
function getMessageId(message: any): string {
    return message.id || message.message_id || JSON.stringify({
        name: message.name,
        content: message.content,
        timestamp: message.timestamp
    });
}
```

---

## 二、shadcn/ui 组件系统重构

### 背景与目标

zen-worker 项目需要使用 shadcn/ui 组件系统进行全面重构，以统一 UI 风格、提升可维护性和代码复用率。

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
  // ...
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

#### SkillsPage / HistoryPage / PluginsPage
- 使用 `Card` 系列组件统一占位页面样式
- 使用 `Badge` 显示状态标签

#### Sidebar
- 使用 `Separator` 组件替换原生边框
- 使用 `ScrollArea` 优化导航滚动体验

#### GlobalApprovalPanel
- 使用 `Badge` 组件显示审批统计信息
- 使用不同 `Badge` variant 区分审批状态

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

在 `App.tsx` 中添加 `<Toaster />` 组件。

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

重构了 8 个工具组件：
- `folder_operations.tsx` - indigo 主题
- `replace_in_file.tsx` - yellow 主题
- `write_file.tsx` - orange 主题，显示行数和写入状态
- `todo_tool.tsx` - green 主题
- `batch_command.tsx` - gray 主题
- `read_file.tsx` - blue 主题，支持滚动
- `glob_files.tsx` - purple 主题，支持滚动

### 架构优势

1. **设计系统一致性**：所有页面使用统一的组件库
2. **类型安全**：完整的 TypeScript 类型支持
3. **可维护性**：组件化设计，易于复用和修改
4. **可访问性**：Radix UI 提供完整的 ARIA 支持
5. **主题支持**：原生支持暗色模式，自动切换
6. **代码简化**：每个工具的 render 函数从 ~30 行减少到 ~15 行，代码重复减少 70%+

### 修复的问题

1. **ConfigPage JSX 闭合标签错误** - 添加缺失的 `</CardContent>` 标签
2. **路径别名解析错误** - 配置 tsconfig.json 和 vite.config.ts 的 paths 和 alias

---

## 三、样式主题系统修复

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

#### 3. --ring 颜色调整

调整 `--ring` 值使其更明显：

```css
:root {
  --ring: 222.2 47.4% 11.2%;  /* 亮色：深蓝色 */
}

.dark {
  --ring: 216 34% 17%;  /* 暗色：浅蓝色 */
}
```

### 验证

组件的 focus-visible 样式现在正常工作：
```css
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

### 注意事项

1. **@apply 指令限制**：不能直接使用像 `border-border` 这样的 Tailwind 变量类
2. **全局 outline: none**：会干扰 focus-visible 的 ring 效果，应移除
3. **ring-offset 颜色**：必须配置为 `--background`，否则 ring 效果不完整

---

## 适用场景

- zen-worker Web UI 完整交互系统
- 使用 union-client 的 InteractionContext
- 需要统一管理多种类型交互（approval、selection、input、confirm）
- HITL 中间件集成（tool.state === 'interrupted'）
- 类型安全的渲染器注册系统
- 工具层职责分离（自己创建交互 vs 全局检测）
- React 项目使用 shadcn/ui 组件系统的全面迁移
- 需要统一 UI 风格和提升可维护性的项目
- 创建可复用的工具渲染组件
- 使用 shadcn/ui + Tailwind CSS 的项目
- 需要自定义主题颜色的场景
- focus-visible 可访问性需求

---

## 关键注意事项

### 交互系统
- **InteractionContext 封装**：只提供方法访问器，不直接暴露状态
- **工具层职责**：HITL 生效时自己创建交互，类型正确（approval 或 selection）
- **useApprovalIntegration**：作为后备机制，跳过 UI 工具，避免重复
- **渲染器注册**：使用两参数签名，提供更好的类型推断
- **config 传递**：合并 config 后传递给 renderer，确保一致性
- **避免重复**：通过 `exists` 检测机制（interactionId）避免重复添加交互
- **类型安全**：使用泛型确保渲染器和交互类型匹配

### shadcn/ui 组件系统
- 确保项目已安装所有必要的 @radix-ui 依赖
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
- `zen-worker/src/interaction/InteractionRendererWrapper.tsx` - 渲染器包装器

### 工具层
- `zen-worker/src/hooks/useApprovalIntegration.ts` - 全局工具检测（后备机制）
- `zen-worker/src/tools/terminal.tsx` - 终端工具（approval 类型交互）
- `zen-worker/src/tools/ask_user_with_options.tsx` - 用户选择工具（selection 类型交互）

### 页面集成
- `zen-worker/src/pages/ChatPage.tsx` - 页面集成
- `zen-worker/src/App.tsx` - Provider 配置

### shadcn/ui 组件系统
- `zen-worker/src/components/ToolCard.tsx` - 统一工具渲染组件
- `zen-worker/src/components/ui/` - shadcn/ui 组件库
- `zen-worker/vite.config.ts` - Vite 路径别名配置
- `zen-worker/tsconfig.json` - TypeScript 路径别名配置

### 样式主题
- `zen-worker/tailwind.config.js` - Tailwind 颜色变量映射
- `zen-worker/src/index.css` - CSS 变量和全局样式

### 后端配置
- `packages/agent/src/subagents/factory.ts` - HITL 中间件配置
