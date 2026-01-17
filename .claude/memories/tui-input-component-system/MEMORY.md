---
name: "tui-input-component-system"
description: "TUI 多行文本输入组件完整系统：包括 EnhancedTextInput 架构重构、二维光标系统、跨平台快捷键、词级导航、删除修复、Unicode 字符宽度处理、虚拟滚动等。适用于构建高性能、跨平台的终端文本编辑器。"
tags: ["tui", "ink", "multiline-input", "react", "text-editor", "cross-platform", "keyboard-shortcuts", "unicode", "virtual-scroll"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-17"
priority: "high"
context_scope: "project"
---

## 背景与问题

Ink 的 `<TextInput>` 组件存在多行输入缺陷：
1. **单行限制**：原生只支持单行输入
2. **光标管理复杂**：多行光标位置计算错误
3. **跨平台兼容性**：macOS/Windows/Linux 快捷键差异
4. **Unicode 支持**：中文/Emoji 宽度计算错误
5. **性能问题**：长文本渲染卡顿

## EnhancedTextInput 架构

### 核心设计：二维光标系统
从字符级渲染重构为基于行渲染的架构：

```typescript
interface State {
  lines: string[];              // 按行存储文本
  cursorLine: number;           // 光标所在行
  cursorColumn: number;         // 光标所在列
  firstVisibleLine: number;     // 虚拟滚动：首可见行
  // ...其他状态
}
```

**关键特性**：
- **lines[] 数组**：按行存储，每行独立管理
- **二维光标**：`{cursorLine, cursorColumn}` 替代单层 `cursorPosition`
- **虚拟滚动**：只渲染可见行，支持长文本

### 虚拟滚动实现
```typescript
const visibleLines = lines.slice(
  firstVisibleLine,
  firstVisibleLine + visibleLineCount
);

return (
  <Box flexDirection="column">
    {visibleLines.map((line, idx) => renderLine(line, idx))}
  </Box>
);
```

**性能提升**：10000+ 行文本流畅滚动。

## Unicode 字符宽度处理

### string-width 库集成
```typescript
import stringWidth from 'string-width';

// 计算实际显示宽度（中文/Emoji 占 2 格）
const displayWidth = stringWidth('你好世界'); // 8
const displayWidth = stringWidth('Hello');    // 5
```

**用途**：
- 光标列位置计算
- 文本对齐和缩进
- 回绕换行判断

## 跨平台快捷键系统

### 平台检测
```typescript
// Windows/Linux: Ctrl 键
// macOS: Option 键（通过 key.meta 检测）

const isWordNavigation = key.ctrl || key.meta;
```

### 快捷键对照表
| 操作 | Windows/Linux | macOS |
|------|---------------|-------|
| 跳词左移 | Ctrl+← | Option+← |
| 跳词右移 | Ctrl+→ | Option+→ |
| 删除左词 | Ctrl+Backspace | Option+Backspace |
| 删除右词 | Ctrl+Delete | Option+Delete |

### 词级导航实现
```typescript
function findWordBoundary(line: string, cursorColumn: number, direction: -1 | 1): number {
    const length = line.length;
    
    if (direction === -1) {
        // 向左：跳过空白字符 → 找到单词开头
        let pos = cursorColumn - 1;
        while (pos > 0 && /\s/.test(line[pos])) pos--;
        while (pos > 0 && !/\s/.test(line[pos])) pos--;
        return pos > 0 ? pos : 0;
    } else {
        // 向右：跳过单词字符 → 跳过空白字符
        let pos = cursorColumn;
        while (pos < length && !/\s/.test(line[pos])) pos++;
        while (pos < length && /\s/.test(line[pos])) pos++;
        return pos;
    }
}
```

## 删除功能完整实现

### Backspace（向后删除）
**行内删除**：
```typescript
newLine = line.slice(0, cursorColumn - 1) + line.slice(cursorColumn);
```

**行首合并**（向上合并）：
```typescript
const prevLine = lines[cursorLine - 1];
const currentLine = lines[cursorLine];
const mergedLine = prevLine + currentLine;  // ← 使用显式拼接，避免 +=
newLines[cursorLine - 1] = mergedLine;
newLines.splice(cursorLine, 1);
newCursorColumn = prevLine.length;
```

### Delete（向前删除）
**行内删除**：
```typescript
newLine = line.slice(0, cursorColumn) + line.slice(cursorColumn + 1);
```

**行末合并**（向下合并）：
```typescript
const currentLine = lines[cursorLine];
const nextLine = lines[cursorLine + 1];
const mergedLine = currentLine + nextLine;
newLines[cursorLine] = mergedLine;
newLines.splice(cursorLine + 1, 1);
// cursorColumn 保持不变
```

### 关键修复点
1. **避免 += 运算符**：使用显式字符串拼接更清晰
2. **setState 保留状态**：必须包含 `...state` 避免丢失光标信息
```typescript
setState({
  ...state,  // ← 关键：保留 cursorLine、cursorColumn 等字段
  lines: newLines,
});
```

3. **分离 Backspace/Delete 逻辑**：避免使用 `||` 连接条件

## 回车换行处理

```typescript
if (key.return) {
  const line = lines[cursorLine];
  const beforeCursor = line.slice(0, cursorColumn);
  const afterCursor = line.slice(cursorColumn);
  
  // 拆分当前行
  newLines.splice(cursorLine, 1, beforeCursor, afterCursor);
  
  setState({
    ...state,
    lines: newLines,
    cursorLine: cursorLine + 1,
    cursorColumn: 0,
  });
}
```

## 粘贴多行文本

```typescript
handlePaste(pastedText: string) {
  const pastedLines = pastedText.split('\n');
  
  if (pastedLines.length === 1) {
    // 单行粘贴：插入到光标位置
    insertTextAtCursor(pastedLines[0]);
  } else {
    // 多行粘贴：拆分当前行 + 插入多行
    const line = lines[cursorLine];
    const before = line.slice(0, cursorColumn);
    const after = line.slice(cursorColumn);
    
    newLines.splice(
      cursorLine,
      1,
      before,
      ...pastedLines,
      after
    );
  }
}
```

## 终端按键编码处理

### macOS 特殊按键
```typescript
// macOS Option+Backspace → [ (ESC + [)
// macOS Option+Delete → [d (ESC + d)

if (input === '\x1b[' || input === '\x1bd') {
  // 处理 Option+Backspace
}
```

### ANSI 转义序列
- `\x1b` = ESC (27)
- `\x1b[3~` = Delete
- `\x1b[d` = Option+Delete (macOS)

**注意事项**：
- Ctrl+W 与 Option+Backspace 功能冲突（都删除单词）
- 终端模拟器差异导致键码不一致
- 使用 Ink 的 `key` 对象辅助判断

## 快捷键绑定

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 提交输入 |
| `Ctrl/Cmd+Enter` | 换行 |
| `↑↓` | 上下移动光标（跨行） |
| `←→` | 左右移动光标 |
| `Ctrl/Option+←→` | 按词跳转 |
| `Backspace` | 向后删除 |
| `Delete` | 向前删除 |
| `Ctrl/Option+Backspace` | 删除左边单词 |
| `Ctrl/Option+Delete` | 删除右边单词 |
| `Ctrl+C` | 复制 / 停止生成（TUI 上下文） |

## 性能优化

### 虚拟滚动
- 只渲染可见行（默认 20 行）
- 动态调整 `firstVisibleLine`
- 避免全量渲染导致的卡顿

### 事件优化
```typescript
// 使用防抖减少渲染
const debouncedStateUpdate = debounce(setState, 16); // 60fps
```

## 适用场景

- 需要多行文本输入的 TUI 应用（Ink 框架）
- 需要跨平台快捷键支持的编辑器
- 需要正确显示 Unicode 字符的场景
- 需要处理大量文本的终端应用

## 关键注意事项

1. **setState 完整性**：更新状态时必须包含 `...state`
2. **字符串拼接**：避免使用 `+=`，使用显式拼接
3. **Unicode 宽度**：使用 `string-width` 计算显示宽度
4. **跨平台测试**：在 macOS/Windows/Linux 上测试快捷键
5. **虚拟滚动**：长文本场景必须启用
6. **光标位置**：二维坐标系 `{line, column}`

## 相关文件

- `tui/src/chat/components/input/MultiLineTextInput.tsx` - 完整实现
- `tui/src/chat/components/input/EnhancedTextInput.tsx` - 增强版本

## 已知问题

- macOS Option 键在某些终端中无法正确检测
- 组合快捷键（Ctrl+Shift+←）受终端限制
- 复杂 Unicode 字符（零宽字符）显示异常
