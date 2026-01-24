---
name: "zen-worker-interaction-complete"
description: "zen-worker 完整的交互系统架构：从审批系统到统一交互系统的演进。涵盖 ApprovalContext 迁移到 InteractionContext、职责分离原则（useApprovalIntegration 全局检测 + 工具层创建交互）、渲染器注册系统（两参数签名）、工具层职责划分（HITL 生效时自己创建交互，未生效时 useApprovalIntegration 作为后备）、InteractionRendererWrapper 数据传递（合并 config）。适用于 zen-worker Web UI 的完整交互系统实现。"
tags: ["zen-worker", "interaction-context", "approval-system", "renderer-registry", "useApprovalIntegration", "union-client", "architecture-alignment", "hitl", "tool-integration", "interaction-renderer-wrapper"]
category: "architecture"
created: "2025-01-23"
last_updated: "2025-01-24"
priority: "high"
context_scope: "project"
---

# 背景

zen-worker 的交互系统经历了从审批系统到统一交互系统的演进。最初使用 ApprovalContext 管理工具审批，后来迁移到 union-client 的 InteractionContext 实现统一管理（approval、selection、input、confirm 等多种交互类型）。整个演进过程涉及 Context 迁移、职责分离、渲染器注册、工具层职责划分等多个架构层面的修复。

## 核心架构

### 统一交互系统（最终架构）

**组件职责：**

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

**关键点：**
- HITL 生效时，工具自己创建交互（类型正确：approval 或 selection）
- HITL 未生效时，useApprovalIntegration 作为后备（统一 approval 类型）
- UI 工具跳过检测（避免重复）
- 通过 `exists` 检测机制避免重复添加交互

## 关键修复

### 1. InteractionContext 使用方式

**问题：** union-client 的 InteractionContext 不直接暴露 `interactions` 状态

**修复：**
```typescript
// ❌ 错误：直接访问状态
const { interactions } = ctx;

// ✅ 正确：使用方法访问器
const { getInteractions } = ctx;
const interactions = getInteractions();
```

**修复位置：**
- `zen-worker/src/interaction/UnifiedUIPanel.tsx:48`
- `zen-worker/src/pages/ChatPage.tsx:52`

**原因：** InteractionContextValue 接口只提供方法访问器，遵循封装原则

### 2. 渲染器注册系统

**问题：** zen-worker 的 register 方法签名与 zen-code 不一致

**修复：**
```typescript
// ❌ 错误：单参数签名
registry.register(renderer: T)

// ✅ 正确：两参数签名
registry.register<T extends InteractionContent>(
    type: T['type'],
    renderer: InteractionRenderer<T>
)
```

**修复位置：**
- `zen-worker/src/interaction/registry.ts:31-37`
- `zen-worker/src/interaction/setup.ts:18-21`

**使用示例：**
```typescript
// 注册
rendererRegistry.register('approval', ApprovalRenderer);
rendererRegistry.register('selection', SelectionRenderer);

// 使用时自动推断类型
const renderer = registry.getRenderer(interaction); // 类型安全
```

**原因：** zen-code 使用两参数签名提供更好的类型推断

### 3. useApprovalIntegration 职责

**问题：** 最初错误地只为所有工具添加 approval 交互，导致 UI 工具重复处理

**修复：**
```typescript
const UI_TOOLS = ['terminal', 'ask_user_with_options'];

// 在检测工具调用时跳过 UI 工具
if (UI_TOOLS.includes(toolCallInfo.name)) {
    console.log('[useApprovalIntegration] Skipping UI tool:', toolCallInfo.name);
    processedMessageIds.current.add(messageId);
    continue;
}
```

**原因：**
- UI 工具在 HITL 生效时会自己创建正确类型的交互
- useApprovalIntegration 只作为后备机制（当 HITL 未生效时）
- 避免重复添加交互

### 4. 工具层职责划分（最终对齐）

**问题：** zen-worker 最初错误地只查找 useApprovalIntegration 创建的交互，没有自己创建交互

**修复：**
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

**职责：**
- HITL 中间件生效时，工具收到 interrupted 状态
- 工具自己创建正确类型的交互（approval 或 selection）
- 监听交互状态变化
- 执行 `tool.sendResumeData()`

### 5. InteractionRendererWrapper 数据传递

**问题：** 渲染器接收的数据格式与 zen-code 不一致

**修复：**
```typescript
// ❌ 错误：可选链 + 直接传递
config.layout: ...interaction.config?.layout,
renderer.render(interaction, onChange)

// ✅ 正确：直接访问 + 合并 config
config.layout: ...interaction.config.layout,
renderer.render({...interaction, config}, onChange)
```

**修复位置：** `zen-worker/src/interaction/InteractionRendererWrapper.tsx:28-35, 54-58`

**原因：**
- PanelInteraction 的 config 字段是必需的，不需要可选链
- zen-code 会将合并后的 config 传递给 renderer，确保渲染器接收到一致的配置
- InteractionContext 的 addInteraction 正确初始化了 config，包含默认值

### 6. 从 ApprovalContext 迁移到 InteractionContext

