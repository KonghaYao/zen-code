---
name: "multiline-textinput-backspace-delete-fix"
description: "修复多行文本输入组件的 Backspace 和 Delete 键删除功能。问题包括：1) 合并行时出现多余换行符，原因是使用 += 运算符拼接字符串不够明确；2) Delete 键未实现向前删除功能；3) 调试代码导致两个键行为相同；4) Delete 键的 setState 缺少 ...state 导致光标位置等信息丢失。解决方案是使用显式字符串拼接，分离两个键的逻辑，并在 setState 时保留完整状态。"
tags: ["ink", "react", "text-input", "backspace", "delete", "bug-fix"]
category: "bug-fix"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "medium"
context_scope: "project"
---

# ## 问题背景

## 问题背景

MultiLineTextInput 组件在多行删除时出现多个换行符，且 Delete 键功能未实现。

## 问题分析与修复

### 1. 合并行时出现多余换行符

**问题代码**：
```typescript
newLines[state.cursorLine - 1] += newLines[state.cursorLine];
```

**修复**：使用显式字符串拼接，逻辑更清晰
```typescript
newLines[state.cursorLine - 1] = prevLine + currentLine;
```

完整实现参见 `tui/src/chat/components/input/MultiLineTextInput.tsx:320-325`

### 2. Backspace 和 Delete 行为相同

**问题原因**：调试时留下了错误条件
```typescript
if (key.backspace || key.delete) {
    // 错误：导致两个键都进入相同分支
}
```

**修复**：分离两个键的处理逻辑
- Backspace: 删除光标左边的字符（向后删除）
- Delete: 删除光标右边的字符（向前删除）

### 3. Delete 键 setState 缺少状态展开

**问题代码**：
```typescript
setState({
    lines: newLines,
}); // 缺少 ...state
```

**修复**：
```typescript
setState({
    ...state,
    lines: newLines,
});
```

完整修复参见 `tui/src/chat/components/input/MultiLineTextInput.tsx:305-380`

## 实现细节

**Backspace (向后删除)**：
- 行内：删除光标前字符，`slice(0, cursorColumn - 1) + slice(cursorColumn)`
- 行首：合并到上一行，光标移到上一行末尾

**Delete (向前删除)**：
- 行内：删除光标后字符，`slice(0, cursorColumn) + slice(cursorColumn + 1)`
- 行末：合并下一行到当前行，光标保持原位

## 注意事项

- setState 更新状态时必须包含 `...state` 保留未修改的字段（cursorLine、cursorColumn、firstVisibleLine）
- 合并行时避免使用 `+=` 运算符，使用显式拼接更清晰
- 分离 Backspace 和 Delete 的条件判断，避免使用 `||` 连接

