---
name: 'zen-code-core-optimizations'
description:
    'Zen Code 核心优化记忆集：多Provider配置系统、React渲染循环修复、TanStack
    Query状态管理迁移。涵盖配置架构重构、性能优化、异步状态统一管理等关键优化，遵循库vs应用分离原则'
tags: ['multi-provider', 'tanstack-query', 'react-performance', 'config-system', 'architecture', 'optimization']
category: 'architecture'
created: '2025-01-20'
last_updated: '2025-02-13'
priority: 'high'
context_scope: 'project'
---

# Zen Code 核心优化记忆集

## 一、多 Provider 配置系统

### 1. 配置格式重构

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

### 2. 核心实现

- **类型定义** (`packages/config/src/types/index.ts`): `ProviderConfig`, `AppConfig`, `LegacyAppConfig`
- **自动迁移** (`packages/config/src/implementations/FileSystemConfigStore.ts`):
    - 检测 `main_model` 字段识别旧配置
    - 自动转换为新格式并持久化
- **环境变量同步**：根据当前 `provider_id` 动态设置 `MODEL_PROVIDER`, `OPENAI_API_KEY` 等
- **Agent 状态** (`packages/agent/src/state.ts`): `main_model` → `provider_id` + `model_id`

### 3. Provider 配置表单

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

### 4. ModelPanel 直接 API 调用

- 从 `config.providers` 动态生成 tabs
- 使用 `provider.apiKey` 和 `provider.baseUrl` 直接调用 OpenAI/Anthropic API
- 切换 Tab 时自动加载对应 Provider 的模型列表

---

## 二、React 渲染性能优化

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
const configId = useMemo(() => config.id, [config.id]);
const configDataSource = useMemo(() => config.dataSource, [config.dataSource]);
// ... 其他所有 config 属性

useEffect(() => {
    const load = async () => {
        const data = await configDataSource(); // 使用缓存的值
        setItems(data);
    };
    load();
}, [configId, configDataSource]); // 依赖稳定的值
```

#### 3. 应用层：移除循环依赖

**文件**: 所有面板组件（TaskPanel, ModelPanel, HistoryPanel, AgentPanel, KnowledgePanel）

```typescript
// TaskPanel 示例：移除 refreshTrigger 依赖
const refreshTasks = useCallback(async () => {
    // ... 获取任务逻辑
}, []); // ← 空依赖数组

// 使用 ref 存储 setPreviewTask，避免循环依赖
const setPreviewTaskRef = useRef(setPreviewTask);
useEffect(() => {
    setPreviewTaskRef.current = setPreviewTask;
}, [setPreviewTask]);

const handleDeleteTask = useCallback(async (task: TaskNode) => {
    // ... 删除逻辑
    // 通过 ref 触发重新渲染，而非 refreshTrigger
    setPreviewTaskRef.current(null);
}, []);

// 使用 useMemo 缓存 panelConfig
const panelConfig: PanelConfig<TaskNode> = useMemo(
    () => ({
        id: 'tasks',
        dataSource: refreshTasks,
        // ... 其他配置
    }),
    [refreshTasks, handleDeleteTask],
);
```

### 修改文件清单

1. `packages/ink-pro/src/components/Panel/usePanelNavigation.ts` - ref 稳定函数
2. `packages/ink-pro/src/components/Panel/UniversalPanel.tsx` - 缓存 config
3. `zen-code/src/chat/components/TaskPanel.tsx` - 移除 refreshTrigger
4. `zen-code/src/chat/components/ModelPanel.tsx` - useMemo 缓存
5. `zen-code/src/chat/components/HistoryPanel.tsx` - useMemo 缓存
6. `zen-code/src/chat/components/AgentPanel.tsx` - useMemo 缓存
7. `zen-code/src/chat/components/KnowledgePanel.tsx` - useMemo 缓存

---

## 三、TanStack Query 状态管理迁移

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

#### Phase 2: 核心 Hooks（11个函数）

创建 `zen-code/src/chat/hooks/`：

1. `useConfig` + `useUpdateConfig` - 配置查询和更新
2. `useSkills` + `useSaveSkill` + `useDeleteSkill` - Skills 管理
3. `useModels` - 模型列表查询
4. `useTasks` + `useDeleteTask` + `useUpdateTaskStatus` - 任务管理
5. `useHistory` - 历史记录查询
6. `useKnowledge` - 知识库（memories 和 skills）
7. `useProviders` - Providers 列表查询

#### Phase 3: Context 重构

- 创建 `zen-code/src/chat/context/SettingsContext.tsx`
- 使用 TanStack Query hooks 替代手动 useState + useEffect
- 集成到 `Chat.tsx` 的 Provider 层级

#### Phase 4: 组件迁移

迁移 5 个面板组件：

- `ModelPanel.tsx` - `useModels`
- `TaskPanel.tsx` - `useTasks`, `useDeleteTask`
- `HistoryPanel.tsx` - `useHistory`
- `KnowledgePanel.tsx` - `useKnowledge`
- `ProviderPanel.tsx` - 从 config 获取数据

### 关键问题和解决方案

#### 1. 导入路径错误

**问题**：组件从 `@codegraph/union-client` 导入 `useSettings`，应从新路径导入。

**影响文件**：CommandHandler, ProviderForm, WelcomeHeader, AgentPanel, StatusBar, MessageAI

**解决**：

```typescript
// ❌ 错误
import { useSettings } from '@codegraph/union-client';

