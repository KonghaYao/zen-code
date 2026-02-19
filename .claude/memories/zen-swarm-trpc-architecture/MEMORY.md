---
name: zen-swarm-trpc-architecture
description:
    zen-swarm 项目的 tRPC 双客户端架构：trpc(createTRPCReact)用于组件顶层React
    Hooks(useQuery/useMutation)，apiClient(createTRPCClient)用于事件处理器和stores中的直接调用。解决hooks[lastArg] is
    not a function错误。包含DashboardView死循环修复（useEffect依赖问题）
tags:
    - trpc
    - react-hooks
    - event-handler
    - tanstack-query
    - zen-swarm
    - useEffect-fix
category: bug-fix
created: 2025-01-17
last_updated: 2025-02-19
priority: high
context_scope: project
---

# tRPC 双客户端架构

## 问题一：hooks[lastArg] is not a function

### 根本原因

tRPC 的 `createTRPCReact()` 只提供 React Hooks，**不提供** `.query()` 和 `.mutate()` 方法。

**错误代码：**

```tsx
// ❌ 错误：createTRPCReact 返回的对象没有 .query() 方法
const handleToggleVersions = async (promptId: string) => {
    const versions = await trpc.prompts.getVersions.query({ promptId });
};
```

### 解决方案：双客户端架构

**文件**: `zen-swarm/src/frontend/api.ts`

```tsx
import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

// React Hooks 客户端 - 用于组件顶层
export const trpc = createTRPCReact<AppRouter>();

// 普通客户端 - 用于事件处理器和 stores
export const apiClient = createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: '/api/trpc' })],
});
```

**使用示例：**

```tsx
// ✅ 组件顶层使用 React Hooks
const { data } = trpc.prompts.list.useQuery();

// ✅ 事件处理器中使用 apiClient
const handleToggleVersions = async (promptId: string) => {
    const versions = await apiClient.prompts.getVersions.query({ promptId });
};
```

---

## 问题二：DashboardView 死循环

### 根本原因

`useCallback` 返回的函数引用每次渲染都可能变化，导致 useEffect 无限重新执行。

### 解决方案：useEffect + useRef

```tsx
export function DashboardView() {
    const { agents, agentsLoading, loadAgents } = useAgentsStore();
    const hasLoadedAgents = useRef(false);

    useEffect(() => {
        if (!hasLoadedAgents.current) {
            loadAgents();
            hasLoadedAgents.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 空依赖数组，只执行一次
}
```

**修复要点：**

1. 使用 `useRef` 跟踪是否已加载
2. 空依赖数组 `[]` 确保只在组件挂载时执行一次
3. 每个资源使用独立的 `useEffect`

---

## 使用场景对照表

| 使用场景       | API                                | 示例                                                 |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| 组件顶层查询   | `trpc.xxx.useQuery()`              | `const { data } = trpc.prompts.list.useQuery()`      |
| 组件顶层修改   | `trpc.xxx.useMutation()`           | `const mutation = trpc.prompts.create.useMutation()` |
| 事件处理器调用 | `apiClient.xxx.query()`            | `await apiClient.prompts.getVersions.query({ id })`  |
| Store 中调用   | `apiClient.xxx.query()`            | `await apiClient.agents.list.query()`                |
| 手动刷新缓存   | `trpc.useUtils().xxx.invalidate()` | `utils.prompts.list.invalidate()`                    |

---

## 修复的文件

- `zen-swarm/src/frontend/api.ts` - 添加 apiClient 导出
- `zen-swarm/src/frontend/components/panels/PromptsPanel/index.tsx` - 使用 apiClient
- `zen-swarm/src/frontend/views/DashboardView.tsx` - useEffect 修复
- `zen-swarm/src/frontend/views/AgentConfigView.tsx` - useEffect 修复
- `zen-swarm/src/frontend/views/ResourcesView.tsx` - useEffect 修复

---

## 预防措施

1. **永远不要**在事件处理器中直接调用 `trpc.xxx.query()`
2. **使用 `apiClient`** 进行事件处理器中的 API 调用
3. **只在组件顶层**使用 `trpc.useQuery()` 和 `trpc.useMutation()`
4. **useEffect 使用 ref 避免死循环**：空依赖数组 + useRef 标记
5. **避免依赖 useCallback 函数**：函数引用变化会导致 useEffect 重新执行
