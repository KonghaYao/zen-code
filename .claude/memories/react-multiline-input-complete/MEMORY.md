---
name: "react-multiline-input-complete"
description: "React多行文本输入组件完整解决方案：Hook+UI分层架构、desiredColumn光标导航机制、受控组件状态同步（避免循环更新）、粘贴处理修复、跨平台换行符规范化（统一使用\n）。适用于TUI/CLI多行编辑器和终端输入组件"
tags: ["react", "hook", "multiline-input", "cursor-navigation", "controlled-component", "state-sync", "paste", "crlf", "tui", "architecture"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-27"
priority: "high"
context_scope: "project"
---

# React多行文本输入完整解决方案

## 背景

开发TUI应用的多行文本输入组件时，从600行耦合代码重构为分层架构，解决了光标导航、状态同步、粘贴处理、跨平台换行符等核心问题。

## 架构设计：关注点分离

### 分层架构

```
┌─────────────────────────────────────────┐
│   MultiLineTextInput (UI Component)     │
│   - Virtual scrolling                  │
│   - Line rendering                     │
│   - User input handling                │
│   - Focus management                   │
└──────────────┬──────────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────────┐
│   useMultiLineInput (Pure Logic Hook)   │
│   - Cursor movement                    │
│   - Text editing                       │
│   - Word navigation                    │
│   - Line management                    │
└─────────────────────────────────────────┘
```

### 单状态对象策略

使用单一状态对象避免React批处理时序问题：

```typescript
interface InternalState {
    lines: string[];
    cursorLine: number;
    cursorColumn: number;
    desiredColumn: number | null;
}

const [state, setState] = useState<InternalState>(() => initializeState(initialText));
```

**关键发现**：边界情况下，返回的对象属性决定是否触发更新：
- `{ ...prev, desiredColumn: targetColumn }` → 触发更新
- `{ ...prev }` → 不触发更新（对象引用相同）

## 光标垂直导航：desiredColumn机制

### 问题

用户从长行（"Hello World"）移动到短行（"Hi"）时，光标应clamp到短行末尾；但移回长行时，应恢复到原始列位置（6），而非短行末尾（2）。

### 解决方案

**核心机制：desiredColumn保留**

```typescript
// 只在第一次垂直移动时设置desiredColumn
return {
    ...prev,
    cursorLine: clampedLine,
    cursorColumn: clampedColumn,
    desiredColumn: prev.desiredColumn !== null ? prev.desiredColumn : targetColumn,
};
```

**实现要点**：

1. **上下移动时保留desiredColumn**：
   - 首次移动：`desiredColumn = cursorColumn`
   - 后续移动：保持原值不变
   - 实际列：`clamp(desiredColumn, 0, lineLength)`

2. **其他操作时清除desiredColumn**：
   - 左右箭头、Home/End
   - 文本编辑（输入、删除、换行）

3. **边界情况强制更新**：
   ```typescript
   if (targetLine < 0) {
       return prev.desiredColumn !== null
           ? { ...prev, desiredColumn: targetColumn }  // 新对象引用
           : { ...prev, desiredColumn: prev.cursorColumn };
   }
   ```

### 词移动算法 (findWordBoundary)

**方向 -1 (moveWordLeft)**：
1. 跳过尾部空格
2. 跳过词字符
3. 返回词首位置：`pos + 1`

**方向 1 (moveWordRight)**：
1. 跳过空格
2. 跳过词字符
3. 返回词末位置（最后一个字符后）

**vim风格增强**：在词首时跳到前一个词
```typescript
if (newColumn > 0 && /\s/.test(currentLine[newColumn - 1])) {
    const prevWordColumn = findWordBoundary(currentLine, newColumn, -1);
    return { ...prev, cursorColumn: prevWordColumn };
}
```

## 受控组件状态同步：避免循环更新

### 问题

Hook内部状态更新后，父组件通过prop返回的新值无法覆盖内部状态，或导致循环更新。

### Hook层：函数式setState

文件：`zen-code/src/hooks/useMultiLineInput.ts:141-160`

```typescript
const prevInitialTextRef = useRef(initialText);

useEffect(() => {
    if (initialText === prevInitialTextRef.current) {
        return;
    }

    // 使用函数式setState获取最新状态
    setState(prevState => {
        const currentText = joinLines(prevState.lines);
        
        if (initialText !== currentText) {
            return initializeState(initialText);
        }
        
        return prevState;
    });

    prevInitialTextRef.current = initialText;
}, [initialText]); // 只依赖initialText，不依赖state.lines
```

**关键点**：
- 函数式setState避免stale closure
- 只依赖`initialText`，避免每次输入都触发
- 比较后再决定是否更新

### 组件层：外部更新检测

文件：`zen-code/src/chat/components/input/MultiLineTextInput.tsx:128-148`

```typescript
const isExternalUpdateRef = useRef(false);
const previousValueRef = useRef(originalValue);

// 检测外部prop变化
useEffect(() => {
    if (originalValue !== previousValueRef.current && originalValue !== text) {
        isExternalUpdateRef.current = true;
    }
    previousValueRef.current = originalValue;
}, [originalValue, text]);

// 同步hook状态到父组件
useEffect(() => {
    if (isExternalUpdateRef.current) {
        isExternalUpdateRef.current = false;
        return; // 外部更新跳过onChange
    }

    if (text !== originalValue) {
        onChange?.(text); // 用户输入通知父组件
    }
}, [text, onChange, originalValue]);
```

**关键点**：
- 检测`originalValue`变化且与`text`不同时，标记为外部更新
- 外部更新跳过onChange，避免循环
- 用户输入正常通知父组件

## 粘贴处理修复

### 1. 粘贴检测

```typescript
useInput((inputStr) => {
    if (inputStr) {
        // 检测粘贴：多字符输入或包含换行符
        if (inputStr.length > 1 || inputStr.includes('\n')) {
            insertText(inputStr);
        } else {
            handleInputChange(inputStr);
        }
    }
});
```

### 2. 修复insertText多行插入bug

**问题**：原实现使用`splice(start, 0, item)`会插入而非替换，导致原行内容重复。

**错误实现**：
```typescript
newLines.splice(prev.cursorLine + 1, 0, ...middleLines); // 插入，不删除原行
```

**正确实现**（第340-350行）：
```typescript
const newLines = [
    ...prev.lines.slice(0, prev.cursorLine),
    beforeCursor + insertLines[0],
    ...insertLines.slice(1, -1),
    insertLines[insertLines.length - 1] + afterCursor,
    ...prev.lines.slice(prev.cursorLine + 1),
];
```

### 3. 命令系统状态更新时序

**问题**：React 18自动批处理导致`setUserInput`后`executeCommand`读取到旧值。

**修复**：直接传递inputValue而非依赖异步状态更新。

`Chat.tsx`:
```typescript
// 之前：setUserInput(inputValue); await delay(0); commandHandler.executeCommand();
// 修复后：commandHandler.executeCommand(inputValue);
```

`CommandHandler.tsx`:
```typescript
executeCommand: (inputValue?: string) => {
    const commandInput = inputValue || userInput;
    // 使用commandInput而非userInput
}
```

## 跨平台换行符处理

### 问题

不同系统使用不同换行符：
- Unix/Linux: `\n` (LF)
- Windows: `\r\n` (CRLF)
- 旧版Mac: `\r` (CR)

需要内部统一为`\n`。

### 解决方案

#### 1. input()函数 - 只处理\n

`zen-code/src/hooks/useMultiLineInput.ts:329-358`：
- 将换行符检查从`\r || \n`改为只处理`\n`
- 让`\r`由文本规范化统一处理

#### 2. insertText()函数 - 检测所有换行符

检查条件从`!textToInsert.includes('\n')`改为检测`\n`或`\r`：

```typescript
const hasNewline = textToInsert.includes('\n') || textToInsert.includes('\r');

if (!hasNewline) {
    // 单行插入
} else {
    // 多行插入 - splitIntoLines会将\r\n和\r转换为\n
    const insertLines = splitIntoLines(textToInsert);
}
```

#### 3. splitIntoLines() - 统一规范化

已存在的规范化逻辑（第23-24行）：
```typescript
const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
```

**顺序很重要**：必须先替换`\r\n`再替换`\r`，避免将`\r\n`错误处理为两个换行符。

## 测试覆盖

### Vitest多包项目配置

项目根目录创建`vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: [
      'packages/**/*.test.ts',
      'zen-code/src/**/*.{test,testx}.{ts,tsx}',
    ],
    setupFiles: ['./zen-code/src/__tests__/setup.ts'],
  },
});
```

### 测试结果

- Hook测试：43个测试用例，覆盖所有操作
- 集成测试：365个项目测试全部通过
- 跨平台换行符：10个测试用例

**关键测试场景**：
- ✓ 初始化时规范化CRLF和CR为LF
- ✓ 混合换行符类型处理
- ✓ 粘贴包含CRLF/CR的文本
- ✓ 文本以CRLF/CR结尾
- ✓ 外部同步文本中的换行符规范化
- ✓ 连续的CRLF/CR序列

## 性能优化

- 使用`useMemo`缓存计算结果（lines → text转换）
- 使用`memo`优化`LineRenderer`组件
- 虚拟滚动减少渲染开销（`firstVisibleLine`, `calculateVisibleRange`）

## 实现文件

- **Hook**: `/Users/konghayao/code/ai/code-graph/zen-code/src/hooks/useMultiLineInput.ts` - 纯逻辑层
- **组件**: `/Users/konghayao/code/ai/code-graph/zen-code/src/chat/components/input/MultiLineTextInput.tsx` - UI层
- **配置**: `/Users/konghayao/code/ai/code-graph/vitest.config.ts` - 测试环境配置

## 适用场景

✅ **适用**：
- TUI/CLI多行文本编辑器
- 需要复杂光标导航的输入组件
- 需要单元测试的文本输入逻辑
- 跨平台文本处理（Windows/Unix/Mac）
- 需要父组件控制的受控输入组件

❌ **不适用**：
- 简单的单行输入（使用标准`<input>`）
- 不需要光标控制的场景
- 非受控组件

## 注意事项

1. **初始化位置**：hook初始化时光标在最后一行末尾，而非第一行末尾
2. **光标位置定义**：cursorColumn指向字符之间的位置（0 = 第一个字符前）
3. **状态更新引用**：边界情况下必须返回新对象引用，否则React不重新渲染
4. **终端输入行为**：某些终端按Enter键发送`\r`而非`\n`，调用input()的组件需要预处理换行符
5. **函数式setState**：会获取最新状态，但比较逻辑可能引入微妙的同步问题
6. **外部更新检测**：需要区分prop变化和内部状态变化