**问题诊断：**
```
1. App.tsx → ApprovalProvider 和 InteractionProvider 都存在
2. ChatPage.tsx → 显示 UnifiedUIPanel（当 hasPendingInteractions）
3. useApprovalIntegration → 使用 ApprovalContext（错误！）
4. terminal.tsx → 正确使用 InteractionContext
5. 结论：Context 不匹配是根本原因
```

**修复：**
```typescript
// ❌ 错误：使用 ApprovalContext
import { useApproval } from '../contexts/ApprovalContext';

export const useApprovalIntegration = () => {
    const { addApprovalRequest, requests } = useApproval();
    // ...
    addApprovalRequest({ ... });
};

// ✅ 正确：使用 InteractionContext
import { useInteractionContext } from '../interaction';

export const useApprovalIntegration = () => {
    const { addInteraction, getInteractions } = useInteractionContext();
    // ...
    addInteraction(
        { type: 'approval', toolCall: {...}, editableFields: ['args'] },
        { tool: toolCallInfo.tool, metadata: {...} }
    );
};
```

**清理废弃组件：**
- 删除 `GlobalApprovalPanel` 的导入和使用
- 删除 `ApprovalProvider`，只保留 `InteractionProvider`

## 审批系统架构（历史参考）

### ApprovalContext 职责（已废弃，保留参考）

**管理审批队列和执行：**
- 管理审批请求状态（requests）
- 自动执行已完成的审批（executeApproved）
- 调用 tool.sendResumeData()

**架构流程：**
```
useApprovalIntegration → 检测工具调用
    ↓
ApprovalContext → 管理审批队列
    ↓
GlobalApprovalPanel → 用户操作
    ↓
ApprovalContext → 自动执行审批结果
```

**职责分离原则：**
1. **useApprovalIntegration** - 全局检测工具中断，不执行审批
2. **ApprovalContext** - 管理审批队列和执行
3. **GlobalApprovalPanel** - UI 层，本地 activeTab 状态
4. **工具层**（terminal.tsx） - 只监听审批状态并执行 sendResumeData

**为什么废弃：**
- InteractionContext 提供了更统一的交互管理（不仅限于 approval）
- 支持多种交互类型（selection、input、confirm、approval）
- 更好的类型安全和扩展性

## 工具检测逻辑

### isToolCallMessage

```typescript
function isToolCallMessage(message: any): boolean {
    return (
        message.type === 'tool' ||
        (message.content && Array.isArray(message.content.tool_calls) && message.content.tool_calls.length > 0)
    );
}
```

### extractToolCallInfo

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

### getMessageId

```typescript
function getMessageId(message: any): string {
    return message.id || message.message_id || JSON.stringify({
        name: message.name,
        content: message.content,
        timestamp: message.timestamp
    });
}
```

## 适用场景

- zen-worker Web UI 完整交互系统
- 使用 union-client 的 InteractionContext
- 需要统一管理多种类型交互（approval、selection、input、confirm）
- HITL 中间件集成（tool.state === 'interrupted'）
- 类型安全的渲染器注册系统
- 工具层职责分离（自己创建交互 vs 全局检测）

## 关键文件

### 核心架构
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

### 后端配置
- `packages/agent/src/subagents/factory.ts` - HITL 中间件配置

## 调试方法

### 添加日志确认状态

**前端日志：**
```typescript
// ChatPage.tsx
console.log('[ChatPage] hasPendingInteractions:', hasPendingInteractions);
console.log('[ChatPage] interactions:', interactions);

// terminal.tsx
console.log('[terminal] tool.state:', tool.state);
console.log('[terminal] interrupt:', interrupt);

// useApprovalIntegration
console.log('[useApprovalIntegration] Skipping UI tool:', toolCallInfo.name);
```

**后端日志：**
```typescript
// factory.ts
console.log('[HITL] Enabling Human-in-the-Loop middleware');
console.log('[HITL] ask_user_with_options_config:', ask_user_with_options_config);
console.log('[HITL] Final config:', hitlConfig);
```

### 验证步骤

1. ✅ HITL 中间件配置正确（tool.state === 'interrupted'）
2. ✅ 工具自己创建正确类型的交互
3. ✅ UnifiedUIPanel 显示所有交互
4. ✅ 渲染器正确注册和渲染
5. ✅ 用户操作触发状态变化
6. ✅ 工具执行 sendResumeData

## 注意事项

- **InteractionContext 封装**：只提供方法访问器，不直接暴露状态
- **工具层职责**：HITL 生效时自己创建交互，类型正确（approval 或 selection）
- **useApprovalIntegration**：作为后备机制，跳过 UI 工具，避免重复
- **渲染器注册**：使用两参数签名，提供更好的类型推断
- **config 传递**：合并 config 后传递给 renderer，确保一致性
- **避免重复**：通过 `exists` 检测机制（interactionId）避免重复添加交互
- **类型安全**：使用泛型确保渲染器和交互类型匹配

## 相关记忆

- `unified-interaction-context-architecture` - union-client 的 InteractionContext 架构
- `unified-ui-interaction-system-architecture` - 统一UI交互系统v2.0.0架构
- `langgraph-createuitool-web-ui-pattern` - LangGraph SDK 的 createUITool 使用模式
