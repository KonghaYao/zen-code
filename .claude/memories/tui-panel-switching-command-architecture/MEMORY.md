---
name: "tui-panel-switching-command-architecture"
description: "TUI 系统使用命令系统控制面板切换的架构设计。通过扩展 CommandContext 类型添加 switchToHistory、switchToKnowledge、closePanel 回调函数，在 Chat 组件中定义这些回调并通过 CommandHandler 传递到命令系统。注册了 /h（/history）、/k（/knowledge）、/c（/close）命令替代原有的快捷键监听方式。优化了命令建议算法，实现前缀匹配优先、常用命令优先（history/knowledge/close/help/init）、短命令优先的排序逻辑。移除了 mode 状态和两套 useInput 监听器，简化了状态管理。适用于需要将命令系统扩展到 UI 控制场景，或重构 TUI 应用交互模式的场景。"
tags: ["tui", "command-system", "ui-panel-control", "architecture-refactor", "command-suggestions"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

TUI Chat.tsx 原先使用双模式系统（command mode 和 agent mode）通过快捷键控制面板切换：
- command mode 下按 `h`/`k`/`n` 切换面板
- agent mode 下按 `ESC` 返回 command mode
- 两套 `useInput` 监听器管理不同模式的键盘输入

用户要求将所有面板切换统一为命令方式。

## 架构设计

### 1. 扩展 CommandContext 类型

在 `tui/src/chat/commands/types.ts` 中添加面板控制回调：

```typescript
export interface CommandContext {
    // ... 原有字段
    /** 切换到历史面板 */
    switchToHistory?: () => void;
    /** 切换到知识库面板 */
    switchToKnowledge?: () => void;
    /** 关闭面板返回聊天 */
    closePanel?: () => void;
}
```

### 2. 定义面板切换命令

在 `tui/src/chat/commands/extended.ts` 中添加命令：

```typescript
export const historyCommand: CommandDefinition = {
    name: 'history',
    description: '打开历史面板',
    aliases: ['h'],
    execute: async (args: string[], context) => {
        if (context.switchToHistory) {
            context.switchToHistory();
            return { success: true, message: '已打开历史面板', shouldClearInput: true };
        }
        return { success: false, message: '面板切换功能不可用', shouldClearInput: true };
    },
};

export const knowledgeCommand: CommandDefinition = {
    name: 'knowledge',
    description: '打开知识库面板',
    aliases: ['k'],
    execute: async (args: string[], context) => {
        if (context.switchToKnowledge) {
            context.switchToKnowledge();
            return { success: true, message: '已打开知识库面板', shouldClearInput: true };
        }
        return { success: false, message: '面板切换功能不可用', shouldClearInput: true };
    },
};

export const closePanelCommand: CommandDefinition = {
    name: 'close',
    description: '关闭当前面板返回聊天',
    aliases: ['c', 'q'],
    execute: async (args: string[], context) => {
        if (context.closePanel) {
            context.closePanel();
            return { success: true, message: '已关闭面板', shouldClearInput: true };
        }
        return { success: false, message: '面板关闭功能不可用', shouldClearInput: true };
    },
};

export const extendedCommands: CommandDefinition[] = [
    statusCommand,
    templateCommand,
    modelCommand,
    configCommand,
    mcpCommand,
    summarizeCommand,
    historyCommand,
    knowledgeCommand,
    closePanelCommand,
];
```

### 3. Chat 组件重构

在 `tui/src/chat/Chat.tsx` 中：

- 移除 `mode` 状态
- 移除两套 `useInput` 监听器
- 定义面板切换回调：

```typescript
const switchToHistory = useCallback(() => {
    setActiveView('history');
}, []);

const switchToKnowledge = useCallback(() => {
    setActiveView('knowledge');
}, []);

const closePanel = useCallback(() => {
    setActiveView('chat');
    focusManager.focus('global-input');
}, [focusManager]);
```

- 通过 CommandInput 传递回调：

```typescript
<ChatInput
    switchToHistory={switchToHistory}
    switchToKnowledge={switchToKnowledge}
    closePanel={closePanel}
/>
```

- 更新面板的 onClose 使用统一的 closePanel：

```typescript
{activeView === 'history' && (
    <HistoryList onClose={closePanel} />
)}
{activeView === 'knowledge' && (
    <KnowledgePanel onClose={closePanel} />
)}
```

### 4. CommandHandler 更新

在 `tui/src/chat/context/CommandHandler.tsx` 中：

- 扩展接口接收面板回调：

```typescript
interface CommandHandlerProps {
    extraParams?: any;
    onCommandExecuted?: () => void;
    switchToHistory?: () => void;
    switchToKnowledge?: () => void;
    closePanel?: () => void;
}
```

- 传递到命令上下文：

```typescript
const commandContext: CommandContext = {
    userInput,
    setUserInput,
    sendMessage,
    currentAgent,
    client,
    extraParams,
    createNewChat,
    updateConfig,
    AVAILABLE_MODELS,
    renderMessages,
    switchToHistory,
    switchToKnowledge,
    closePanel,
};
```

### 5. 命令建议优化

在 `tui/src/chat/commands/registry.ts` 中实现智能排序：

```typescript
// 常用命令优先级
const priorityCommands = new Set(['history', 'knowledge', 'close', 'help', 'init', 'model', 'config']);

// 分离前缀匹配和包含匹配
const prefixMatches: CommandSuggestion[] = [];
const includeMatches: CommandSuggestion[] = [];

for (const [name, command] of this.commands) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.startsWith(query)) {
        prefixMatches.push({ command: name, displayText: `/${name}`, description: command.description });
    } else if (lowerName.includes(query)) {
        includeMatches.push({ command: name, displayText: `/${name}`, description: command.description });
    }
    // 别名处理...
}

// 排序：优先级命令优先，然后按长度排序
const sortFn = (a: CommandSuggestion, b: CommandSuggestion) => {
    const aPriority = priorityCommands.has(a.command) ? 1 : 0;
    const bPriority = priorityCommands.has(b.command) ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return a.displayText.length - b.displayText.length;
};

suggestions.push(...prefixMatches, ...includeMatches);
return suggestions.slice(0, 10);
```

## 关键决策

1. **回调传递链**：Chat 组件定义回调 → ChatInput props → CommandHandler props → CommandContext → Command execute
2. **别名设计**：使用短别名（`h`、`k`、`c`）提升输入效率
3. **状态简化**：移除 mode 状态，只保留 activeView 控制面板显示
4. **统一交互**：所有操作通过 `/` 命令完成，一致性强

## 适用场景

- 需要将命令系统扩展到 UI 控制
- TUI 应用的交互模式统一
- 需要支持命令自动补全和建议

## 注意事项

- 命令上下文回调是可选的（`?`），命令需检查可用性
- 面板组件需要支持 `onClose` prop
- 命令建议优先级列表需根据使用频率调整
- 确保 `activeView` 与命令切换逻辑一致
