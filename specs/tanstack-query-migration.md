# TanStack Query Migration Design

> 将 zen-code 项目中所有手动异步请求替换为 TanStack Query (React Query v5) 的设计方案

---

## 📋 At a Glance

| Aspect       | Details                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **目标**     | 统一异步状态管理，减少样板代码，提升性能和用户体验                                                                                    |
| **影响范围** | `zen-code/src/chat/` - 7 个异步场景（SettingsContext、useSkills、ModelPanel、TaskPanel、HistoryPanel、KnowledgePanel、ProviderPanel） |
| **不变范围** | `packages/union-client`、`packages/agent`、`packages/config` 等依赖包                                                                 |
| **预期收益** | 减少 40-50% 的异步状态管理代码，智能缓存，自动重新获取                                                                                |
| **预计工期** | 6-8 天（6 个阶段）                                                                                                                    |
| **风险等级** | 中等                                                                                                                                  |
| **最后更新** | 2026-02-13                                                                                                                            |
| **状态**     | Design Phase → Ready for Implementation                                                                                               |

---

## 🚀 Quick Start

如果你想快速了解如何实施这个迁移：

1. **Phase 1-2** (基础设施 + 核心 Hooks): 设置 QueryClient，创建自定义 hooks
2. **Phase 3** (Context 重构): 重构 SettingsContext 使用新 hooks
3. **Phase 4** (组件迁移): 迁移各个面板组件
4. **Phase 5-6** (优化 + 清理): 乐观更新、测试、文档

**最关键的改动**:

```typescript
// Before: 手动状态管理
const [config, setConfig] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    const loadConfig = async () => {
        setLoading(true);
        const data = await manager.getConfig();
        setConfig(data);
        setLoading(false);
    };
    loadConfig();
}, []);

// After: TanStack Query
const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: () => manager.getConfig(),
});
```

---

## 🚨 迁移范围说明

**✅ 将修改**:

- `zen-code/` - 所有 TUI 应用代码
    - `zen-code/src/chat/` - 聊天界面和组件
    - `zen-code/src/chat/hooks/` - 新增自定义 Query Hooks
    - `zen-code/src/chat/query-keys.ts` - 查询键定义
    - `zen-code/src/chat/QueryClientProvider.tsx` - QueryClient 提供者

**❌ 不会修改**:

- `packages/union-client/` - React 客户端库（保持不变）
- `packages/agent/` - Agent 系统（保持不变）
- `packages/config/` - 配置管理（保持不变）
- 任何第三方依赖包

**原则**: 只修改 `zen-code/` 应用层代码，不修改任何依赖包

**原因**:

1. `packages/union-client`、`packages/agent`、`packages/config` 是共享库，可能被其他应用使用
2. 减少影响范围，降低风险
3. 更容易回滚（只需回滚 `zen-code`）
4. 遵循单一职责原则 - 数据获取逻辑应该在应用层，而不是库层

```typescript
// Before: 手动状态管理
const [config, setConfig] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    const loadConfig = async () => {
        setLoading(true);
        const data = await manager.getConfig();
        setConfig(data);
        setLoading(false);
    };
    loadConfig();
}, []);

// After: TanStack Query
const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: () => manager.getConfig(),
});
```

---

## 📖 Table of Contents

