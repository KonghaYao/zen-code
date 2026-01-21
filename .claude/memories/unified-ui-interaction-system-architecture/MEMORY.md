---
name: "unified-ui-interaction-system-architecture"
description: "统一UI交互系统v2.0.0分层可扩展架构实现。包含基础类型层、面板层、渲染器系统和统一面板组件。关键特性：可插拔渲染器注册机制、每个交互独立tab显示、执行完自动隐藏、类型安全的组合设计。适用于TUI应用中需要灵活用户交互场景（审批、选择、输入、确认）。"
tags: ["ui-interaction-system", "renderer-pattern", "layered-architecture", "react-ink", "type-safe"]
category: "architecture"
created: "2025-01-21"
last_updated: "2025-01-21"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

用户要求实现 `specs/unified-ui-interaction-system.md` 规范中的v2.0.0分层可扩展架构，替换原有的平行类型设计。

## 架构设计

### 分层架构
```
基础层 → 面板层 → 类型层
```

### 文件组织
```
tui/src/chat/interaction/
├── types.ts                      # InteractionCategory、InteractionState、BaseInteraction
├── content.ts                    # ApprovalContent、SelectionContent、InputContent、ConfirmContent
├── panel.ts                      # PanelInteraction、PanelConfig
├── context.tsx                   # InteractionContext
├── registry.ts                   # rendererRegistry、InteractionRenderer接口
├── setup.ts                      # registerDefaultRenderers()
├── UnifiedUIPanel.tsx            # 统一面板组件
├── InteractionRendererWrapper.tsx # 渲染器包装器
└── renderers/
    ├── ApprovalRenderer.tsx
    ├── SelectionRenderer.tsx
    ├── InputRenderer.tsx
    ├── ConfirmRenderer.tsx
    └── FilePickerRenderer.tsx    # 自定义示例
```

## 核心实现

### 1. 可插拔渲染器系统
`registry.ts:33-45`：GlobalRendererRegistry类实现
```typescript
class GlobalRendererRegistry implements RendererRegistry {
  private renderers = new Map<InteractionContent['type'], InteractionRenderer<any>>();
  
  register<T extends InteractionContent>(type: T['type'], renderer: InteractionRenderer<T>) {
    this.renderers.set(type, renderer);
  }
  
  get<T extends InteractionContent>(type: T['type']) {
    return this.renderers.get(type);
  }
}
```

### 2. 交互类型定义
`panel.ts:1-50`：PanelInteraction通过组合实现
```typescript
interface PanelInteraction extends BaseInteraction {
  category: 'panel';
  config: PanelConfig;
  content: InteractionContent;
}

type ApprovalInteraction = PanelInteraction & {
  content: ApprovalContent;
  result?: ApprovalResult;
};
```

### 3. 工具集成模式
`ask_user_with_options.tsx:30-50`：监听交互状态变化
```typescript
// 添加交互
const interaction = addInteraction(content, { tool, metadata });

// 轮询检查交互状态
useEffect(() => {
  const checkInteraction = () => {
    const interaction = getInteractions().find(i => i.id === interactionId);
    if (interaction?.state === 'submitted' && !interaction.resultSent) {
      tool.sendResumeData({ type: 'respond', message });
      updateInteraction(interactionId, { resultSent: true });
    }
  };
  const interval = setInterval(checkInteraction, 100);
  return () => clearInterval(interval);
}, [interactionId]);
```

## 问题修复

### 原始问题
1. 执行完后没有隐藏面板
2. 每个交互应该以tab形式显示，不是一起出来

### 修复方案

**UnifiedUIPanel.tsx**：每个交互独立tab
```typescript
// 只显示待处理的交互
const pendingInteractions = ctx.getInteractions().filter(
  i => i.state === 'idle' || i.state === 'active'
);

// 没有待处理交互时不渲染
if (pendingInteractions.length === 0) {
  return null;
}

// 每个交互一个tab
const tabItems = pendingInteractions.map(interaction => ({
  id: interaction.id,
  label: `${icon} ${interaction.metadata.title || interaction.content.type}`,
}));

// 提交后跳转到下一个
onChange={(updates) => {
  ctx.updateInteraction(interaction.id, updates);
  if (updates.state === 'submitted') {
    nextTab(interaction.id);
  }
}}
```

**context.tsx**：自动清理已完成交互
```typescript
useEffect(() => {
  if (allInteractionsProcessed && !hasPendingInteractions) {
    submitInteractions();
    setTimeout(() => clearCompleted(), 100);
  }
}, [allInteractionsProcessed, hasPendingInteractions]);
```

**Chat.tsx**：面板显示条件
```typescript
const showUnifiedPanel = hasPendingInteractions; // 只在有待处理交互时显示
```

## 扩展性

### 注册自定义渲染器
```typescript
import { rendererRegistry } from './interaction/registry';

rendererRegistry.register('file-picker', {
  type: 'file-picker',
  render(interaction, onChange) {
    return <MyCustomUI />;
  },
  defaultConfig: { layout: { border: true } },
});
```

## 注意事项

- 工具组件中需要使用轮询检查交互状态（临时方案）
- 保持与旧ApprovalProvider的兼容性，渐进式迁移
- 每个交互完成后会自动跳转到下一个待处理的交互
- 没有待处理交互时面板会自动隐藏（返回null）

