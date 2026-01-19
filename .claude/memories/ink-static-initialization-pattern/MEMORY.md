---
name: "ink-static-initialization-pattern"
description: "Ink Static 组件首次渲染不显示内容的解决方案；使用 useState 和 useEffect 实现延迟初始化，首次直接渲染，后续使用 Static 优化性能；适用于 Ink TUI 应用中使用 Static 组件导致首次进入只显示部分内容的场景"
tags: ["ink", "static-component", "tui", "react", "rendering"]
category: "bug-fix"
created: "2025-01-19"
last_updated: "2025-01-19"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

在 Ink TUI 应用中，`MessageBox.tsx` 使用 `Static` 组件来固定历史消息，但首次渲染时只显示最后一条消息，历史消息（42 条）未显示。

## 问题原因

Ink 的 `Static` 组件在某些情况下首次渲染时不会执行 `items` 的渲染函数，导致虽然传递了 items 但没有显示。

## 解决方案

**延迟初始化模式**：

1. **添加状态控制**（`MessageBox.tsx:12-17`）：
```typescript
const [ready, setReady] = useState(false);

useEffect(() => {
    const timer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timer);
}, []);
```

2. **条件渲染**（`MessageBox.tsx:69-73`）：
```typescript
if (!ready) {
    return (
        <Box flexDirection="column" paddingY={1}>
            {renderMessages.map((message, i) => renderMessage(message, i, i === index))}
        </Box>
    );
}
```

3. **Static 正常渲染**（`MessageBox.tsx:77-85`）：
```typescript
return (
    <Box flexDirection="column" paddingY={1}>
        <Static items={histories}>
            {(message, i) => renderMessage(message, i, false)}
        </Static>
        {current.map((message, i) => renderMessage(message, histories.length + i, true))}
    </Box>
);
```

## 效果

- ✅ 首次渲染：直接显示所有消息（无 Static）
- ✅ 后续渲染：使用 Static 优化性能（避免闪烁）
- ✅ 保留了 Static 的性能优化特性

## 适用场景

- Ink TUI 应用中使用 Static 组件
- 首次渲染显示不完整的问题
- 需要保留 Static 性能优化的场景
