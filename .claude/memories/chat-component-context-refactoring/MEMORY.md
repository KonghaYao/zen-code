---
name: chat-component-context-refactoring
description:
    Chat.tsx 组件重构案例：按照 Vercel React 最佳实践优化，创建 ChatPanelContext 消除 props drilling，提取 6 个自定义
    Hooks 和分离组件；适用于需要组件解耦和性能优化的复杂 React 场景
tags:
    - react
    - vercel-best-practices
    - refactoring
    - context-pattern
    - performance-optimization
category: architecture
created: 2025-01-17
last_updated: 2025-01-20
priority: high
context_scope: project
---

# Chat 组件 Context 重构

## 背景

Chat.tsx 组件存在以下问题：

1. **代码臃肿**: 400+ 行代码，逻辑混杂
2. **Props Drilling**: 8+ 个回调函数层层传递
3. **useEffect Waterfalls**: 配置验证、工具初始化、消息缓冲等多个 useEffect
4. **职责不清**: 组件同时处理状态、视图切换、渲染
5. **无效 Memoization**: Context Provider 中使用无效的 useMemo

## 最终架构

```
AppProviders (entry point)
└── ChatWrapper (providers)
    └── Chat (main component)
        └── ChatController (state + context)
            └── ChatLayout (layout structure)
                ├── ChatMain (when activeView === 'chat')
                │   ├── ChatMessages
                │   └── ChatInput / UnifiedUIPanel
                ├── LazyChatViewManager (when activeView !== 'chat')
                └── StatusBar
```

## 关键文件

| 文件                      | 职责                                     |
| ------------------------- | ---------------------------------------- |
| `Chat.tsx`                | 入口组件，Provider 组装，定义 ChatLayout |
| `ChatController.tsx`      | 状态管理，Context 提供，全局快捷键       |
| `ChatPanelContext.tsx`    | 面板状态 Context 定义                    |
| `ChatMain.tsx`            | 聊天主界面（消息 + 输入）                |
| `ChatInput.tsx`           | 输入组件，从 Context 获取 actions        |
| `LazyChatViewManager.tsx` | 懒加载面板管理                           |

## 自定义 Hooks

| Hook                       | 职责                      |
| -------------------------- | ------------------------- |
| `useChatPanels`            | 面板切换状态管理          |
| `useTaskExecutor`          | 任务执行逻辑              |
| `useBufferedMessageSender` | 缓冲消息发送              |
| `useConfigValidation`      | 配置验证（render 时计算） |
| `useToolInitialization`    | 工具初始化（仅一次）      |
| `useAutoFocus`             | 输入框自动聚焦            |

## 关键模式

### 1. Context 消除 Props Drilling

```tsx
// ❌ 之前：Props 层层传递
<ChatInput
    switchToHistory={switchToHistory}
    switchToKnowledge={switchToKnowledge}
    // ... 8 个 props
/>

// ✅ 之后：从 Context 直接获取
export const ChatInput: React.FC = memo(() => {
    const { switchToHistory, switchToKnowledge, ... } = useChatPanel();
    // ...
});
```

### 2. Context Provider 不需要 useMemo

```tsx
// ❌ 错误：无效的 useMemo
const ChatPanelProvider = ({ children, value }) => {
    const memoizedValue = useMemo(
        () => value,
        [
            value.activeView,
            value.switchToHistory,
            // ... 12 个依赖
        ],
    );
    return <ChatPanelContext.Provider value={memoizedValue}>{children}</ChatPanelContext.Provider>;
};

// ✅ 正确：父组件通过 useCallback 提供稳定引用
const ChatPanelProvider = ({ children, value }) => {
    return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
};

// ChatController 中所有回调都使用 useCallback
const switchToHistory = useCallback(() => setActiveView('history'), []);
```

### 3. 组件职责分离

```tsx
// ❌ 之前：ChatMain 处理所有视图
const ChatMain = () => {
    return (
        <>
            {activeView === 'chat' && <ChatMessages />}
            {activeView !== 'chat' && <LazyChatViewManager />}
            <StatusBar />
        </>
    );
};

// ✅ 之后：ChatMain 只负责聊天视图
const ChatMain = () => {
    return (
        <Box flexDirection="column" flexGrow={1}>
            <ChatMessages />
            {hasPendingInteractions ? <UnifiedUIPanel /> : <ChatInput />}
        </Box>
    );
};

// ChatLayout 负责视图切换
const ChatLayout = () => {
    const { activeView } = useChatPanel();
    return (
        <Box flexDirection="column" width="100%">
            <Box flexGrow={1} flexDirection="row">
                {activeView === 'chat' ? <ChatMain /> : <LazyChatViewManager />}
            </Box>
            <StatusBar />
        </Box>
    );
};
```

### 4. Derived State 替代 useEffect

```tsx
// ❌ 之前：useEffect 计算状态
useEffect(() => {
    if (config) {
        const validation = validateConfig(config);
        setConfigValidation(validation);
    }
}, [config]);

// ✅ 之后：render 时计算
const useConfigValidation = ({ config }) => {
    return useMemo(() => {
        if (!config) return { validation: null, needsSetup: true, isValid: false };
        const validation = validateConfig(config);
        return { validation, needsSetup: validation.needsSetup, isValid: !validation.needsSetup };
    }, [config]);
};
```

### 5. Init-Once 模式

```tsx
// 工具初始化只执行一次
const useToolInitialization = ({ tools, setTools }) => {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!initializedRef.current) {
            console.clear();
            setTools(tools);
            initializedRef.current = true;
        }
    }, [tools, setTools]);
};
```

## 常见错误

1. **Context Provider 内 useMemo 无效**: 父组件应通过 useCallback 提供稳定引用
2. **子组件重复处理视图切换**: 每个组件只处理自己的职责
3. **Props drilling 仍然存在**: 子组件应直接从 Context 获取数据
4. **useEffect 计算派生状态**: 应在 render 时使用 useMemo 计算

## 重构检查清单

- [ ] Context Provider 不使用无效的 useMemo
- [ ] 所有回调函数在 Controller 中使用 useCallback
- [ ] 子组件从 Context 获取数据，不通过 props
- [ ] 视图切换逻辑集中在单一组件（如 ChatLayout）
- [ ] 派生状态使用 useMemo 而非 useEffect
- [ ] 初始化逻辑使用 useRef 确保只执行一次