- [当前状态分析](#当前状态分析) - 识别所有异步请求场景
- [TanStack Query 方案设计](#tanstack-query-方案设计) - 架构设计和 Query Key 设计
- [迁移计划](#迁移计划) - 6 个阶段的详细实施步骤
- [实现细节](#实现细节) - 具体代码示例和配置
- [测试策略](#测试策略) - 单元测试、集成测试、性能测试
- [风险评估](#风险评估) - 识别和缓解潜在风险
- [FAQ](#faq) - 常见问题
- [参考资料](#参考资料)

---

## 🔍 当前状态分析

### 异步请求环境分布

通过对 zen-code 项目的深入分析，识别出以下异步请求场景：

#### 📁 1. SettingsContext - 配置管理

**文件**: `zen-code/src/chat/context/SettingsContext.tsx`

**当前实现**:

```typescript
const [config, setConfig] = useState<AppConfig | null>(null);
const [loading, setLoading] = useState(true);
const [AVAILABLE_MODELS, setModels] = useState<ModelConfig[]>([]);

const loadConfig = async () => {
    await manager.initialize();
    const loadedConfig = await manager.getConfig();
    const models = await get_allowed_models().catch(() => []);
    setModels(models);
    // ...
};
```

**问题**:

- 手动管理 loading/error 状态
- 重新获取逻辑分散
- 缺乏缓存机制

---

#### 📁 2. useSkills Hook - Skills 管理

**文件**: `zen-code/src/chat/hooks/useSkills.ts`

**当前实现**:

```typescript
const [skills, setSkills] = useState<Skill[]>([]);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<Error | null>(null);

const loadSkills = useCallback(async () => {
    try {
        setLoading(true);
        const skillsList = await manager.listSkills();
        setSkills(skillsList);
    } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
        setLoading(false);
    }
}, [manager]);
```

**问题**:

- 重复的 loading/error 模式
- 手动刷新逻辑
- save/delete 后需要手动重新加载

---

#### 📁 3. ModelPanel - 模型列表加载

**文件**: `zen-code/src/chat/components/ModelPanel.tsx`

**当前实现**:

```typescript
const [models, setModels] = useState<ModelConfig[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const loadModels = async () => {
        if (!activeTab) return;
        setLoading(true);
        setError(null);
        try {
            let providerModels: ModelConfig[] = [];
            if (providerTab.config.type === 'openai') {
                providerModels = await getOpenAIModels(providerTab.config.apiKey, providerTab.config.baseUrl);
            }
            setModels(providerModels);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };
    loadModels();
}, [activeTab, providerTabs]);
```

**问题**:

- 每次切换 Tab 都重新加载（即使 Provider 配置没变）
- 手动管理 loading/error
- 无缓存策略

---

#### 📁 4. TaskPanel - 任务列表

**文件**: `zen-code/src/chat/components/TaskPanel.tsx`

**当前实现**:

```typescript
const refreshTasks = useCallback(async () => {
    try {
        const { getTasksStore } = await import('../store/tasks');
        const tasksStore = getTasksStore(process.cwd());
        await tasksStore.initialize();
        const allTasks = await tasksStore.getAllTasks();
        return allTasks;
    } catch (error) {
        console.error('Failed to load tasks:', error);
        return [];
    }
}, []);
```

**使用 UniversalPanel 的 dataSource**:

```typescript
const panelConfig: PanelConfig<TaskNode> = {
    id: 'tasks',
    title: '任务看板',
    icon: '📋',
    dataSource: refreshTasks, // ← 手动管理的异步函数
    // ...
};
```

**问题**:

- 删除任务后需要手动触发刷新
- 无自动重新验证机制
- 缺乏乐观更新

---

#### 📁 5. HistoryPanel - 历史记录

**文件**: `zen-code/src/chat/components/HistoryPanel.tsx`

**当前实现**:

```typescript
const { historyList, currentChatId, refreshHistoryList, toHistoryChat, createNewChat } = useChat();

const dataSource = useCallback(async () => {
    await refreshHistoryList();
    return historyList;
}, [refreshHistoryList, historyList]);
```

**问题**:

- 依赖 LangGraph SDK 的状态管理（`useChat` hook）
- 手动调用 refreshHistoryList()
- 缺乏错误边界处理

---

#### 📁 6. KnowledgePanel - 知识库（Memories/Skills）

**文件**: `zen-code/src/chat/components/KnowledgePanel.tsx`

**当前实现**:

```typescript
const loadKnowledge = useCallback(async (): Promise<KnowledgeItem[]> => {
    const projectMemoriesDir = join(process.cwd(), '.claude/memories');
    const userMemoriesDir = join(process.env.HOME || '', '.deepagents/code/memories');
    try {
        const memories = listMemories(userMemoriesDir, projectMemoriesDir);
        const skills = listSkills(userSkillsDir, projectSkillsDir);
        const filteredByTab =
            activeTab === 'memories'
                ? memories.map((m) => ({ ...m, type: 'memory' as const }))
                : skills.map((s) => ({ ...s, type: 'skill' as const }));
        return filteredByTab;
    } catch (error) {
        console.warn('Failed to load knowledge:', error);
        return [];
    }
}, [activeTab]);
```

**问题**:

- 同步函数包装为异步 Promise
- Tab 切换时重新加载
- 无缓存

---

#### 📁 7. ProviderPanel - Provider 配置

**文件**: `zen-code/src/chat/components/ProviderPanel.tsx`

**当前实现**:

```typescript
const providers = config?.providers || [];

const handleSaveProvider = useCallback(
    async (provider: ProviderConfig) => {
        const existingProviders = config?.providers || [];
        let newProviders: ProviderConfig[];

        if (formMode === 'add') {
            newProviders = [...existingProviders, provider];
        } else {
            newProviders = existingProviders.map((p) => (p.id === provider.id ? provider : p));
        }

        await updateConfig({
            providers: newProviders,
        });

        goToList();
    },
    [formMode, config?.providers, updateConfig, goToList],
);
```

**问题**:

- 乐观更新缺失
- 保存失败无法回滚
- 缺乏错误处理反馈

---

### 📊 异步模式总结

| 场景            | 数据源        | 状态管理       | 缓存 | 刷新机制             |
| --------------- | ------------- | -------------- | ---- | -------------------- |
| SettingsContext | ConfigManager | useState       | ❌   | 手动 useEffect       |
| useSkills       | ConfigManager | useState       | ❌   | 手动 refresh()       |
| ModelPanel      | fetch API     | useState       | ❌   | Tab 切换触发         |
| TaskPanel       | TasksStore    | UniversalPanel | ❌   | 手动 dataSource      |
| HistoryPanel    | LangGraph SDK | useChat        | ❌   | refreshHistoryList() |
| KnowledgePanel  | 同步函数      | Promise        | ❌   | Tab 切换触发         |
| ProviderPanel   | ConfigManager | useState       | ❌   | 手动 updateConfig    |

**共同问题**:

1. ❌ 大量重复的 `useState` + `useEffect` + `loading/error` 模式
2. ❌ 手动管理重新获取逻辑
3. ❌ 缺乏缓存策略（避免重复请求）
4. ❌ 无乐观更新（操作后立即生效）
5. ❌ 错误处理分散且不统一

---

### 💡 为什么需要 TanStack Query?

> **问题**: 每个异步场景都需要重复写 20-30 行样板代码
>
> **方案**: TanStack Query 自动处理 loading、error、caching、refetching

**对比示例**:

```typescript
// 📜 当前模式 (30+ 行)
const [config, setConfig] = useState<AppConfig | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
    const loadConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            await manager.initialize();
            const loadedConfig = await manager.getConfig();
            setConfig(loadedConfig);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };
    loadConfig();
}, [manager]);

// ✨ TanStack Query (6 行)
const {
    data: config,
    isLoading,
    error,
} = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
        await manager.initialize();
        return await manager.getConfig();
    },
});
```

**收益**:

- 📉 减少 **80%** 的样板代码
- 🚀 自动缓存和后台重新获取
- 🛡️ 统一错误处理
- 🧪 更易于测试
- 📦 类型安全

---

## 🏗️ TanStack Query 方案设计

### 🏛️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    zen-code Application                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  zen-code/src/chat/components/                     │    │
│  │  - ModelPanel, TaskPanel, HistoryPanel, etc.        │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ▲                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────┐
│              zen-code/src/chat/QueryClientProvider           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Query Client (singleton in zen-code)        │    │
│  │  - Cache management                                   │    │
│  │  - Background refetching                              │    │
│  │  - Optimistic updates                                  │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
┌──────────────────────────┴─────────────────────────────────────┐
│        zen-code/src/chat/hooks/ (custom Query Hooks)         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ useConfig    │  │ useSkills    │  │    useTasks       │  │
│  │ useModels    │  │ useHistory   │  │   useKnowledge    │  │
│  │ useProviders │  │              │  │                    │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
┌──────────────────────────┴─────────────────────────────────────┐
│                      External Dependencies                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │@codegraph/   │  │  TasksStore  │  │   LangGraph SDK    │  │
│  │union-client  │  │  (LowDB)     │  │     (HTTP)         │  │
│  │(ConfigManager)│  └──────────────┘  └────────────────────┘  │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 🔑 Query Key Design

TanStack Query 使用查询键来标识、缓存和重新获取数据。

```typescript
// zen-code/src/chat/query-keys.ts

export const queryKeys = {
    // ========== Config ==========
    config: {
        all: ['config'] as const,
        detail: () => ['config', 'detail'] as const,
    },

    // ========== Providers ==========
    providers: {
        all: ['providers'] as const,
        list: () => ['providers', 'list'] as const,
        detail: (id: string) => ['providers', 'detail', id] as const,
    },

    // ========== Models ==========
    models: {
        all: ['models'] as const,
        list: (providerId: string) => ['models', 'list', providerId] as const,
    },

    // ========== Skills ==========
    skills: {
        all: ['skills'] as const,
        list: () => ['skills', 'list'] as const,
        detail: (name: string) => ['skills', 'detail', name] as const,
    },

    // ========== Tasks ==========
    tasks: {
        all: ['tasks'] as const,
        list: (filter?: string) => ['tasks', 'list', filter] as const,
        detail: (id: string) => ['tasks', 'detail', id] as const,
    },

    // ========== History ==========
    history: {
        all: ['history'] as const,
        list: () => ['history', 'list'] as const,
        detail: (threadId: string) => ['history', 'detail', threadId] as const,
    },

    // ========== Knowledge ==========
    knowledge: {
        all: ['knowledge'] as const,
        memories: () => ['knowledge', 'memories'] as const,
        skills: () => ['knowledge', 'skills'] as const,
    },

    // ========== Chat (LangGraph) ==========
    chat: {
        all: ['chat'] as const,
        list: () => ['chat', 'list'] as const,
        detail: (threadId: string) => ['chat', 'detail', threadId] as const,
    },
} as const;
```

---

### 🎣 Custom Query Hooks

#### 🎣 1. useConfig - 配置查询

```typescript
// zen-code/src/chat/hooks/useConfig.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { AppConfig } from '@codegraph/config';
import type { ConfigManager } from '@codegraph/union-client';

interface UseConfigOptions {
    manager: ConfigManager;
    enabled?: boolean;
}

/**
 * 获取配置
 */
export function useConfig({ manager, enabled = true }: UseConfigOptions) {
    return useQuery({
        queryKey: queryKeys.config.detail(),
        queryFn: async () => {
            await manager.initialize();
            return await manager.getConfig();
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 分钟
        gcTime: 10 * 60 * 1000, // 10 分钟（之前叫 cacheTime）
    });
}

/**
 * 更新配置（Mutation）
 */
export function useUpdateConfig({ manager }: UseConfigOptions) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newConfig: Partial<AppConfig>) => {
            await manager.updateConfig(newConfig);
            return await manager.getConfig();
        },
        onSuccess: (data) => {
            // 更新配置缓存
            queryClient.setQueryData(queryKeys.config.detail(), data);

            // 重新获取相关数据
            queryClient.invalidateQueries({ queryKey: queryKeys.providers.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
        },
    });
}
```

---

#### 🎣 2. useSkills - Skills 查询

```typescript
// zen-code/src/chat/hooks/useSkills.ts (重构)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { Skill, SkillContent } from '@codegraph/union-client';
import type { ConfigManager } from '@codegraph/union-client';

interface UseSkillsOptions {
    manager: ConfigManager | null;
    enabled?: boolean;
}

/**
 * 获取 Skills 列表
 */
export function useSkills({ manager, enabled = true }: UseSkillsOptions) {
    return useQuery({
        queryKey: queryKeys.skills.list(),
        queryFn: async () => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            return await manager.listSkills();
        },
        enabled: enabled && !!manager,
        staleTime: 2 * 60 * 1000, // 2 分钟
    });
}

/**
 * 获取单个 Skill 内容
 */
export function useSkill({ manager, name, enabled = true }: UseSkillsOptions & { name: string }) {
    return useQuery({
        queryKey: queryKeys.skills.detail(name),
        queryFn: async () => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            return await manager.getSkill(name);
        },
        enabled: enabled && !!manager && !!name,
    });
}

/**
 * 保存 Skill（Mutation）
 */
export function useSaveSkill({ manager }: { manager: ConfigManager | null }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name, content }: { name: string; content: SkillContent }) => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            await manager.saveSkill(name, content);
        },
        onSuccess: () => {
            // 重新获取 Skills 列表
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.list() });
        },
    });
}

/**
 * 删除 Skill（Mutation）
 */
export function useDeleteSkill({ manager }: { manager: ConfigManager | null }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (name: string) => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            await manager.deleteSkill(name);
        },
        onSuccess: () => {
            // 重新获取 Skills 列表
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.list() });
        },
    });
}
```

---

#### 🎣 3. useModels - 模型列表查询

```typescript
// zen-code/src/chat/hooks/useModels.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { ProviderConfig } from '@codegraph/union-client';

interface UseModelsOptions {
    provider: ProviderConfig | null;
    enabled?: boolean;
}

/**
 * 获取 OpenAI 模型列表
 */
async function getOpenAIModels(apiKey: string, baseUrl: string): Promise<ModelConfig[]> {
    const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data
        .map((model: { id: string }) => ({ id: model.id, name: model.id }))
        .sort((a: ModelConfig, b: ModelConfig) => a.id.localeCompare(b.id));
}

/**
 * 获取 Anthropic 模型列表
 */
async function getAnthropicModels(apiKey: string, baseUrl: string): Promise<ModelConfig[]> {
    const response = await fetch(`${baseUrl}/v1/models`, {
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
    });

    if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: { id: string; display_name?: string }) => ({
        id: model.id,
        name: model.display_name || model.id,
    }));
}

/**
 * 获取 Provider 模型列表
 */
export function useModels({ provider, enabled = true }: UseModelsOptions) {
    return useQuery({
        queryKey: queryKeys.models.list(provider?.id || 'unknown'),
        queryFn: async () => {
            if (!provider || !provider.apiKey || !provider.baseUrl) {
                return [];
            }

            if (provider.type === 'openai') {
                return await getOpenAIModels(provider.apiKey, provider.baseUrl);
            } else if (provider.type === 'anthropic') {
                return await getAnthropicModels(provider.apiKey, provider.baseUrl);
            }

            return [];
        },
        enabled: enabled && !!provider && !!provider.apiKey && !!provider.baseUrl,
        staleTime: 10 * 60 * 1000, // 10 分钟
        retry: 1, // API 错误只重试 1 次
    });
}
```

---

#### 🎣 4. useTasks - 任务查询

```typescript
// zen-code/src/chat/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { TaskNode } from '@codegraph/union-client';

interface UseTasksOptions {
    filter?: string;
    enabled?: boolean;
}

/**
 * 获取任务列表
 */
export function useTasks({ filter, enabled = true }: UseTasksOptions) {
    return useQuery({
        queryKey: queryKeys.tasks.list(filter),
        queryFn: async () => {
            const { getTasksStore } = await import('@codegraph/zen-code/store/tasks');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();
            return await tasksStore.getAllTasks();
        },
        enabled,
        staleTime: 30 * 1000, // 30 秒
    });
}

/**
 * 删除任务（Mutation）
 */
export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (taskId: string) => {
            const { getTasksStore } = await import('@codegraph/zen-code/store/tasks');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();
            return await tasksStore.deleteTask(taskId);
        },
        onSuccess: () => {
            // 重新获取任务列表
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        },
    });
}
```

---

#### 🎣 5. useHistory - 历史记录查询

```typescript
// zen-code/src/chat/hooks/useHistory.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { useChat } from '@langgraph-js/sdk/react';

/**
 * 获取历史记录列表
 */
export function useHistory() {
    const { historyList, refreshHistoryList } = useChat();

    return useQuery({
        queryKey: queryKeys.history.list(),
        queryFn: async () => {
            await refreshHistoryList();
            return historyList;
        },
        staleTime: 60 * 1000, // 1 分钟
    });
}
```

---

#### 🎣 6. useKnowledge - 知识库查询

```typescript
// zen-code/src/chat/hooks/useKnowledge.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { listMemories, type MemoryMetadata } from '@codegraph/agent';
import { listSkills, type SkillMetadata } from '@langgraph-js/standard-agent';
import { join } from 'path';

export type KnowledgeItem = (MemoryMetadata | SkillMetadata) & { type: 'memory' | 'skill' };

interface UseKnowledgeOptions {
    type: 'memories' | 'skills';
    enabled?: boolean;
}

/**
 * 获取知识库
 */
export function useKnowledge({ type, enabled = true }: UseKnowledgeOptions) {
    return useQuery({
        queryKey: type === 'memories' ? queryKeys.knowledge.memories() : queryKeys.knowledge.skills(),
        queryFn: async () => {
            const projectDir = join(process.cwd(), '.claude', type);
            const userDir = join(process.env.HOME || '', '.deepagents/code', type);

            try {
                if (type === 'memories') {
                    const memories = listMemories(userDir, projectDir);
                    return memories.map((m) => ({ ...m, type: 'memory' as const }));
                } else {
                    const skills = listSkills(userDir, projectDir);
                    return skills.map((s) => ({ ...s, type: 'skill' as const }));
                }
            } catch (error) {
                console.warn(`Failed to load ${type}:`, error);
                return [];
            }
        },
        enabled,
        staleTime: 2 * 60 * 1000, // 2 分钟
    });
}
```

---

#### 🎣 7. useProviders - Provider 查询

```typescript
// zen-code/src/chat/hooks/useProviders.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { ProviderConfig } from '@codegraph/union-client';
import type { AppConfig } from '@codegraph/union-client';

/**
 * 从配置中提取 Providers 列表
 */
export function useProviders() {
  const { data: config } = useConfig({ manager: /* ... */ });

  return useQuery({
    queryKey: queryKeys.providers.list(),
    queryFn: () => {
      return config?.providers || [];
    },
    enabled: !!config,
    staleTime: Infinity, // 从配置中读取，不自动过期
  });
}
```

---

### ⚙️ QueryClient Provider Setup

```typescript
// zen-code/src/chat/QueryClientProvider.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * 创建全局 QueryClient
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // 默认重试 2 次
      refetchOnWindowFocus: false, // TUI 无窗口焦点事件
      refetchOnMount: true, // 组件挂载时重新获取
      refetchOnReconnect: false, // TUI 无网络事件
      staleTime: 5 * 60 * 1000, // 默认 5 分钟
      gcTime: 10 * 60 * 1000, // 默认 10 分钟
    },
    mutations: {
      retry: 1, // 默认重试 1 次
    },
  },
});

interface QueryClientProviderProps {
  children: ReactNode;
}

/**
 * QueryClient Provider 组件
 */
export function TanStackQueryProvider({ children }: QueryClientProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

---

### 🔗 集成到 SettingsProvider

```typescript
// zen-code/src/chat/context/SettingsContext.tsx (重构)

import { TanStackQueryProvider } from '../QueryClientProvider';
import { useConfig, useUpdateConfig } from '../hooks/useConfig';
import type { ModelConfig } from '@codegraph/union-client';
import type { ConfigManager } from '@codegraph/union-client';

interface SettingsProviderProps {
  manager: ConfigManager;
  get_allowed_models: () => Promise<ModelConfig[]>;
  children: ReactNode;
}

export const SettingsProvider = ({
  manager,
  get_allowed_models,
  children,
}: SettingsProviderProps) => {
  // 使用 TanStack Query 管理配置
  const { data: config, isLoading } = useConfig({ manager });
  const updateConfig = useUpdateConfig({ manager });

  // 加载可用模型
  const { data: AVAILABLE_MODELS } = useQuery({
    queryKey: ['models', 'available'],
    queryFn: get_allowed_models,
    staleTime: 30 * 60 * 1000, // 30 分钟
  });

  if (isLoading) {
    return null; // 或者显示加载指示器
  }

  // 计算派生状态
  const extraParams = useMemo(() => {
    return {
      provider_id: config?.provider_id || 'default',
      model_id: config?.model_id || AVAILABLE_MODELS?.[0]?.id,
      mcp_config: config?.mcp_config,
      enable_thinking: config?.enable_thinking ?? true,
      switch_command: config?.switch_command || '',
    };
  }, [config, AVAILABLE_MODELS]);

  const compactMode = config?.compact_mode ?? false;

  return (
    <TanStackQueryProvider>
      <SettingsContext.Provider
        value={{
          config,
          updateConfig: updateConfig.mutateAsync,
          extraParams,
          AVAILABLE_MODELS,
          manager,
          compactMode,
          toggleCompactMode: () => updateConfig.mutate({ compact_mode: !compactMode }),
        }}
      >
        {children}
      </SettingsContext.Provider>
    </TanStackQueryProvider>
  );
};
```

---

### 🔄 组件迁移示例

#### ModelPanel 迁移

**Before**:

```typescript
const [models, setModels] = useState<ModelConfig[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const providerModels = await getOpenAIModels(...);
      setModels(providerModels);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  loadModels();
}, [activeTab, providerTabs]);
```

**After**:

```typescript
import { useModels } from '../hooks/useModels';

const providerTab = providerTabs.find((t) => t.id === activeTab);
const {
    data: models,
    isLoading,
    error,
} = useModels({
    provider: providerTab?.config || null,
    enabled: !!activeTab,
});
```

---

#### TaskPanel 迁移

**Before**:

```typescript
const refreshTasks = useCallback(async () => {
    const tasksStore = getTasksStore(process.cwd());
    await tasksStore.initialize();
    return await tasksStore.getAllTasks();
}, []);

const panelConfig: PanelConfig<TaskNode> = {
    dataSource: refreshTasks,
    // ...
};
```

**After**:

```typescript
import { useTasks, useDeleteTask } from '../hooks/useTasks';

const { data: tasks, isLoading } = useTasks();
const deleteTask = useDeleteTask();

const dataSource = useCallback(async () => tasks || [], [tasks]);

const handleDeleteTask = useCallback(
    async (task: TaskNode) => {
        await deleteTask.mutateAsync(task.id);
        // TanStack Query 自动重新获取
    },
    [deleteTask],
);
```

---

#### KnowledgePanel 迁移

**Before**:

```typescript
const loadKnowledge = useCallback(async (): Promise<KnowledgeItem[]> => {
    const memories = listMemories(userMemoriesDir, projectMemoriesDir);
    const skills = listSkills(userSkillsDir, projectSkillsDir);
    const filteredByTab =
        activeTab === 'memories'
            ? memories.map((m) => ({ ...m, type: 'memory' as const }))
            : skills.map((s) => ({ ...s, type: 'skill' as const }));
    return filteredByTab;
}, [activeTab]);
```

**After**:

```typescript
import { useKnowledge } from '../hooks/useKnowledge';

const { data: memories, isLoading: loadingMemories } = useKnowledge({
    type: 'memories',
    enabled: activeTab === 'memories',
});

const { data: skills, isLoading: loadingSkills } = useKnowledge({
    type: 'skills',
    enabled: activeTab === 'skills',
});

const dataSource = useCallback(async () => {
    return activeTab === 'memories' ? memories || [] : skills || [];
}, [activeTab, memories, skills]);
```

---

## 📋 迁移计划

### 🗺️ 迁移路线图

```
Phase 1: 基础设施搭建 (1-2 天)
    ↓
Phase 2: 核心 Hooks 迁移 (2-3 天)
    ↓
Phase 3: Context 重构 (1 天)
    ↓
Phase 4: 组件迁移 (3-4 天)
    ↓
Phase 5: 乐观更新 (可选, 1-2 天)
    ↓
Phase 6: 清理和优化 (1 天)
```

### Phase 1: 基础设施搭建 (1-2 天) 🏗️

**目标**: 建立 TanStack Query 基础设施

**任务**:

- [x] 1.1 安装 `@tanstack/react-query` v5 到 `zen-code`
- [ ] 1.2 在 `zen-code/src/chat/` 创建 `query-keys.ts` 定义查询键
- [ ] 1.3 在 `zen-code/src/chat/` 创建 `QueryClientProvider` 组件
- [ ] 1.4 集成到 `zen-code/src/chat/context/SettingsContext.tsx`
- [ ] 1.5 配置全局默认选项

**验收标准**:

- ✅ QueryClient 正确初始化
- ✅ 可以在 `zen-code` 组件中使用 `useQuery` 和 `useMutation`
- ✅ 开发者工具正常工作

---

### Phase 2: 核心 Hooks 迁移 (2-3 天) 🎣

**目标**: 在 `zen-code/src/chat/hooks/` 创建所有自定义 Query/Mutation hooks

**任务**:

- [ ] 2.1 在 `zen-code/src/chat/hooks/` 创建 `useConfig` + `useUpdateConfig`
- [ ] 2.2 在 `zen-code/src/chat/hooks/` 创建 `useSkills` + `useSaveSkill` + `useDeleteSkill`
- [ ] 2.3 在 `zen-code/src/chat/hooks/` 创建 `useModels`
- [ ] 2.4 在 `zen-code/src/chat/hooks/` 创建 `useTasks` + `useDeleteTask`
- [ ] 2.5 在 `zen-code/src/chat/hooks/` 创建 `useHistory`
- [ ] 2.6 在 `zen-code/src/chat/hooks/` 创建 `useKnowledge`
- [ ] 2.7 在 `zen-code/src/chat/hooks/` 创建 `useProviders`

**验收标准**:

- ✅ 所有 hooks 通过单元测试
- ✅ 返回类型正确
- ✅ 错误处理统一

---

### Phase 3: Context 重构 (1 天) 🔧

**目标**: 重构 `zen-code/src/chat/context/SettingsContext.tsx` 使用新 hooks

**任务**:

- [ ] 3.1 重构 `SettingsContext` 使用新的 hooks
- [ ] 3.2 移除旧的 `useState` + `useEffect` 模式
- [ ] 3.3 更新 TypeScript 类型定义

**验收标准**:

- ✅ `SettingsContext` 代码简化 50%+
- ✅ 功能完全兼容
- ✅ 测试通过

---

### Phase 4: 组件迁移 (3-4 天) 🧩

**目标**: 迁移 `zen-code/src/chat/components/` 所有面板组件

**任务**:

- [ ] 4.1 迁移 `zen-code/src/chat/components/ModelPanel.tsx`
- [ ] 4.2 迁移 `zen-code/src/chat/components/TaskPanel.tsx`
- [ ] 4.3 迁移 `zen-code/src/chat/components/HistoryPanel.tsx`
- [ ] 4.4 迁移 `zen-code/src/chat/components/KnowledgePanel.tsx`
- [ ] 4.5 迁移 `zen-code/src/chat/components/ProviderPanel.tsx`
- [ ] 4.6 更新 `zen-code/src/chat/components/UniversalPanel.tsx` 支持查询结果

**验收标准**:

- ✅ 组件代码简化 40%+
- ✅ 性能无回退
- ✅ 用户体验无变化

---

### Phase 5: 乐观更新 (可选, 1-2 天) ⚡

**目标**: 在 `zen-code/src/chat/hooks/` 实现乐观更新提升用户体验

**任务**:

- [ ] 5.1 实现 Provider 保存的乐观更新
- [ ] 5.2 实现 Task 删除的乐观更新
- [ ] 5.3 实现 Skill 保存/删除的乐观更新

**验收标准**:

- ✅ 操作立即生效
- ✅ 失败时自动回滚
- ✅ UI 无闪烁

---

### Phase 6: 清理和优化 (1 天) 🧹

**目标**: 清理 `zen-code/` 代码和文档

**任务**:

- [ ] 6.1 移除 `zen-code/` 废弃代码
- [ ] 6.2 更新文档
- [ ] 6.3 性能优化（缓存策略调整）
- [ ] 6.4 错误边界增强

**验收标准**:

- ✅ 无 TypeScript 错误
- ✅ 代码审查通过
- ✅ 文档更新完成

---

## 💻 实现细节

### 📦 依赖安装

```bash
# zen-code
bun add @tanstack/react-query@5
bun add -d @tanstack/react-query-devtools@5
```

### ⚙️ QueryClient 配置

```typescript
// 开发环境启用 DevTools
const isDevelopment = process.env.NODE_ENV === 'development';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                // 网络错误重试 2 次，业务错误不重试
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    return failureCount < 2;
                }
                return false;
            },
            refetchOnWindowFocus: false, // TUI 无窗口焦点
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        },
    },
    logger: isDevelopment ? console : { log: () => {}, warn: () => {}, error: () => {} },
});
```

### 🧪 测试工具函数

```typescript
// zen-code/src/chat/__tests__/test-utils.ts

import { QueryClient, QueryCache } from '@tanstack/react-query';

/**
 * 创建测试用 QueryClient
 */
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
        logger: {
            log: console.log,
            warn: console.warn,
            error: () => {},
        },
    });
}

