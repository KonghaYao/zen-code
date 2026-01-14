---
name: "tui-model-panel-implementation"
description: "TUI 系统中模型选择面板的完整实现。通过创建 ModelPanel 组件实现交互式模型列表界面（支持↑↓选择、Enter切换、q关闭），在 Chat.tsx 中扩展 activeView 状态添加 'model' 类型并定义 switchToModel 回调函数，更新 CommandHandlerProps 和 CommandContext 类型包含 switchToModel，在命令系统中注册 modelPanelCommand（/model-panel 或 /mp）。修复了 CommandHandler 未从 props 解构和传递 switchToModel 到 commandContext 的 bug。适用于需要为 TUI 应用添加新面板或扩展命令系统控制 UI 状态的场景。"
tags: ["tui", "model-selection", "panel-system", "command-system", "react-ink"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "high"
context_scope: "project"
---

# ## 问题

## 问题

需要在 TUI 系统中添加一个交互式模型选择面板，让用户可以通过键盘导航快速切换 AI 模型，而不是只能通过命令行参数。

## 解决方案

### 1. ModelPanel 组件实现

创建 `tui/src/chat/components/ModelPanel.tsx`，核心功能：
- 使用 `useFocus` 和 `useInput` 实现键盘控制
- 显示所有可用模型列表（从 SettingsContext.AVAILABLE_MODELS 获取）
- 高亮当前模型和选中项
- 按 Enter 切换模型并自动关闭面板
- 切换时显示动画状态（⟳ 切换中...）

关键交互逻辑（3 行）：
```typescript
if (key.upArrow) setSelectedIndex((prev) => (prev > 0 ? prev - 1 : AVAILABLE_MODELS.length - 1));
if (key.downArrow) setSelectedIndex((prev) => (prev < AVAILABLE_MODELS.length - 1 ? prev + 1 : 0));
if (key.return) handleModelSwitch(AVAILABLE_MODELS[selectedIndex]);
```

### 2. 面板系统集成

在 `tui/src/chat/Chat.tsx` 中：

1. **扩展视图状态类型**：
```typescript
const [activeView, setActiveView] = useState<'chat' | 'history' | 'knowledge' | 'model'>('chat');
```

2. **定义回调函数**：
```typescript
const switchToModel = useCallback(() => {
    setActiveView('model');
}, []);
```

3. **添加条件渲染**：
```typescript
{activeView === 'model' && <ModelPanel onClose={closePanel} />}
```

### 3. 命令系统扩展

**类型定义**（`tui/src/chat/commands/types.ts`）：
在 CommandContext 接口添加：
```typescript
switchToModel?: () => void;
```

**命令注册**（`tui/src/chat/commands/extended.ts`）：
```typescript
export const modelPanelCommand: CommandDefinition = {
    name: 'model-panel',
    description: '打开模型选择面板',
    aliases: ['mp'],
    execute: async (args: string[], context) => {
        context.switchToModel?.();
        return { success: true, message: '已打开模型选择面板', shouldClearInput: true };
    },
};
```

### 4. Bug 修复

**问题**：CommandHandler 未传递 switchToModel 导致命令执行时 context.switchToModel 为 undefined。

**修复**（`tui/src/chat/context/CommandHandler.tsx`）：
1. CommandHandlerProps 接口添加 `switchToModel?: () => void;`
2. 从 props 解构 `switchToModel`
3. 在 commandContext 中包含 `switchToModel`

## 适用场景

- 需要在 TUI 应用中添加新面板时
- 需要通过命令系统控制 UI 状态切换时
- 需要实现键盘导航的列表选择界面时

## 注意

- 面板切换回调必须完整传递：Chat.tsx → ChatInput → CommandHandler → commandContext
- 使用 useCallback 包装回调函数避免不必要的重渲染
- 面板组件应使用 useFocus({ autoFocus: true }) 自动获取焦点
- 按 q/ESC 关闭面板是统一的交互模式
