---
name: 'tui-system'
description:
    'TUI 系统完整架构：包括多行文本输入组件（位于 ink-pro
    包）、统一面板系统（UniversalPanel）、全局审批面板（GlobalApprovalPanel）、TanStack Query
    状态管理迁移。涵盖虚拟滚动、跨平台快捷键、模糊搜索、批量执行、自动跳转、React 渲染循环修复等核心特性。'
tags:
    [
        'tui',
        'ink',
        'multiline-input',
        'panel-system',
        'approval-panel',
        'cross-platform',
        'virtual-scroll',
        'react',
        'text-editor',
        'fuzzy-search',
        'keyboard-shortcuts',
        'universal-panel',
        'tanstack-query',
        'performance',
        'ink-pro',
        'settings-panel',
        'json-schema',
        'form-rendering',
    ]
category: 'architecture'
created: '2025-01-17'
last_updated: '2025-02-17'
priority: 'high'
context_scope: 'project'
---

# TUI 系统完整架构

## 概述

TUI 系统包含三大核心子系统：

1. **多行文本输入组件** (MultiLineTextInput) - 实现在 `packages/ink-pro` 包
2. **统一面板系统** (UniversalPanel) - 泛型组件、模糊搜索、统一交互
3. **全局审批面板** (GlobalApprovalPanel) - 多 Tab 管理、批量执行、自动跳转

---

## 一、多行文本输入组件（MultiLineTextInput）

### 实现位置

**重要**: 该组件已迁移到 `packages/ink-pro` 包中，作为共享组件使用。

**主要文件**:

- Hook: `packages/ink-pro/src/components/MultiLineTextInput/useMultiLineInput.ts`
- UI: `packages/ink-pro/src/components/MultiLineTextInput/MultiLineTextInput.tsx`
- 导出: `packages/ink-pro/src/components/MultiLineTextInput/index.ts`

**使用方式**:

```typescript
// 从 ink-pro 导入
import { MultiLineTextInput } from 'ink-pro';

// 或者别名导出
import { EnhancedTextInput } from 'ink-pro'; // zen-code 中使用
```

### 架构设计：关注点分离

**分层架构**：

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

使用单一状态对象避免 React 批处理时序问题：

```typescript
interface InternalState {
    lines: string[];
    cursorLine: number;
    cursorColumn: number;
    desiredColumn: number | null;
}

const [state, setState] = useState<InternalState>(() => initializeState(initialText));
```

### 光标垂直导航：desiredColumn 机制

**问题**：用户从长行移动到短行时，光标应 clamp 到短行末尾；但移回长行时，应恢复到原始列位置。

**解决方案**：

```typescript
// 只在第一次垂直移动时设置 desiredColumn
return {
    ...prev,
    cursorLine: clampedLine,
    cursorColumn: clampedColumn,
    desiredColumn: prev.desiredColumn !== null ? prev.desiredColumn : targetColumn,
};
```

**实现要点**：

1. **上下移动时保留 desiredColumn**：
    - 首次移动：`desiredColumn = cursorColumn`
    - 后续移动：保持原值不变
    - 实际列：`clamp(desiredColumn, 0, lineLength)`

2. **其他操作时清除 desiredColumn**：
    - 左右箭头、Home/End
    - 文本编辑（输入、删除、换行）

3. **边界情况强制更新**：
    ```typescript
    if (targetLine < 0) {
        return prev.desiredColumn !== null
            ? { ...prev, desiredColumn: targetColumn } // 新对象引用
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

### 受控组件状态同步：避免循环更新

#### Hook 层：函数式 setState

**文件**: `packages/ink-pro/src/components/MultiLineTextInput/useMultiLineInput.ts`

```typescript
const prevInitialTextRef = useRef(initialText);

useEffect(() => {
    if (initialText === prevInitialTextRef.current) {
        return;
    }

    // 使用函数式 setState 获取最新状态
    setState((prevState) => {
        const currentText = joinLines(prevState.lines);

        if (initialText !== currentText) {
            return initializeState(initialText);
        }

        return prevState;
    });

    prevInitialTextRef.current = initialText;
}, [initialText]); // 只依赖 initialText，不依赖 state.lines
```

#### 组件层：外部更新检测

**文件**: `packages/ink-pro/src/components/MultiLineTextInput/MultiLineTextInput.tsx`

```typescript
const isExternalUpdateRef = useRef(false);
const previousValueRef = useRef(originalValue);