/**
 * 清空所有查询缓存
 */
export function clearAllQueries(queryClient: QueryClient) {
    queryClient.clear();
}
```

---

## 🧪 测试策略

### 单元测试 📝

每个自定义 hook 需要测试以下场景：

1. ✅ **成功获取数据**
2. ⏳ **加载状态**
3. ❌ **错误处理**
4. 💾 **缓存命中**
5. 🔄 **重新获取**

**示例** (useConfig):

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig } from '../hooks/useConfig';

const createWrapper = (client: QueryClient) => ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('useConfig', () => {
  it('should fetch config successfully', async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useConfig({ manager: mockManager }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConfig);
  });

  it('should handle errors', async () => {
    const errorManager = {
      initialize: async () => { throw new Error('Failed to initialize'); },
      getConfig: async () => mockConfig,
    };

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useConfig({ manager: errorManager }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
```

---

### 集成测试 🔗

测试关键用户流程：

1. **切换模型**: ModelPanel → 选择模型 → 更新配置 → 重载
2. **删除任务**: TaskPanel → 删除任务 → 自动刷新
3. **保存 Provider**: ProviderPanel → 保存 → 列表更新

---

### 性能测试 ⚡

使用 React Profiler 对比迁移前后的性能：

- 组件渲染次数
- 重新获取频率
- 内存占用