// ✅ 正确
import { useSettings } from '../context/SettingsContext';
```

#### 2. TypeScript 语法错误

**问题**：`SettingsContext.tsx` 中拼写错误 `mutateAsync`。

**解决**：修正拼写为 `mutateAsync`

#### 3. useModels 连接不稳定

**问题**：首次进入程序或切换 Provider 时模型列表加载不稳定。

**解决**：在 `useModels.ts` 添加：

- 请求超时保护（30 秒）
- 改进重试策略（超时和网络错误重试 2 次）
- 详细的错误处理
- 正确的 HTTP 方法和请求头

**核心代码**：

```typescript
const REQUEST_TIMEOUT = 30000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
```

---

## 适用场景

### 配置系统

- 需要支持多个 AI 服务提供商的应用
- 需要动态切换不同 Provider 的模型
- 需要从旧配置平滑迁移的场景

### 性能优化

- 所有使用 UniversalPanel 的面板组件
- 需要稳定回调函数和对象引用的组件
- 有 useEffect 依赖复杂数据结构的场景

### 状态管理

- 有共享库和应用层分离的 monorepo 项目
- 需要实施 TanStack Query 或类似状态管理方案
- 需要统一异步状态管理的 TUI 应用

---

## 关键注意事项

### 配置系统

1. **配置迁移自动执行**：初始化时检测并迁移，无需用户干预
2. **环境变量动态设置**：根据当前 `provider_id` 设置对应环境变量
3. **无主 Provider 概念**：所有 Provider 平等，无"默认"概念

### 性能优化

1. **useRef 正确使用**：在 useEffect 中同步 ref 值，确保访问最新状态
2. **useMemo 必要性**：只缓存真正会导致引用变化的值
3. **依赖数组检查**：确保 useCallback/useMemo 依赖完整但最小

### 状态管理

1. **严格遵循分离原则**：不修改 `packages/` 任何代码
2. **类型导出**：`packages/union-client` 导出基础类型供应用使用
3. **职责边界**：共享库提供 CRUD，应用层处理状态管理
4. **测试隔离**：测试覆盖 zen-code hooks，非 packages 逻辑

---

## 技术栈总结

| 优化领域 | 核心技术                     | 关键文件                                                       |
| -------- | ---------------------------- | -------------------------------------------------------------- |
| 配置系统 | LowDB, Zod, 自动迁移         | `packages/config/src/implementations/FileSystemConfigStore.ts` |
| 性能优化 | useRef, useMemo, useCallback | `packages/ink-pro/src/components/Panel/`                       |
| 状态管理 | TanStack Query v5            | `zen-code/src/chat/hooks/`                                     |

---

## 快速参考

### 修改导入路径

搜索所有使用 `@codegraph/union-client` 的 `useSettings` 导入，改为 `../context/SettingsContext`。

### 面板渲染循环修复

遵循三步走：Hook 层 ref 稳定函数 → 组件层缓存 config → 应用层移除循环依赖。

### TanStack Query Hook 创建

1. 定义 query keys
2. 实现 useXxx 查询 hook
3. 实现 useXxxMutation 变更 hook
4. 在 SettingsContext 中集成
5. 迁移组件使用新 hook

### Provider 配置

- 存储：`~/.zen-code/settings.json`
- 命令：`/provider`
- API 调用：ModelPanel 直接使用 `provider.apiKey` 和 `provider.baseUrl`