// 检测外部 prop 变化
useEffect(() => {
    if (originalValue !== previousValueRef.current && originalValue !== text) {
        isExternalUpdateRef.current = true;
    }
    previousValueRef.current = originalValue;
}, [originalValue, text]);

// 同步 hook 状态到父组件
useEffect(() => {
    if (isExternalUpdateRef.current) {
        isExternalUpdateRef.current = false;
        return; // 外部更新跳过 onChange
    }

    if (text !== originalValue) {
        onChange?.(text); // 用户输入通知父组件
    }
}, [text, onChange, originalValue]);
```

### 粘贴处理修复

#### 1. 粘贴检测

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

#### 2. 修复 insertText 多行插入 bug

**问题**：原实现使用 `splice(start, 0, item)` 会插入而非替换，导致原行内容重复。

**正确实现**：

```typescript
const newLines = [
    ...prev.lines.slice(0, prev.cursorLine),
    beforeCursor + insertLines[0],
    ...insertLines.slice(1, -1),
    insertLines[insertLines.length - 1] + afterCursor,
    ...prev.lines.slice(prev.cursorLine + 1),
];
```

### 跨平台换行符处理

**问题**：不同系统使用不同换行符（Unix: `\n`, Windows: `\r\n`, 旧 Mac: `\r`）

**解决方案**：

#### 1. input() 函数 - 只处理 \n

将换行符检查从 `\r || \n` 改为只处理 `\n`，让 `\r` 由文本规范化统一处理。

#### 2. insertText() 函数 - 检测所有换行符

```typescript
const hasNewline = textToInsert.includes('\n') || textToInsert.includes('\r');

if (!hasNewline) {
    // 单行插入
} else {
    // 多行插入 - splitIntoLines 会将 \r\n 和 \r 转换为 \n
    const insertLines = splitIntoLines(textToInsert);
}
```

#### 3. splitIntoLines() - 统一规范化

已存在的规范化逻辑：

```typescript
const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
```

**顺序很重要**：必须先替换 `\r\n` 再替换 `\r`，避免将 `\r\n` 错误处理为两个换行符。

### 虚拟滚动

**实现位置**: `packages/ink-pro/src/components/MultiLineTextInput/MultiLineTextInput.tsx`

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

**性能提升**：只渲染可见行，支持长文本流畅滚动。

### 性能优化

- 使用 `useMemo` 缓存计算结果（lines → text 转换）
- 使用 `memo` 优化 `LineRenderer` 组件
- 虚拟滚动减少渲染开销

### 使用示例

```typescript
import { MultiLineTextInput } from 'ink-pro';

function MyComponent() {
    const [text, setText] = useState('');

    return (
        <MultiLineTextInput
            value={text}
            onChange={setText}
            placeholder="请输入多行文本..."
        />
    );
}
```

### 注意事项

1. **初始化位置**：hook 初始化时光标在最后一行末尾，而非第一行末尾
2. **光标位置定义**：cursorColumn 指向字符之间的位置（0 = 第一个字符前）
3. **状态更新引用**：边界情况下必须返回新对象引用，否则 React 不重新渲染
4. **终端输入行为**：某些终端按 Enter 键发送 `\r` 而非 `\n`，调用 input() 的组件需要预处理换行符
5. **实现位置**：该组件在 `packages/ink-pro` 包中，通过包管理共享

---

## 二、统一面板系统

### 背景与问题

TUI 应用中多个面板（Agent/Model/History/Knowledge/Task）各自实现独立逻辑，导致：

1. **交互不一致**、代码重复、扩展困难
2. **useInput 重复监听**导致 `MaxListenersExceededWarning`
3. **列表项渲染样式不统一**，emoji 宽度影响对齐
4. **命令系统与 UI 控制分离**，交互模式混乱

### 统一面板架构

**核心组件系统**：

```
packages/ink-pro/src/components/Panel/
├── types.ts                 # PanelConfig<T> 泛型配置
├── usePanelSearch.ts       # fuzzy search + 过滤器
├── usePanelNavigation.ts   # 统一快捷键处理
├── VirtualScrollList.tsx   # 虚拟滚动（只渲染可见项）
├── SearchBar.tsx           # 搜索栏
├── SelectItem.tsx          # 统一列表项渲染
└── UniversalPanel.tsx      # 组装所有组件
```

**PanelConfig 配置驱动**：

```typescript
interface PanelConfig<T> {
    data: T[]; // 数据源
    searchFields?: string[]; // 搜索字段
    filters?: FilterConfig<T>[]; // 过滤器
    renderItem: (item: T) => ReactNode; // 渲染函数
    itemHeight: number; // 虚拟滚动：单项高度
    visibleCount: number; // 虚拟滚动：可见数量
    keyMap?: Record<string, KeyHandler>; // 自定义快捷键
}
```

### 统一交互模式

- `/` - 激活模糊搜索
- `↑↓/PageUp/PageDown` - 导航
- `1-9` - 数字跳转
- `Tab` - 切换过滤器
- `q/Escape` - 关闭面板
- `keyMap` - 面板自定义快捷键

### 虚拟滚动优化

```typescript
// 只渲染可见区域 (startIndex ~ endIndex)
const visibleItems = filteredItems.slice(startIndex, endIndex);
```

- **性能提升**：支持 1000+ 条目流畅滚动
- **itemHeight**：根据实际内容调整（ModelPanel=2, AgentPanel=3）

---

## 三、React 渲染性能优化

### 根本原因

UniversalPanel 系统出现无限渲染循环，导致滚动卡顿、CPU 异常高。循环链：

```
函数引用变化 → useEffect 重新执行 → setState → 组件重新渲染 → 函数引用变化 → 循环
```

### 解决方案三步走

#### 1. Hook 层：稳定函数引用

**文件**: `packages/ink-pro/src/components/Panel/usePanelNavigation.ts`

```typescript
// 使用 ref 存储 setState，避免在 buildContext 中依赖它
const setSelectedIndexRef = useRef(setSelectedIndex);
const onCloseRef = useRef(onClose);

