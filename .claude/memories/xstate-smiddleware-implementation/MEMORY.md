---
name: xstate-smiddleware-implementation
description:
    基于 XState v5 的状态机中间件实现，提供 SQLite 持久化、状态转移、回滚、历史追踪等功能，与 LangGraph
    松耦合集成。适用于需要工作流管理、状态追踪、错误恢复的 AI Agent 场景。
tags:
    - xstate
    - state-machine
    - middleware
    - sqlite
    - langchain
category: architecture
created: 2025-01-13
last_updated: 2025-01-13
priority: high
context_scope: project
---

# ## 背景

## 背景

为 zen-swarm 项目实现基于 XState v5 的状态机中间件，提供独立的状态机管理能力，通过 Agent 工具与 LangChain
StateGraph 松耦合集成。

## 架构设计

**层级定位**: Agent 的 Middleware 层，与 AgentPackage 中间件同级
**耦合策略**: 松耦合 - 仅在执行工具时同步，XState 独立存储 **交互流程**: LangGraph → SMMiddleware 工具层 → SQLite →
XState 状态机实例

**标识系统**:

- `state_id`: 状态实例的唯一标识（如会话ID + 序号）
- `machine_id`: 状态机定义的唯一标识（如 workflow_name）

## 数据库设计

SQLite 三表结构（参见 `packages/agent/src/sm/schema.sql`）:

1. **state_machine_definitions**: 存储状态机定义（JSON 序列化）
2. **state_instances**: 存储运行时状态实例
3. **state_transitions**: 记录状态转移历史（支持回滚）

索引优化：machine_id、status、parent_state_id、timestamp

## 核心实现

### 1. StateMachineManager（状态机管理器）

文件：`packages/agent/src/sm/StateMachineManager.ts`

**功能**:

- 状态机定义的注册、获取、更新、删除
- 状态实例的创建、获取、删除
- 状态转移（transitionTo）
- 事件驱动转移（sendEvent）
- 状态回滚（rollbackToState）
- 转移历史查询（getTransitionHistory）
- 机器定义缓存（提升性能）

**关键方法**:

```typescript
// 创建状态实例
await manager.createStateInstance(stateId, machineId, initialContext, parentStateId);

// 转移到目标状态
await manager.transitionTo(stateId, machineId, targetState, eventPayload);

// 发送事件触发转移
await manager.sendEvent(stateId, machineId, eventName, eventPayload);

// 获取当前状态和可用转移
await manager.getState(stateId, machineId);

// 回滚到历史状态
await manager.rollbackToState(stateId, transitionId);
```

### 2. SMMiddleware（中间件实现）

文件：`packages/agent/src/sm/SMMiddleware.ts`

实现 AgentMiddleware 接口，提供 6 个高级工具：

- `transition_to`: 状态转移
- `get_state`: 获取当前状态
- `rollback_to_state`: 回滚到历史状态
- `create_state_instance`: 创建状态实例
- `send_event`: 发送事件
- `get_transition_history`: 获取转移历史

**使用示例**:

```typescript
import { SMMiddleware } from '@codegraph/agent/sm';

// 创建中间件
const smMiddleware = await SMMiddleware.create({
    dbPath: './state-machines.db',
    enableLogging: true,
});

// 注册状态机定义
await smMiddleware.stateMachineManager.registerMachineDefinition({
    id: 'order-workflow',
    name: 'Order Workflow',
    initial: 'pending',
    states: {
        pending: { on: { APPROVE: { target: 'approved' } } },
        approved: { on: { SHIP: { target: 'shipped' } } },
        shipped: {},
    },
});

// 在 Agent 中使用
const agent = createAgent({
    model,
    tools: [...smMiddleware.tools],
});
```

### 3. 类型定义

文件：`packages/agent/src/sm/types.ts`

完整的类型系统包括：

- 数据库行类型
- 状态机定义类型（StateMachineDefinition, StateNodeDefinition, TransitionDefinition）
- 状态实例类型（StateInstance, StateInstanceStatus）
- 工具输入/输出类型（使用 Zod 验证）
- 中间件配置（SMMiddlewareConfig）
- 错误类型（SMError, 7 种错误类型）

## 集成方式

**关键决策**: 中间件自动提供工具，不需要手动注册

删除了 `packages/agent/src/subagents/tools.ts` 中的 `registerSMTools` 和 `createToolRegistryWithSM`
函数。工具由 SMMiddleware 中间件自动提供，与其他中间件（filesystem, terminal）的行为一致。

## 错误处理

SMError 类支持 7 种错误类型：

- STATE_NOT_FOUND
- MACHINE_NOT_FOUND
- INVALID_TRANSITION
- TRANSITION_FAILED
- INVALID_STATE_ID
- INVALID_MACHINE_ID
- ROLLBACK_FAILED
- SERIALIZATION_ERROR
- DATABASE_ERROR

## 性能优化

1. **机器定义缓存**: StateMachineManager 内部使用 Map 缓存机器定义，减少数据库查询
2. **索引优化**: SQLite 表创建了必要的索引
3. **事务支持**: database.ts 提供事务方法

## 测试覆盖

共 50 个测试，全部通过：

- database.test.ts: 15 个测试（数据库操作）
- manager.test.ts: 19 个测试（状态机管理）
- integration.test.ts: 16 个测试（端到端集成）

## 适用场景

1. **工作流管理**: 订单处理、审批流程、CI/CD 流水线
2. **状态追踪**: 任务状态管理、多步骤操作
3. **错误恢复**: 支持回滚到任意历史状态
4. **审计追踪**: 完整的状态转移历史记录

## 设计原则

1. **松耦合**: XState 与 LangGraph 各自独立管理状态
2. **高级抽象**: Agent 使用高级工具，不直接操作 XState API
3. **可持久化**: 所有状态和转移历史存储在 SQLite
4. **可回滚**: 支持通过 transition_id 回滚到任意历史状态
