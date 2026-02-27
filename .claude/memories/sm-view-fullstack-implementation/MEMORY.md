---
name: sm-view-fullstack-implementation
description:
    Zen-Swarm 状态机管理视图的完整前后端实现方案；包括 tRPC + React Query 数据流、Zustand 状态管理、组件架构（SMView →
    DefinitionList/InstanceList → StateMachineEditor/NewMachineEditor → TreeView/PropertyEditor）、后端 SM Router API
    设计、以及创建按钮无响应等问题的修复方法
tags:
    - trpc
    - react-query
    - zustand
    - state-machine
    - frontend-backend
    - component-architecture
category: architecture
created: 2025-01-24
last_updated: 2025-01-24
priority: high
context_scope: project
---

# ## 背景

## 背景

Zen-Swarm 需要一个完整的状态机管理界面（SM
View），实现状态机定义的 CRUD、实例管理、状态转换和历史回滚功能。要求前后端完全打通，不能有 mock 数据。

## 架构设计

### 数据流

```
前端组件 → useSM hooks (React Query) → apiClient (tRPC) → SM Router → StateMachineManager → SMDatabase (SQLite)
```

### 后端 API（`src/api/sm.ts`）

**Definitions 管理**:

- `sm.listDefinitions` - 列出所有状态机定义
- `sm.getDefinition` - 获取单个定义
- `sm.createDefinition` - 创建定义
- `sm.updateDefinition` - 更新定义
- `sm.deleteDefinition` - 删除定义

**Instances 管理**:

- `sm.listInstances` - 列出状态实例（可按 machine_id 过滤）
- `sm.getInstance` - 获取实例详情（含 available_transitions）
- `sm.createInstance` - 创建实例
- `sm.deleteInstance` - 删除实例

**Transitions**:

- `sm.transitionTo` - 直接转换状态
- `sm.sendEvent` - 发送事件触发转换
- `sm.getHistory` - 获取转换历史
- `sm.rollback` - 回滚到之前状态

### 前端组件层级

```
SMView.tsx
├── Sidebar
│   ├── DefinitionList.tsx（状态机定义列表）
│   └── InstanceList.tsx（状态实例列表）
├── Main Content
│   ├── StateMachineEditor.tsx（编辑已有状态机）
│   ├── NewMachineEditor.tsx（创建新状态机）
│   └── Empty State（未选择时）
└── Right Panel
    ├── InstanceDetail.tsx（实例详情 + 转换按钮）
    └── HistoryTimeline.tsx（转换历史 + 回滚）
```

### 状态管理（`src/frontend/stores/smStore.ts`）

```typescript
interface SMState {
    // 选择状态
    selectedMachineId: string | null;
    selectedStateId: string | null;

    // 编辑状态
    editingMachine: StateMachineDefinition | null;
    isEditing: boolean;
    isCreating: boolean;

    // UI 状态
    sidebarTab: 'definitions' | 'instances';
    expandedNodes: Set<string>;
}
```

### React Query Hooks（`src/frontend/hooks/useSM.ts`）

```typescript
// Query Keys 设计
export const smKeys = {
    all: ['sm'] as const,
    definitions: () => [...smKeys.all, 'definitions'] as const,
    definition: (machineId: string) => [...smKeys.all, 'definition', machineId] as const,
    instances: (machineId?: string) => [...smKeys.all, 'instances', machineId] as const,
    // ...
};

// 典型 Hook
export function useSMDefinitions() {
    return useQuery({
        queryKey: smKeys.definitions(),
        queryFn: () => apiClient.sm.listDefinitions.query(),
    });
}

export function useCreateSMDefinition() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (definition: StateMachineDefinition) => apiClient.sm.createDefinition.mutate(definition),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: smKeys.definitions() });
        },
    });
}
```

## 遇到的问题及解决方案

### 1. 类型系统不完整

**问题**：`AppRouter` 不包含 SM Router，导致前端 `apiClient` 类型错误。

**解决方案**（`src/api/index.ts`）：

```typescript
// 导出包含 SM Router 的完整类型
export type FullAppRouter = ReturnType<typeof createMergedRouter>;
```

### 2. React 导入问题

**问题**：`PropertyEditor.tsx` 使用 `React.useState` 但未导入 React。

**解决方案**：

```typescript
// 错误
const [localValue, setLocalValue] = React.useState(value || '');

// 正确
import { useState, useEffect } from 'react';
const [localValue, setLocalValue] = useState(value || '');
```

### 3. 创建按钮无响应

**问题**：点击 "+" 按钮后 `setIsCreating(true)` 被调用，但 `SMView` 只检查 `selectedMachineId`，没有处理 `isCreating`
状态。

**解决方案**（`SMView.tsx`）：

```typescript
const { sidebarTab, selectedMachineId, selectedStateId, isCreating, setSidebarTab } = useSMStore();

// Main Content
{isCreating ? (
  <NewMachineEditor />
) : selectedMachineId ? (
  <StateMachineEditor machineId={selectedMachineId} />
) : (
  <EmptyState />
)}
```

### 4. 图标重复导出

**问题**：`Icons.tsx` 中 `Layers`, `GitBranch` 等图标被导出两次。

**解决方案**：合并去重，确保每个图标只导出一次。

## 关键文件路径

- 后端 Router: `src/api/sm.ts`
- 后端 Manager: `src/middlewares/sm/StateMachineManager.ts`
- 前端 Store: `src/frontend/stores/smStore.ts`
- 前端 Hooks: `src/frontend/hooks/useSM.ts`
- 主视图: `src/frontend/views/SM/SMView.tsx`
- 组件目录: `src/frontend/views/SM/components/`

## 创建新状态机的完整流程

```
用户点击 "+" 按钮
  → DefinitionList: selectMachine(null) + setIsCreating(true)
  → SMView 检测到 isCreating=true
  → 渲染 NewMachineEditor 组件
  → 用户填写表单（ID、Name、Initial State）
  → 点击 Create 按钮
  → useCreateSMDefinition mutation 调用 API
  → 成功后: selectMachine(newId) + setIsCreating(false)
  → 切换到 StateMachineEditor 显示新创建的状态机
```

## 适用场景

- 需要实现状态机管理 UI 的项目
- tRPC + React Query 的前后端集成参考
- Zustand 状态管理的最佳实践
- 复杂表单和树形编辑器的组件设计