// 同步 ref
useEffect(() => {
    setSelectedIndexRef.current = setSelectedIndex;
}, [setSelectedIndex]);

// 优化后的 buildContext - 移除函数引用依赖
const buildContext = useCallback(
    (): PanelContext<T> => ({
        items,
        filteredItems,
        selectedIndex,
        setSelectedIndex: setSelectedIndexRef.current, // 通过 ref 访问
        onClose: onCloseRef.current || (() => {}),
    }),
    [items, filteredItems, selectedIndex],
); // ← 依赖数组不再包含函数引用
```

#### 2. 组件层：缓存 Config 属性

**文件**: `packages/ink-pro/src/components/Panel/UniversalPanel.tsx`

```typescript
// 缓存 config 的所有属性，确保值稳定
const dataSource = useMemo(() => config.dataSource, [config.dataSource]);
const id = useMemo(() => config.id, [config.id]);
const searchFields = useMemo(() => config.searchFields, [config.searchFields]);
// ... 其他所有 config 属性

useEffect(() => {
    const load = async () => {
        const data = await dataSource(); // 使用缓存的值
        setItems(data);
    };
    load();
}, [dataSource, id]); // 依赖稳定的值
```

#### 3. 应用层：移除循环依赖

**所有面板组件**（TaskPanel, ModelPanel, HistoryPanel, AgentPanel, KnowledgePanel）：

```typescript
// TaskPanel 示例：使用 useCallback 保持引用稳定
const handleDeleteTask = useCallback(
    async (task: TaskNode) => {
        await deleteTask.mutateAsync(task.id);
        setPreviewTask((prev) => (prev?.id === task.id ? null : prev));
    },
    [deleteTask],
);

// 使用 useMemo 缓存 panelConfig
const panelConfig: PanelConfig<TaskNode> = useMemo(
    () => ({
        id: 'tasks',
        dataSource: () => allTasks || [],
        renderItem,
        onDelete: handleDeleteTask,
        // ... 其他配置
    }),
    [allTasks, renderItem, handleDeleteTask],
);
```

### useInput 监听器冲突解决

**问题**: 多个 `useInput` 监听器同时注册到同一 EventEmitter 导致 `MaxListenersExceededWarning`。

**解决方案：isActive 动态控制**：

```typescript
useInput(
    (input, key) => {
        if (key.ctrl && input === 'c') {
            if (loading) stopGeneration();
            else process.exit();
        }
    },
    { isActive: activeView === 'chat' },
); // ← 只在聊天视图启用
```

`isActive: false` 时监听器不注册到 EventEmitter，避免冲突。

---

## 四、全局审批面板

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
    [requests.length, hasPendingRequests],
);

// 当所有请求都处理完毕时，自动执行
useEffect(() => {
    if (allRequestsProcessed) {
        executeApproved();
    }
}, [allRequestsProcessed, executeApproved]);
```

