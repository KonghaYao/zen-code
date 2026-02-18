---
name: subagents-middleware-migration
description:
    将 SubAgentsMiddleware 从应用层迁移到 standard-agent 通用库的完整过程；使用泛型 TState + createAgent
    回调解耦应用依赖，将 AgentPackage 改为 SubAgentInfo[] JSON 数组，保持 task_tool
    严格对齐原始逻辑；适用于将应用层中间件抽象为可复用库组件的场景
tags:
    - middleware
    - migration
    - dependency-injection
    - subagents
    - standard-agent
    - refactoring
category: architecture
created: 2025-01-17
last_updated: 2025-01-17
priority: high
context_scope: project
---

# ## 背景

## 背景

SubAgentsMiddleware 原位于
`packages/agent/src/middlewares/subTasks.ts`，依赖应用层类型（CodeState、createStandardAgentV2），无法直接复用。

## 关键决策

### 1. 依赖注入模式

使用 `createAgent` 回调函数替代直接依赖：

```typescript
// 应用层提供具体实现
createAgent: async (taskId, args, state) => {
    return await createStandardAgentV2(args.subagent_id, pkg, state, {}, { parent_id: taskId });
};
```

### 2. 数据结构抽象

将 `AgentPackage` 依赖改为简单的 `SubAgentInfo[]`：

```typescript
interface SubAgentInfo {
    id: string;
    name: string;
    description: string;
    tools?: string[];
}
```

### 3. task_tool.ts 严格对齐

保持原始变量命名和逻辑：

- `sub_state` (snake_case)
- `agentCreator` 回调
- 完整的 tool description 文本
- Command 返回类型

## 文件结构

```
packages/standard-agent/src/middlewares/subagents/
├── types.ts           # SubAgentInfo, SubAgentsMiddlewareOptions
├── task_tool.ts       # create_task_tool (原始逻辑)
├── index.ts           # SubAgentsMiddleware 类
└── package-utils.ts   # getAgentListFromPackage
```

## 导出

`packages/standard-agent/src/middlewares/index.ts`:

```typescript
export * from './subagents/index.js';
```

## 应用层使用

`packages/agent/src/middlewares/subTasks.ts`:

```typescript
import { SubAgentsMiddleware, getAgentListFromPackage } from '@langgraph-js/standard-agent';

export async function createSubAgentsMiddleware(pkg: AgentPackage) {
    const agents = await getAgentListFromPackage(pkg);
    return new SubAgentsMiddleware({
        agents,
        stateSchema: CodeState,
        async createAgent(taskId, args, state) {
            return await createStandardAgentV2(args.subagent_id, pkg, state, {}, { parent_id: taskId });
        },
    });
}
```

## 适用场景

- 将应用层中间件迁移到通用库
- 解耦框架层和应用层依赖
- 保持向后兼容性

## 注意事项

- task_tool.ts 必须严格对齐原始实现（变量命名、逻辑结构）
- getAgentListFromPackage 提供类型安全的转换
- 测试验证：108 tests passed in standard-agent