---

## ⚠️ 风险评估

### 风险矩阵

| 风险                                 | 影响 | 可能性 | 优先级 | 缓解措施                                |
| ------------------------------------ | ---- | ------ | ------ | --------------------------------------- |
| LangGraph SDK 与 TanStack Query 冲突 | 高   | 低     | 中     | 保留 `useChat` hook，仅包装历史记录查询 |
| UniversalPanel dataSource 兼容性     | 中   | 中     | 中     | 修改 `UniversalPanel` 支持 Query 结果   |
| 缓存策略不当导致数据过期             | 中   | 中     | 中     | 配置合理的 `staleTime` 和 `gcTime`      |
| Mutation 失败未回滚                  | 中   | 低     | 低     | 实现 `onError` 处理和乐观更新回滚       |
| TUI 环境下 DevTools 不工作           | 低   | 高     | 低     | 仅在 Web 环境启用 DevTools              |
| 学习曲线                             | 低   | 中     | 低     | 团队培训 + 代码示例                     |
| 依赖增加                             | 低   | 低     | 低     | TanStack Query 是成熟稳定库             |
| 测试覆盖率不足                       | 低   | 中     | 低     | 为每个 hook 编写单元测试                |

---

### 🛡️ 缓解策略

**高风险**:

- ✅ 验证 LangGraph SDK 集成
- ✅ 进行全面的集成测试

