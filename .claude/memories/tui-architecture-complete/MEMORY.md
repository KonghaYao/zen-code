---
name: "tui-architecture-complete"
description: "TUI 系统完整架构：包括多行文本输入组件（EnhancedTextInput）、统一面板系统（UniversalPanel）、全局审批面板（GlobalApprovalPanel）和 Ink Static 组件优化。涵盖二维光标系统、虚拟滚动、跨平台快捷键、Unicode 处理、模糊搜索、命令系统集成、批量执行、自动跳转等核心特性。适用于构建高性能、跨平台的复杂 TUI 应用。"
tags: ["tui", "ink", "multiline-input", "panel-system", "approval-panel", "cross-platform", "virtual-scroll", "command-system", "react", "text-editor", "fuzzy-search", "keyboard-shortcuts"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-24"
priority: "high"
context_scope: "project"
---

# TUI 系统完整架构

## 架构概述

TUI 系统包含四大核心子系统：
1. **多行文本输入组件** (EnhancedTextInput) - 二维光标、虚拟滚动、跨平台快捷键
2. **统一面板系统** (UniversalPanel) - 泛型组件、模糊搜索、统一交互
3. **全局审批面板** (GlobalApprovalPanel) - 多 Tab 管理、批量执行、自动跳转
4. **Ink Static 优化** - 延迟初始化模式解决首次渲染问题

---

## 一、多行文本输入组件

### 背景与问题

Ink 的 `<TextInput>` 组件存在多行输入缺陷：
1. **单行限制**：原生只支持单行输入
2. **光标管理复杂**：多行光标位置计算错误
3. **跨平台兼容性**：macOS/Windows/Linux 快捷键差异
4. **Unicode 支持**：中文/Emoji 宽度计算错误
5. **性能问题**：长文本渲染卡顿

### EnhancedTextInput 架构

**核心设计：二维光标系统**

从字符级渲染重构为基于行渲染的架构：

```typescript
interface State {
  lines: string[];              // 按行存储文本
  cursorLine: number;           // 光标所在行
  cursorColumn: number;         // 光标所在列
  firstVisibleLine: number;     // 虚拟滚动：首可见行
}
```

**关键特性**：
- **lines[] 数组**：按行存储，每行独立管理
- **二维光标**：`{cursorLine, cursorColumn}` 替代单层 `cursorPosition`
- **虚拟滚动**：只渲染可见行，支持长文本

**虚拟滚动实现**：
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

### 关键修复：Backspace 需要按两次问题

**问题现象**：用户输入后重新 focus，第一次按 Backspace 无效，需要按两次。

**根本原因**：`cursorColumn` 超出 `currentLine.length`（如 `cursorColumn: 7`，但 `'hello'` 只有 5 个字符）。当光标越界时，`currentLine.slice(cursorColumn)` 不会删除任何字符。

**解决方案**：在 Backspace 处理前先 clamp 光标位置到有效范围：

```typescript
// Backspace 处理开始时
const clamped = clampCursor(state.lines, state.cursorLine, state.cursorColumn);
const needsClamp = clamped.column !== state.cursorColumn || clamped.line !== state.cursorLine;

// 使用修正后的光标位置执行删除
const cursorLine = clamped.line;
const cursorColumn = clamped.column;

// ... 使用 cursorLine/cursorColumn 执行删除逻辑
```

**关键点**：
1. **先修正后执行**：不是只修正光标（然后 `return`），而是修正后立即执行删除
2. **状态同步**：如果 `needsClamp` 为真，`setState` 时更新光标位置
3. **防御性编程**：确保所有按键处理都处理越界光标的情况

### Unicode 字符宽度处理

**string-width 库集成**：
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

### 跨平台快捷键系统

**平台检测**：
```typescript
// Windows/Linux: Ctrl 键
// macOS: Option 键（通过 key.meta 检测）

const isWordNavigation = key.ctrl || key.meta;
```

**快捷键对照表**：
| 操作 | Windows/Linux | macOS |
|------|---------------|-------|
| 跳词左移 | Ctrl+← | Option+← |
| 跳词右移 | Ctrl+→ | Option+→ |
| 删除左词 | Ctrl+Backspace | Option+Backspace |
| 删除右词 | Ctrl+Delete | Option+Delete |

**词级导航实现**：
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

### 删除功能完整实现

**Backspace（向后删除）**：
```typescript
// 行内删除
newLine = line.slice(0, cursorColumn - 1) + line.slice(cursorColumn);

// 行首合并（向上合并）
const prevLine = lines[cursorLine - 1];
const currentLine = lines[cursorLine];
const mergedLine = prevLine + currentLine;  // ← 使用显式拼接，避免 +=
newLines[cursorLine - 1] = mergedLine;
newLines.splice(cursorLine, 1);
newCursorColumn = prevLine.length;
```

**Delete（向前删除）**：
```typescript
// 行内删除
newLine = line.slice(0, cursorColumn) + line.slice(cursorColumn + 1);

// 行末合并（向下合并）
const currentLine = lines[cursorLine];
const nextLine = lines[cursorLine + 1];
const mergedLine = currentLine + nextLine;
newLines[cursorLine] = mergedLine;
newLines.splice(cursorLine + 1, 1);
```

**关键修复点**：
1. **避免 += 运算符**：使用显式字符串拼接更清晰
2. **setState 保留状态**：必须包含 `...state` 避免丢失光标信息
3. **分离 Backspace/Delete 逻辑**：避免使用 `||` 连接条件

### 快捷键绑定

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

### 性能优化

**虚拟滚动**：
- 只渲染可见行（默认 20 行）
- 动态调整 `firstVisibleLine`
- 避免全量渲染导致的卡顿

**事件优化**：
```typescript
// 使用防抖减少渲染
const debouncedStateUpdate = debounce(setState, 16); // 60fps
```

---

## 二、统一面板系统

### 背景与问题

TUI 应用中多个面板（Agent/Model/History/Knowledge）各自实现独立逻辑，导致：
1. **交互不一致**、代码重复、扩展困难
2. **useInput 重复监听**导致 `MaxListenersExceededWarning`
3. **列表项渲染样式不统一**，emoji 宽度影响对齐
4. **命令系统与 UI 控制分离**，交互模式混乱

### 统一面板架构

**核心组件系统**：
```
tui/src/chat/components/Panel/
├── types.ts                 # PanelConfig<T> 泛型配置
├── usePanelSearch.ts       # fuzzy search + 过滤器
├── usePanelNavigation.ts   # 统一快捷键处理
├── VirtualScrollList.tsx   # 虚拟滚动（只渲染可见项）
├── SearchBar.tsx           # 搜索栏
├── SelectItem.tsx          # 统一列表项渲染
├── UniversalPanel.tsx      # 组装所有组件
└── [各面板].tsx            # AgentPanel/ModelPanel/HistoryPanel/KnowledgePanel
```

**PanelConfig 配置驱动**：
```typescript
interface PanelConfig<T> {
  data: T[];                              // 数据源
  searchFields?: string[];                // 搜索字段
  filters?: FilterConfig<T>[];            // 过滤器
  renderItem: (item: T) => ReactNode;     // 渲染函数
  itemHeight: number;                     // 虚拟滚动：单项高度
  visibleCount: number;                   # 虚拟滚动：可见数量
  keyMap?: Record<string, KeyHandler>;    // 自定义快捷键
}
```

### 统一交互模式

- `/` - 激活模糊搜索
- `↑↓/PageUp/PageDown` - 导航
- `1-9` - 数字跳转
- `Tab` - 切换过滤器
- `q/Escape` - 关闭面板
- `keyMap` - 面板自定义快捷键（如 HistoryPanel 的 `r` 刷新）

### 虚拟滚动优化

```typescript
// 只渲染可见区域 (startIndex ~ endIndex)
const visibleItems = filteredItems.slice(startIndex, endIndex);
```
- **性能提升**：支持 1000+ 条目流畅滚动
- **itemHeight**：根据实际内容调整（ModelPanel=2, AgentPanel=3）

### 命令系统集成

**CommandContext 扩展**：
```typescript
interface CommandContext {
  // ...existing fields
  switchToHistory?: () => void;
  switchToKnowledge?: () => void;
  closePanel?: () => void;
}
```

**注册的命令**：
- `/h` 或 `/history` - 切换到历史面板
- `/k` 或 `/knowledge` - 切换到知识面板
- `/c` 或 `/close` - 关闭当前面板

### useInput 监听器冲突解决

**问题**：多个 `useInput` 监听器同时注册到同一 EventEmitter 导致 `MaxListenersExceededWarning`。

**解决方案：isActive 动态控制**：
```typescript
useInput((input, key) => {
  if (key.ctrl && input === 'c') {
    if (loading) stopGeneration();
    else process.exit();
  }
}, { isActive: activeView === 'chat' });  // ← 只在聊天视图启用
```

`isActive: false` 时监听器不注册到 EventEmitter，避免冲突。

### 代码复用原则

**直接复用 agents 文件夹中的加载函数**：
```typescript
import { listMemories, type MemoryMetadata } from '../../../../agents/code/memories/load';
import { listSkills, type SkillMetadata } from '../../../../agents/code/skills/load';

const loadMemories = () => {
    const projectMemoriesDir = join(process.cwd(), '.claude/memories');
    const userMemoriesDir = join(process.env.HOME || '', '.deepagents/code/memories');
    
    const loadedMemories = listMemories(userMemoriesDir, projectMemoriesDir);
    loadedMemories.sort((a, b) => a.category.localeCompare(b.category));
    setMemories(loadedMemories);
};
```

**优势**：
1. **代码减少约 80 行**
2. **自动获得安全检查**：路径遍历防护、文件大小限制（10MB）
3. **统一的验证逻辑**：Memory 命名规范、分类枚举验证
4. **未来只需维护一套代码**

### 优势总结

- **开发效率**：新面板 15min（vs 原 2h）
- **代码复用**：60-80% 逻辑复用，总代码量减少 23%
- **一致性**：所有面板交互统一
- **性能**：虚拟滚动支持大数据量
- **可维护性**：统一架构，修改一处影响所有面板

---

## 三、全局审批面板

### 背景与演进

LangGraph UI 工具需要审批机制，演进路径：
1. **HumanApproval**：单个工具独立弹窗审批
2. **GlobalApprovalPanel**：全局多 Tab 面板统一管理
3. **批量执行重设计**：从立即执行改为暂存后统一执行
4. **自动化交互**：自动执行 + 自动跳转下一个请求

### ApprovalContext 状态管理

**自动执行机制**：
```typescript
// 计算所有请求是否都已处理完毕
const allRequestsProcessed = useMemo(
    () => requests.length > 0 && !hasPendingRequests,
    [requests.length, hasPendingRequests]
);

// 当所有请求都处理完毕时，自动执行
useEffect(() => {
    if (allRequestsProcessed) {
        executeApproved();
    }
}, [allRequestsProcessed, executeApproved]);

// 批量执行所有已处理的请求
const executeApproved = useCallback(async () => {
    const processedRequests = requests.filter(req =>
        req.status === ApprovalStatus.Approved ||
        req.status === ApprovalStatus.Edited ||
        req.status === ApprovalStatus.Rejected
    );
    
    for (const request of processedRequests) {
        await onExecuteRequest(request);
    }
    
    clearCompletedApprovals();
}, [requests, onExecuteRequest, clearCompletedApprovals]);
```

### GlobalApprovalPanel 多 Tab 面板

**自动跳转下一个 Pending 请求**：
```typescript
const nextTab = useCallback(
    (currentRequestId: string) => {
        const currentIndex = requests.findIndex(r => r.id === currentRequestId);
        // 优先向后找 Pending
        const nextPending = requests.slice(currentIndex + 1).find(r => r.status === ApprovalStatus.Pending);
        
        if (nextPending) {
            setActiveTab(nextPending.id);
        } else {
            // 如果后面没有，从开头找
            const firstPending = requests.find(r => r.status === ApprovalStatus.Pending);
            if (firstPending) {
                setActiveTab(firstPending.id);
            }
        }
    },
    [requests]
);

// 在 approve/edit/reject handler 中调用
const handleApprove = useCallback((requestId: string) => {
    updateApprovalRequest(requestId, { status: ApprovalStatus.Approved });
    nextTab(requestId);
}, [updateApprovalRequest, nextTab]);
```

**Tabs 状态联动**（修复切换不响应问题）：
```typescript
<Tabs
    key={activeTab}  // 强制重新渲染
    items={tabItems}
    defaultIndex={tabItems.findIndex(item => item.id === activeTab)}
    onChange={handleTabChange}
/>
```

**快捷键监听**：
```typescript
useInput((input, key) => {
    if (key.ctrl && input === 'e' && canExecuteApproved) {
        executeApproved();
    }
}, { isActive: true });
```

### 类型定义

```typescript
export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Edited = 'edited',
  Rejected = 'rejected',
}

export interface ApprovalRequest {
  id: string;
  toolCall: { name: string; args: any };
  tool?: any;  // 存储工具引用，用于后续执行
  status: ApprovalStatus;
  editedArgs?: any;
  createdAt: Date;
  messageIndex?: number;
  description?: string;
}
```

### 工作流程

```
1. 用户操作
   ├─ Approve → 状态变为 ✅ Approved
   ├─ Edit → 状态变为 📝 Edited + 保存 editedArgs
   └─ Reject → 状态变为 ❌ Rejected
   └─ 自动跳转下一个 Pending 请求

2. 自动执行（allRequestsProcessed = true）
   ├─ 过滤 Approved/Edited/Rejected 状态
   ├─ 依次调用 onExecuteRequest → tool.sendResumeData
   └─ 清空所有已处理的请求

3. 手动批量执行（Ctrl+E）
   └─ 同上，但需用户主动触发
```

### 关键 Bug 修复

1. **批量执行不生效**：
   - 类型定义缺失：`ApprovalRequest` 缺少 `tool` 字段
   - 状态比较错误：`status === 'approved'` 应为 `ApprovalStatus.Approved`
   - 快捷键不匹配：注释说 `Ctrl+E`，代码用 `Alt+E`

2. **Tab 切换控件不更新**：
   - 根因：组件内部状态（`selectState`、`isEditing`）在 tab 切换时保留
   - 解决：修改 key 策略为 `${request.id}-${activeTab}`

3. **输入监听冲突**：
   - 问题：`useInput` 缺少 `isActive` 条件
   - 解决：`useInput(handler, { isActive: isEditing })`

4. **useEffect 依赖循环**：
   - 问题：依赖包含 `addApprovalRequest` 导致重复执行
   - 解决：使用 ref 模式

---

## 四、Ink Static 组件优化

### 背景与问题

在 Ink TUI 应用中，`MessageBox.tsx` 使用 `Static` 组件来固定历史消息，但首次渲染时只显示最后一条消息，历史消息（42 条）未显示。

### 问题原因

Ink 的 `Static` 组件在某些情况下首次渲染时不会执行 `items` 的渲染函数，导致虽然传递了 items 但没有显示。

### 解决方案：延迟初始化模式

**1. 添加状态控制**：
```typescript
const [ready, setReady] = useState(false);

useEffect(() => {
    const timer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timer);
}, []);
```

**2. 条件渲染**：
```typescript
if (!ready) {
    return (
        <Box flexDirection="column" paddingY={1}>
            {renderMessages.map((message, i) => renderMessage(message, i, i === index))}
        </Box>
    );
}
```

**3. Static 正常渲染**：
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

### 效果

- ✅ 首次渲染：直接显示所有消息（无 Static）
- ✅ 后续渲染：使用 Static 优化性能（避免闪烁）
- ✅ 保留了 Static 的性能优化特性

---

## 适用场景

- 需要多面板选择的复杂 TUI 应用（Ink 框架）
- 需要统一交互模式和样式的场景
- 有大数据量列表需要虚拟滚动
- 需要命令系统与 UI 控制集成
- 需要批量工具审批和执行
- 需要处理大量文本的终端应用
- 需要跨平台快捷键支持的编辑器

---

## 关键注意事项

### 多行输入组件
1. **setState 完整性**：更新状态时必须包含 `...state`
2. **字符串拼接**：避免使用 `+=`，使用显式拼接
3. **Unicode 宽度**：使用 `string-width` 计算显示宽度
4. **跨平台测试**：在 macOS/Windows/Linux 上测试快捷键
5. **虚拟滚动**：长文本场景必须启用
6. **光标位置**：二维坐标系 `{line, column}`

### 统一面板系统
1. **导入路径**：使用 `../../../../` 访问 agents/code
2. **itemHeight**：根据实际内容行数调整
3. **SelectItem**：避免 emoji + 固定宽度列（宽度不一致）
4. **useInput isActive**：为非必要全局监听器添加视图状态检查
5. **TUI 运行环境**：使用 Bun，可直接导入 TypeScript 文件
6. **层级覆盖**：项目级 Memory/Skill 会覆盖用户级的同名条目

### 全局审批面板
1. **快捷键**：macOS 上 `Ctrl+E` 需要按 Control 键而非 Option 键
2. **tool 对象**：必须在添加请求时存储，否则执行失败
3. **类型安全**：使用 `ApprovalStatus.Approved` 枚举而非字符串
4. **组件 key**：tab 切换时使用 `${request.id}-${activeTab}` 确保重新挂载

---

## 相关文件

### 多行输入组件
- `tui/src/chat/components/input/MultiLineTextInput.tsx` - 完整实现
- `tui/src/chat/components/input/EnhancedTextInput.tsx` - 增强版本

### 统一面板系统
- `tui/src/chat/components/Panel/` - 统一面板系统
- `tui/src/chat/components/KnowledgePanel.tsx` - 知识面板实现
- `agents/code/memories/load.ts` - listMemories 函数
- `agents/code/skills/load.ts` - listSkills 函数
- `tui/src/chat/command/` - 命令系统

### 全局审批面板
- `tui/src/chat/context/ApprovalContext.tsx` - 状态管理
- `tui/src/chat/components/GlobalApprovalPanel/GlobalApprovalPanel.tsx` - 多 Tab 面板
- `tui/src/chat/components/GlobalApprovalPanel/ApprovalItem.tsx` - 单个审批项
- `tui/src/chat/components/GlobalApprovalPanel/types.ts` - 类型定义

### Ink Static 优化
- `tui/src/chat/components/MessageBox.tsx` - 消息框组件
