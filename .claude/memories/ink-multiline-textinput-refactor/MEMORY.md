---
name: "ink-multiline-textinput-refactor"
description: "EnhancedTextInput 组件从字符级渲染重构为基于行渲染的 MultiLineTextInput 架构，彻底解决多行文本输入问题。核心包括二维光标系统（{cursorLine, cursorColumn}）、lines[] 数组存储、虚拟滚动（只渲染可见行）、上下箭头跳行、回车换行拆分、Backspace 删除合并行、粘贴多行文本支持。使用 string-width 库处理 Unicode 字符宽度（中文/Emoji 占 2 格）。Enter 键提交，Ctrl/Cmd+Enter 换行。完整实现位于 tui/src/chat/components/input/。"
tags: ["ink", "multiline-input", "react", "virtual-scroll", "unicode-width", "string-width", "refactor", "architecture"]
category: "architecture"
created: "2025-01-13"
last_updated: "2025-01-16"
priority: "high"
context_scope: "project"
---

## 背景

原有 EnhancedTextInput 组件使用字符级渲染，存在多个严重问题：
1. **光标在换行符位置无法显示**：`\n`、`\r`、`\r\n` 无法用 `chalk.inverse()` 高亮
2. **非单字符输入光标错位**：粘贴/IME 输入时高亮范围计算错误
3. **无法支持多行编辑**：单维光标索引（字符偏移量）无法映射到行列坐标
4. **无虚拟滚动**：长文本全部渲染导致性能问题

需要重构为基于行渲染的架构，支持二维光标系统、智能文本编辑和虚拟滚动。

## 架构设计

### 核心数据结构
```typescript
interface TextInputState {
  lines: string[];           // 按行存储文本，每行不含换行符
  cursorLine: number;        // 0-based 行号
  cursorColumn: number;      // 0-based 列号
  firstVisibleLine: number;  // 虚拟滚动：视口首行
}
```

### 文件结构
```
tui/src/chat/components/input/
├── textInputUtils.ts       # 工具函数库
├── MultiLineTextInput.tsx  # 新组件完整实现
├── EnhancedTextInput.tsx   # 向后兼容导出
└── ChatInputBuffer.tsx     # 已替换使用 MultiLineTextInput
```

### 工具函数（textInputUtils.ts）
- `splitTextIntoLines(text)` - 处理 `\n`, `\r`, `\r\n`，统一使用 `\n` 作为内部换行符
- `joinLinesIntoText(lines)` - 将行数组合并为完整文本
- `calculateVisibleRange(totalLines, firstVisibleLine, maxVisibleLines)` - 计算可视范围
- `ensureCursorVisible(cursorLine, firstVisibleLine, maxVisibleLines, totalLines)` - 自动滚动视口确保光标可见
- `clampCursor(lines, cursorLine, cursorColumn)` - 限制光标在有效范围内

## 关键实现

### 1. 光标移动系统
```typescript
// 左右箭头：行内移动，跨行时跳到上/下行
if (cursorColumn > 0) {
  cursorColumn--;
} else if (cursorLine > 0) {
  cursorLine--;
  cursorColumn = lines[cursorLine].length; // 上一行末尾
}

// 上下箭头：跳行，保持列位置（不超过行长度）
if (cursorLine > 0) {
  cursorLine--;
  cursorColumn = Math.min(cursorColumn, lines[cursorLine].length);
}
```

### 2. 文本编辑操作

#### 回车换行拆分
```typescript
const currentLine = lines[cursorLine];
const beforeCursor = currentLine.slice(0, cursorColumn);
const afterCursor = currentLine.slice(cursorColumn);

lines[cursorLine] = beforeCursor;
lines.splice(cursorLine + 1, 0, afterCursor);
cursorLine++;
cursorColumn = 0;
```

#### Backspace 删除合并
```typescript
if (cursorColumn > 0) {
  // 行内删除
  lines[cursorLine] = currentLine.slice(0, cursorColumn - 1) + currentLine.slice(cursorColumn);
  cursorColumn--;
} else if (cursorLine > 0) {
  // 合并到上一行
  const prevLineLength = lines[cursorLine - 1].length;
  lines[cursorLine - 1] += lines[cursorLine];
  lines.splice(cursorLine, 1);
  cursorLine--;
  cursorColumn = prevLineLength;
}
```