**中风险**:

- ✅ Code review 重点检查缓存策略
- ✅ 添加错误监控和日志

**低风险**:

- ✅ 编写迁移指南和示例代码
- ✅ 评估依赖包的大小和安全性

---

## 🎯 预期收益

### 📊 代码质量

- ✂️ **减少样板代码**: 预计减少 40-50% 的异步状态管理代码
- 🛡️ **统一错误处理**: 集中式错误边界和处理
- 🔒 **类型安全**: 更好的 TypeScript 支持

### ⚡ 性能

- 🚀 **减少重复请求**: 智能缓存避免不必要的网络请求
- 🔄 **后台重新获取**: 自动保持数据新鲜
- ⚡ **乐观更新**: 提升用户体验

### 🔧 可维护性

- 📖 **声明式 API**: 更易理解和调试
- 🛠️ **开发者工具**: 可视化查询状态和性能
- 🧪 **测试友好**: 更容易编写单元测试

---

## 💡 FAQ

### Q1: 为什么不修改 `packages/union-client` 而是在 `zen-code` 中实现?

**A**: 遵循以下原则：

1. **库 vs 应用分离**: `packages/` 中的包是共享库，`zen-code/` 是应用
2. **最小影响**: 只修改应用代码，不影响其他可能的消费者
3. **职责清晰**: 数据获取逻辑属于应用层，库层提供基础的 ConfigManager API
4. **易于回滚**: 如果有问题，只需回滚 `zen-code`，不影响共享库