### GlobalApprovalPanel 多 Tab 面板

**自动跳转下一个 Pending 请求**：

```typescript
const nextTab = useCallback(
    (currentRequestId: string) => {
        const currentIndex = requests.findIndex((r) => r.id === currentRequestId);
        // 优先向后找 Pending
        const nextPending = requests.slice(currentIndex + 1).find((r) => r.status === ApprovalStatus.Pending);

        if (nextPending) {
            setActiveTab(nextPending.id);
        } else {
            // 如果后面没有，从开头找
            const firstPending = requests.find((r) => r.status === ApprovalStatus.Pending);
            if (firstPending) {
                setActiveTab(firstPending.id);
            }
        }
    },
    [requests],
);
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
    tool?: any; // 存储工具引用，用于后续执行
    status: ApprovalStatus;
    editedArgs?: any;
    createdAt: Date;
    messageIndex?: number;
    description?: string;
}
```

---

## 五、Ink Static 组件优化

### 背景与问题

Ink 的 `Static` 组件在某些情况下首次渲染时不会执行 `items` 的渲染函数，导致虽然传递了 items 但没有显示。

### 解决方案：延迟初始化模式

```typescript
const [ready, setReady] = useState(false);

useEffect(() => {
    const timer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timer);
}, []);

if (!ready) {
    // 首次渲染：直接显示所有消息（无 Static）
    return <Box>{messages.map(renderMessage)}</Box>;
}

// 后续渲染：使用 Static 优化性能
return (
    <Box>
        <Static items={histories}>
            {(message, i) => renderMessage(message, i, false)}
        </Static>
        {current.map((message, i) => renderMessage(message, histories.length + i, true))}
    </Box>
);
```

---

## 六、UniversalPanel 功能扩展

### 删除功能扩展

**需求**: 为 TaskPanel 添加删除任务功能，并扩展到所有面板

**实现**：

1. 扩展类型定义：添加 `onDelete` 回调
2. 扩展导航 Hook：添加 backspace/delete 键支持
3. TaskPanel 实现：`handleDeleteTask` + `refreshTrigger`

### TaskPanel 导航过滤修复

**Bug**: 过滤状态下选择功能错误，导航基于原始 `items` 而非 `filteredItems`

**修复**: 将所有导航逻辑从 `items` 改为 `filteredItems`

```typescript
// 正确：使用 filteredItems
if (filteredItems.length === 0) return;

case key.upArrow:
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    break;
```

---

## 七、TanStack Query 状态管理迁移

### 架构决策：库 vs 应用分离

**核心原则**：TanStack Query hooks 只在 `zen-code/` 应用层实现，不修改 `packages/` 依赖包。

**原因**：

- `packages/` 是共享库，可能被其他应用使用
- 最小影响范围，易于回滚
- 职责清晰：库层提供基础 API，应用层处理状态管理

**架构对比**：

```
✅ 推荐方案：
zen-code/src/chat/
  ├── hooks/                    ← Query logic in app
  │   ├── useConfig.ts
  │   ├── useSkills.ts
  │   ├── useModels.ts
  │   ├── useTasks.ts
  │   ├── useHistory.ts
  │   ├── useKnowledge.ts
  │   └── useProviders.ts
  ├── query-keys.ts            ← Query keys
  └── QueryClientProvider.tsx   ← Query Client setup

packages/union-client/           ← Pure library, no Query logic
  └── ConfigManager.ts           ← Basic CRUD only
```

### 迁移实施

#### Phase 1: 基础设施

- 安装 `@tanstack/react-query@5`
- 创建 `zen-code/src/chat/query-keys.ts` - 集中管理查询键
- 创建 `zen-code/src/chat/QueryClientProvider.tsx` - TUI 优化配置

#### Phase 2: 核心 Hooks

**已实现的 Hooks**（`zen-code/src/chat/hooks/`）：

1. `useConfig` - 配置查询
2. `useSkills` + `useDeleteSkill` - Skills 管理
3. `useModels` - 模型列表查询
4. `useTasks` + `useDeleteTask` - 任务管理
5. `useHistory` - 历史记录查询
6. `useKnowledge` - 知识库（memories 和 skills）
7. `useProviders` - Providers 列表查询
8. `useAgents` - Agents 列表查询

#### Phase 3: Context 重构