#### 粘贴多行文本
```typescript
if (input.includes('\n')) {
  const newLinesFromPaste = splitTextIntoLines(input);
  const currentLine = lines[cursorLine];
  const beforeCursor = currentLine.slice(0, cursorColumn);
  const afterCursor = currentLine.slice(cursorColumn);
  
  // 替换当前行
  lines[cursorLine] = beforeCursor + newLinesFromPaste[0];
  
  // 插入中间行
  const middleLines = newLinesFromPaste.slice(1, -1);
  lines.splice(cursorLine + 1, 0, ...middleLines);
  
  // 插入最后一行
  const lastLine = newLinesFromPaste[newLinesFromPaste.length - 1] + afterCursor;
  lines.splice(cursorLine + middleLines.length + 1, 0, lastLine);
  
  cursorLine += newLinesFromPaste.length - 1;
  cursorColumn = newLinesFromPaste[newLinesFromPaste.length - 1].length;
}
```

### 3. 虚拟滚动实现
```typescript
// 只渲染可见行
const { start, end } = calculateVisibleRange(
  lines.length,
  firstVisibleLine,
  maxVisibleLines
);
const visibleLines = lines.slice(start, end);

// 光标移出视口时自动滚动
firstVisibleLine = ensureCursorVisible(
  cursorLine,
  firstVisibleLine,
  maxVisibleLines,
  lines.length
);
```

### 4. Unicode 宽度处理
使用 `string-width` 库正确处理中文字符和 Emoji（占 2 格）：
```typescript
import stringWidth from 'string-width';

// 使用 Array.from 正确处理代理对（Emoji 等）
const chars = Array.from(content);
```

### 5. 性能优化
- **LineRenderer memoization**：使用 `React.memo` 避免不必要的重渲染
- **回调优化**：使用 `useCallback` 缓存事件处理函数
- **计算缓存**：使用 `useMemo` 缓存可视范围计算结果

## 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 提交文本（onSubmit） |
| `Ctrl+Enter` / `Cmd+Enter` | 换行 |
| `←` / `→` | 左右移动光标（支持跨行） |
| `↑` / `↓` | 上下移动光标（跳行） |
| `Ctrl+A` / `Cmd+←` | 跳到行首 |
| `Ctrl+E` / `Cmd+→` | 跳到行末 |
| `Ctrl+Up` / `Cmd+Up` | 跳到行首 |
| `Ctrl+Down` / `Cmd+Down` | 跳到行末 |
| `Backspace` | 删除前一个字符（支持跨行合并） |
| `Delete` | 删除后一个字符（支持跨行合并） |

**重要变更**：Enter 键行为与原始设计相反，Enter 现在是提交，Ctrl/Cmd+Enter 是换行，更符合用户习惯。

## API 使用示例

```typescript
import { MultiLineTextInput } from './components/input/MultiLineTextInput';

function ChatInput() {
  const [value, setValue] = useState('');
  
  return (
    <MultiLineTextInput
      value={value}
      onChange={setValue}
      onSubmit={(submittedValue) => {
        console.log('Submitted:', submittedValue);
      }}
      placeholder="输入消息..."
      autoFocus
      showCursor
      maxVisibleLines={10}
      enableVirtualScroll={true}
    />
  );
}
```

## 实际性能表现

| 指标 | 表现 |
|------|------|
| 渲染行数 | 只渲染可见行（~10行） |
| 光标移动延迟 | < 50ms |
| 内存占用 | 与行数线性增长 |
| 大文本测试 | 1000+ 行流畅 |

## 已知问题和限制

1. **超长行处理**：依赖 Ink 的自动换行，可能导致显示不一致
2. **滚动条指示器**：未实现（非必需功能）
3. **文本选择**：未实现 Shift+箭头选择
4. **撤销/重做**：未实现操作历史

## 未来改进方向

1. **滚动条指示器**：显示当前视口在文档中的位置
2. **文本选择**：支持 Shift+箭头选择文本
3. **撤销/重做**：实现操作历史栈
4. **搜索高亮**：在多行文本中搜索关键词
5. **语法高亮**：支持代码语法高亮（集成 Prism/Highlight.js）

## 参考文档

完整设计文档：`specs/multiline-text-input-refactor.md`

包含：
- 详细的实现计划（Phase 1-6）
- 完整的测试策略
- API 兼容性方案
- 技术考虑和风险分析

## 核心价值

1. **彻底解决多行输入问题**：从字符级到行级渲染的根本性重构
2. **性能优化**：虚拟滚动支持大量文本
3. **用户体验**：二维光标系统支持自然的编辑操作
4. **Unicode 支持**：正确处理中文和 Emoji 宽度
5. **可扩展性**：为未来功能（选择、搜索、语法高亮）打下基础