**架构对比**:

```
❌ 不推荐 (修改 packages/union-client):
packages/union-client/
  ├── hooks/useConfig.ts           ← Query logic in library
  ├── hooks/useSkills.ts           ← Query logic in library
  └── context/SettingsContext.tsx  ← Query logic in library

✅ 推荐 (只在 zen-code/ 中实现):
zen-code/src/chat/
  ├── hooks/useConfig.ts           ← Query logic in app
  ├── hooks/useSkills.ts           ← Query logic in app
  └── context/SettingsContext.tsx  ← Query logic in app
packages/union-client/              ← Pure library, no Query logic
  └── ConfigManager.ts              ← Basic CRUD operations only
```

---

### Q2: 为什么不直接使用 LangGraph SDK 的 `useChat` hook?

**A**: LangGraph SDK 的 `useChat` 主要用于聊天状态管理，而 TanStack Query 更适合数据获取和缓存。两者可以互补：

- `useChat`: 管理聊天会话、消息历史
- `useQuery`: 管理配置、任务、模型列表等静态数据

**策略**: 保留 `useChat`，仅包装历史记录查询到 TanStack Query。

---

### Q2: TUI 环境下如何处理 DevTools?

**A**: TUI 无法使用浏览器 DevTools，但可以通过以下方式调试：