- 创建 `zen-code/src/chat/context/SettingsContext.tsx`
- 使用 TanStack Query hooks 替代手动 useState + useEffect
- 集成到 `Chat.tsx` 的 Provider 层级

#### Phase 4: 组件迁移

迁移的面板组件：

- `ModelPanel.tsx` - `useModels`
- `TaskPanel.tsx` - `useTasks`, `useDeleteTask`
- `HistoryPanel.tsx` - `useHistory`
- `KnowledgePanel.tsx` - `useKnowledge`
- `ProviderPanel.tsx` - 从 config 获取数据

### 关键问题和解决方案

#### 1. 导入路径错误

**问题**：组件从 `@codegraph/union-client` 导入 `useSettings`，应从新路径导入。

**解决**：

```typescript
// ❌ 错误
import { useSettings } from '@codegraph/union-client';

// ✅ 正确
import { useSettings } from '../context/SettingsContext';
```

#### 2. useModels 连接不稳定

**问题**：首次进入程序或切换 Provider 时模型列表加载不稳定。

**解决**：在 `useModels.ts` 添加：

- 请求超时保护（30 秒）
- 改进重试策略（超时和网络错误重试 2 次）
- 详细的错误处理
- 正确的 HTTP 方法和请求头

---

## 多 Provider 配置系统

### 配置格式重构

**旧格式**：单模型配置

```json
{
    "main_model": "gpt-4",
    "model_provider": "openai",
    "openai_api_key": "sk-xxx"
}
```

**新格式**：多 Provider 数组

```json
{
    "provider_id": "openai",
    "model_id": "gpt-4",
    "providers": [
        {
            "id": "openai",
            "type": "openai",
            "apiKey": "sk-xxx",
            "baseUrl": "https://api.openai.com/v1"
        }
    ]
}
```

### 核心实现

- **类型定义** (`packages/config/src/types/index.ts`): `ProviderConfig`, `AppConfig`, `LegacyAppConfig`
- **自动迁移** (`packages/config/src/implementations/FileSystemConfigStore.ts`):
    - 检测 `main_model` 字段识别旧配置
    - 自动转换为新格式并持久化
- **环境变量同步**：根据当前 `provider_id` 动态设置 `MODEL_PROVIDER`, `OPENAI_API_KEY` 等
- **Agent 状态** (`packages/agent/src/state.ts`): 使用 `provider_id` 和 `model_id` 字段

### Provider 配置表单

**文件**: `zen-code/src/chat/components/ProviderPanel.tsx`

- **架构**：使用 `view` 状态（`list` | `form`）控制视图，而非 Tabs
- **表单字段**：`id`, `type`, `name`, `apiKey`, `baseUrl`
- **交互逻辑**：
    - `n`: 新增 Provider
    - `e`: 编辑选中项
    - `d`: 删除选中项
    - `Enter`: 保存表单
    - `Esc`: 返回/关闭
- **命令访问**：`/provider` 命令打开配置面板
- **存储集成**：直接使用 `FileSystemConfigStore`，保存到 `~/.zen-code/settings.json`

### ModelPanel 直接 API 调用

- 从 `config.providers` 动态生成 tabs
- 使用 `provider.apiKey` 和 `provider.baseUrl` 直接调用 OpenAI/Anthropic API
- 切换 Tab 时自动加载对应 Provider 的模型列表

---

## 设计决策总结

| 决策                   | 理由                                         |
| ---------------------- | -------------------------------------------- |
| Hook + UI 分层架构     | 纯逻辑与纯表现分离，便于测试                 |
| desiredColumn 光标导航 | 解决垂直移动时光标位置丢失问题               |
| 受控组件状态同步       | 使用 ref + 函数式 setState 避免循环更新      |
| 跨平台换行符规范化     | 内部统一使用 `\n`，输入时规范化              |
| 泛型面板系统           | 代码复用率提升 60-80%                        |
| useRef 稳定函数引用    | 解决无限渲染循环问题                         |
| isActive 动态控制      | 避免 MaxListenersExceededWarning             |
| 库 vs 应用分离         | packages 提供基础 API，zen-code 处理状态管理 |
| 多 Provider 配置       | 支持多个 AI 服务提供商动态切换               |

---

## 适用场景

- 需要多面板选择的复杂 TUI 应用（Ink 框架）
- 需要统一交互模式和样式的场景
- 有大数据量列表需要虚拟滚动
- 需要批量工具审批和执行
- 需要处理大量文本的终端应用
- 需要多 Provider 配置的 AI 应用
- 需要统一状态管理的 TUI 应用