```typescript
// 开发环境启用日志
const queryClient = new QueryClient({
    logger: {
        log: console.log,
        warn: console.warn,
        error: console.error,
    },
});
```

---

### Q3: 如何处理 UniversalPanel 的 dataSource?

**A**: 修改 `UniversalPanel` 支持两种数据源：

```typescript
type DataSource<T> = () => Promise<T[]> | T[];

interface PanelConfig<T> {
    dataSource?: DataSource<T> | { data: T[]; isLoading: boolean };
}
```

---

### Q4: 缓存策略如何设置?

**A**: 根据数据特性设置：

| 数据类型 | staleTime | gcTime  | 理由           |
| -------- | --------- | ------- | -------------- |
| 配置     | 5 分钟    | 10 分钟 | 变化频率低     |
| 模型列表 | 10 分钟   | 30 分钟 | API 调用成本高 |
| 任务列表 | 30 秒     | 5 分钟  | 需要相对实时   |
| 历史记录 | 1 分钟    | 10 分钟 | 中等变化频率   |

---

### Q5: 如何处理错误?

**A**: 统一错误处理策略：

```typescript
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                // 网络错误重试 2 次
                if (error instanceof TypeError) {
                    return failureCount < 2;
                }
                // 业务错误不重试
                return false;
            },
        },
    },
});
```

---

### Q6: 乐观更新如何实现?

**A**: 使用 `onMutate` + `onError` + `onSuccess` 组合：

```typescript
useMutation({
    mutationFn: deleteTask,
    onMutate: async (taskId) => {
        // 取消相关查询
        await queryClient.cancelQueries({ queryKey: ['tasks'] });

        // 保存旧数据
        const previousTasks = queryClient.getQueryData(['tasks']);

        // 乐观更新
        queryClient.setQueryData(['tasks'], (old) => old?.filter((t) => t.id !== taskId));

        return { previousTasks };
    },
    onError: (err, taskId, context) => {
        // 回滚
        queryClient.setQueryData(['tasks'], context.previousTasks);
    },
    onSettled: () => {
        // 重新获取
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
});
```

---

### Q7: 如何测试 Query Hooks?

**A**: 使用 `@testing-library/react-hooks`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

test('should fetch config', async () => {
  const { result } = renderHook(() => useConfig({ manager }), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(mockConfig);
});
```

---

## 📚 参考资料

### 📘 官方文档

- [TanStack Query 官方文档](https://tanstack.com/query/latest)
- [React Query v5 迁移指南](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)

### 📁 项目内部资源

- [项目中的 TanStack Query Skill](./.claude/skills/tanstack-query/SKILL.md) - 完整的 TanStack Query v5 使用指南
- [Vitest 测试指南](./.claude/memories/vitest-complete-testing-guide/MEMORY.md) - 项目测试体系说明

### 💬 社区资源

- [TanStack Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [React Query Patterns](https://github.com/tannerlinsley/react-query/discussions/3236)

---

## 📝 附录

### A. 📦 完整 Hook API

```typescript
// zen-code/src/chat/hooks/index.ts

export * from './useConfig';
export * from './useSkills';
export * from './useModels';
export * from './useTasks';
export * from './useHistory';
export * from './useKnowledge';
export * from './useProviders';
```

### B. ✅ 迁移检查清单

**基础设施** 🏗️:

- [ ] 在 `zen-code/` 安装 `@tanstack/react-query@5`
- [ ] 在 `zen-code/src/chat/` 创建 `query-keys.ts`
- [ ] 在 `zen-code/src/chat/` 创建 `QueryClientProvider`
- [ ] 配置全局默认选项

**Hooks** 🎣:

- [ ] `zen-code/src/chat/hooks/useConfig` + `useUpdateConfig`
- [ ] `zen-code/src/chat/hooks/useSkills` + `useSaveSkill` + `useDeleteSkill`
- [ ] `zen-code/src/chat/hooks/useModels`
- [ ] `zen-code/src/chat/hooks/useTasks` + `useDeleteTask`
- [ ] `zen-code/src/chat/hooks/useHistory`
- [ ] `zen-code/src/chat/hooks/useKnowledge`
- [ ] `zen-code/src/chat/hooks/useProviders`

**Context** 🔧:

- [ ] 重构 `zen-code/src/chat/context/SettingsContext.tsx`

**组件** 🧩:

- [ ] 迁移 `zen-code/src/chat/components/ModelPanel.tsx`
- [ ] 迁移 `zen-code/src/chat/components/TaskPanel.tsx`
- [ ] 迁移 `zen-code/src/chat/components/HistoryPanel.tsx`
- [ ] 迁移 `zen-code/src/chat/components/KnowledgePanel.tsx`
- [ ] 迁移 `zen-code/src/chat/components/ProviderPanel.tsx`

**测试** 🧪:

- [ ] 所有 hooks 添加单元测试
- [ ] 关键用户流程集成测试

**优化** ⚡:

- [ ] 乐观更新（可选）
- [ ] 缓存策略调优
- [ ] 性能测试

**文档** 📖:

- [ ] 更新 README
- [ ] 更新代码注释
- [ ] 编写迁移指南

---

## 📌 版本历史

| 版本 | 日期       | 变更         | 作者         |
| ---- | ---------- | ------------ | ------------ |
| v1.0 | 2026-02-13 | 初始设计文档 | AI Assistant |

---

**文档状态**: ✅ Ready for Implementation **下一步**: 开始 Phase 1 - 基础设施搭建