---

## 八、Settings Panel (JSON Schema 驱动表单)

### 背景

需要一个通用 Settings 面板配置 compact_mode、enable_thinking、stream_refresh_interval 等通用项。

### 架构决策

**JSON Schema 驱动**：所有配置项在 schema.ts 中定义，面板根据 Schema 自动渲染表单。

### 文件结构

```
zen-code/src/chat/components/settings/
├── types.ts              # SettingField 等类型定义
├── schema.ts             # SETTINGS_SCHEMA 配置项定义
├── SettingField.tsx      # 字段组件 (Toggle/Number/Select/Input)
├── SettingsForm.tsx      # 表单组件 (分组渲染 + 键盘导航)
├── SettingsPanel.tsx     # 面板主组件
└── index.ts              # 导出
```

### 核心实现

**Schema 定义** (schema.ts):

```typescript
export interface SettingField {
    key: keyof AppConfig;
    label: string;
    type: 'toggle' | 'select' | 'input' | 'number';
    help?: string;
    group: string;
    tab?: string;
    options?: Array<{ label: string; value: any }>;
    min?: number;
    max?: number;
    step?: number;
}

export const SETTINGS_SCHEMA: SettingField[] = [
    { key: 'compact_mode', label: '紧凑模式', type: 'toggle', group: '显示', help: '紧凑显示消息' },
    { key: 'enable_thinking', label: '思考模式', type: 'toggle', group: '模型', help: '启用模型思考' },
];
```

**统一交互** (SettingsForm.tsx):

- ↑↓ 导航字段
- ←→ 修改所有类型（Toggle 切换、Number 增减、Select 切换）
- 仅聚焦时显示帮助文本

### 与其他面板的关系

| 面板               | 命令      | 职责                |
| ------------------ | --------- | ------------------- |
| ModelProviderPanel | /provider | Model/Provider 配置 |
| McpPanel           | /mcp      | MCP 服务器配置      |
| SettingsPanel      | /settings | 通用配置            |

### 扩展方式

添加新配置项只需在 schema.ts 中添加 SettingField，面板自动渲染。

---

## 相关文件

### 多行文本输入

- `packages/ink-pro/src/components/MultiLineTextInput/useMultiLineInput.ts` - 纯逻辑层
- `packages/ink-pro/src/components/MultiLineTextInput/MultiLineTextInput.tsx` - UI 层
- `packages/ink-pro/src/components/MultiLineTextInput/index.ts` - 导出

### 统一面板系统

- `packages/ink-pro/src/components/Panel/` - 统一面板系统
- `zen-code/src/chat/components/TaskPanel.tsx` - 任务面板
- `zen-code/src/chat/components/ModelPanel.tsx` - 模型面板
- `zen-code/src/chat/components/HistoryPanel.tsx` - 历史面板
- `zen-code/src/chat/components/AgentPanel.tsx` - Agent 面板
- `zen-code/src/chat/components/KnowledgePanel.tsx` - 知识面板

### 全局审批面板

- `zen-code/src/chat/context/ApprovalContext.tsx` - 状态管理
- `zen-code/src/chat/components/GlobalApprovalPanel/GlobalApprovalPanel.tsx` - 多 Tab 面板
- `zen-code/src/chat/components/GlobalApprovalPanel/ApprovalItem.tsx` - 单个审批项

### Ink Static 优化

- `zen-code/src/chat/components/MessageBox.tsx` - 消息框组件

### TanStack Query

- `zen-code/src/chat/hooks/` - Query hooks
- `zen-code/src/chat/query-keys.ts` - Query keys
- `zen-code/src/chat/context/SettingsContext.tsx` - Settings Context
- `zen-code/src/chat/QueryClientProvider.tsx` - Query Client 配置

### 多 Provider 配置

- `packages/config/src/types/index.ts` - 类型定义
- `packages/config/src/implementations/FileSystemConfigStore.ts` - 配置存储
- `zen-code/src/chat/components/ProviderPanel.tsx` - Provider 配置面板

### Settings Panel

- `zen-code/src/chat/components/settings/types.ts` - 类型定义
- `zen-code/src/chat/components/settings/schema.ts` - Schema 定义
- `zen-code/src/chat/components/settings/SettingsPanel.tsx` - 面板主组件
