# SMMiddleware Implementation

基于 XState 的状态机中间件，用于 zen-swarm 项目

## Status: ✅ Completed

## Overview

在 zen-swarm 项目中实现一个基于 XState 的 SMMiddleware（状态机中间件），提供独立的状态机管理能力，通过 Agent 工具与 LangChain
StateGraph 松耦合集成。

## Architecture

### 架构定位

- **层级**: Agent 的 Middleware 层，与 AgentPackage 中间件同级
- **定位**: 纯粹的流程设计，与 agent 逻辑解耦
- **耦合策略**: 松耦合 - 仅在执行工具时同步，XState 独立存储

### 交互流程

```
LangGraph StateGraph
    ↓ (执行工具，携带 xstate id)
SMMiddleware 工具层
    ↓ (通过 state_id + machine_id)
SQLite 存储层
    ↓ (取出/修改/存入状态)
XState 状态机实例
```

**关键流程**:

1. LangGraph 执行 tool 时携带 `xstate_id`
2. 通过 `state_id` 和 `machine_id` 唯一标识状态机和状态
3. 从 SQLite 取出状态 → 执行状态转移 → 存回 SQLite
4. 返回新状态给 Agent

### 状态机管理

- **生命周期**: 每个会话独立创建多个状态机
- **标识系统**:
    - `state_id`: 状态实例的唯一标识（如会话ID + 序号）
    - `machine_id`: 状态机定义的唯一标识（如 workflow_name）
    - 通过组合 `(state_id, machine_id)` 精确定位状态

## Database Schema

### SQLite 表设计

```sql
-- 状态机定义表
CREATE TABLE state_machine_definitions (
  machine_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,  -- JSON 序列化的状态机定义
  metadata TEXT,             -- JSON 序列化的元数据
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 状态实例表
CREATE TABLE state_instances (
  state_id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  current_state TEXT NOT NULL,
  context TEXT,           -- JSON 序列化的上下文数据
  status TEXT NOT NULL,   -- active | completed | failed | paused
  parent_state_id TEXT,   -- 支持嵌套状态机
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (machine_id) REFERENCES state_machine_definitions(machine_id)
);

-- 状态转移历史表
CREATE TABLE state_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_payload TEXT,     -- JSON 序列化的事件数据
  context_before TEXT,    -- 转移前的上下文快照
  context_after TEXT,     -- 转移后的上下文快照
  error TEXT,             -- 错误信息（如果失败）
  timestamp TEXT NOT NULL,
  FOREIGN KEY (state_id) REFERENCES state_instances(state_id)
);
```

## Agent Tools

### 统一命令工具

所有状态机操作通过单个 `sm_command` 工具执行，使用 `command` 参数区分操作类型：

```typescript
// 统一工具接口
{
  name: 'sm_command',
  input: {
    command: 'transition_to' | 'get_state' | 'rollback_to_state' |
             'create_state_instance' | 'send_event' | 'get_transition_history',

    // 通用参数
    state_id?: string,
    machine_id?: string,

    // 命令特定参数
    target_state?: string,      // transition_to
    transition_id?: number,     // rollback_to_state
    initial_context?: object,   // create_state_instance
    parent_state_id?: string,   // create_state_instance
    event_name?: string,        // send_event
    event_payload?: object,     // transition_to, send_event
    limit?: number,             // get_transition_history
    before_transition_id?: number  // get_transition_history
  }
}
```

### 支持的命令

| 命令                     | 描述             | 必需参数                                 |
| ------------------------ | ---------------- | ---------------------------------------- |
| `transition_to`          | 转移到目标状态   | `state_id`, `machine_id`, `target_state` |
| `get_state`              | 获取当前状态     | `state_id`, `machine_id`                 |
| `rollback_to_state`      | 回滚到历史状态   | `state_id`, `transition_id`              |
| `create_state_instance`  | 创建状态实例     | `state_id`, `machine_id`                 |
| `send_event`             | 发送事件触发转移 | `state_id`, `machine_id`, `event_name`   |
| `get_transition_history` | 获取转移历史     | `state_id`                               |

## Error Handling & Recovery

### 状态回滚

- 支持撤销到历史状态（通过 `state_transitions` 表）
- 工具：`sm_command({ command: 'rollback_to_state', state_id, transition_id })`
- 记录上下文快照，支持精确恢复

### 错误捕获

- 记录状态转移失败事件
- 存储错误上下文和堆栈信息
- 状态实例支持 `failed` 状态

## Implementation Status

### ✅ Phase 1: 数据层（SQLite）

**完成**:

- [x] 创建数据库连接管理器
- [x] 实现三个表的创建和迁移
- [x] 实现 CRUD 操作接口
- [x] 添加索引优化查询性能
- [x] 编写单元测试

**输出**:

- `zen-swarm/src/middlewares/sm/database.ts` - 数据库操作类
- `zen-swarm/src/middlewares/sm/schema.sql` - 表结构定义

### ✅ Phase 2: XState 集成层

**完成**:

- [x] 设计状态机序列化/反序列化策略
- [x] 实现 StateMachineManager 类
- [x] 实现状态机实例的创建、恢复、持久化
- [x] 实现状态转移逻辑
- [x] 添加类型定义

**输出**:

- `zen-swarm/src/middlewares/sm/StateMachineManager.ts` - 状态机管理器
- `zen-swarm/src/middlewares/sm/types.ts` - 类型定义

### ✅ Phase 3: Agent 工具层

**完成**:

- [x] 实现统一命令工具：sm_command
- [x] 支持 6 种命令操作
- [x] 注册到 AgentPackage
- [x] 添加工具输入验证（Zod Schema）

**输出**:

- `zen-swarm/src/middlewares/sm/tools/smCommand.ts` - 统一命令工具
- `zen-swarm/src/middlewares/sm/tools/index.ts` - 工具导出

### ✅ Phase 4: SMMiddleware 实现

**完成**:

- [x] 创建 SMMiddleware 类
- [x] 集成 StateMachineManager 和数据库层
- [x] 实现 AgentMiddleware 接口
- [x] 添加中间件配置选项
- [x] 注册到 AgentPackage

**输出**:

- `zen-swarm/src/middlewares/sm/SMMiddleware.ts` - 中间件实现
- `zen-swarm/src/middlewares/sm/index.ts` - 模块导出

### ✅ Phase 5: StateGraph 集成

**完成**:

- [x] 确定与 StateGraph 的集成点
- [x] 实现 xstate_id 传递机制
- [x] 更新 Agent 配置以包含 SMMiddleware
- [x] 测试端到端流程

### ✅ Phase 6: 错误处理和优化

**完成**:

- [x] 实现完整的错误处理逻辑
- [x] 添加日志记录
- [x] 性能优化（缓存、批量操作）
- [x] 并发控制（避免竞态条件）
- [x] 完善文档和示例

## File Structure

```
zen-swarm/src/middlewares/sm/
├── index.ts                    # 模块导出
├── SMMiddleware.ts             # 中间件主类
├── StateMachineManager.ts      # 状态机管理器
├── types.ts                    # 类型定义
├── database.ts                 # SQLite 数据库操作
├── schema.sql                  # 数据库表结构
└── tools/
    ├── index.ts                # 工具导出
    └── smCommand.ts            # 统一命令工具
```

## Feature Scope

### ✅ 已实现功能

1. 基础 XState 集成（创建、启动、发送事件）
2. SQLite 持久化（保存和加载状态机）
3. Agent 工具集成（统一 sm_command 工具）
4. StateGraph 集成（与 LangChain 状态同步）
5. API 和类型定义（中间件接口）
6. 状态回滚和错误恢复
7. 转移历史记录和查询
8. 嵌套状态机支持（parent_state_id）
9. 状态机定义缓存

### 🚧 可视化预留（暂不实现）

数据结构已支持未来实现：

- **状态机图形可视化**：节点和边的元数据存储在 definition JSON 中
- **实时状态监控**：通过 `state_instances.current_state` 支持
- **交互式状态机编辑器**：版本控制预留（可扩展 metadata）
- **执行历史时间线**：通过 `state_transitions` 表完整支持

## Tech Stack

- **XState**: 状态机核心库（v5）
- **SQLite**: 持久化存储（better-sqlite3）
- **TypeScript**: 类型安全
- **LangChain**: StateGraph 集成
- **Zod**: 输入验证

## Key Design Decisions

### 决策 1: 为什么使用松耦合？

- XState 和 StateGraph 各自独立管理状态
- 仅在工具执行时通过 `state_id` 和 `machine_id` 进行同步
- 避免复杂的双向同步逻辑，降低耦合度
- 提高系统的可维护性和可测试性

### 决策 2: 为什么使用统一命令工具？

- 单一工具简化 Agent 调用逻辑
- 统一的输入验证和错误处理
- 便于添加新命令而不增加工具数量
- 减少 Agent 的认知负担

### 决策 3: 为什么记录执行历史？

- 支持状态回滚和错误恢复
- 为未来可视化和调试提供数据基础
- 支持审计和日志追踪
- 便于分析状态机的行为模式

### 决策 4: 为什么使用 JSON 序列化？

- 状态机定义包含复杂结构，JSON 提供灵活性
- 支持元数据和自定义字段扩展
- 便于调试和可视化
- 与 SQLite 的 TEXT 类型兼容性好

## Usage Example

```typescript
import { createSMCommandTool } from './tools/smCommand.js';
import { StateMachineManager } from './StateMachineManager.js';

// 创建管理器
const manager = new StateMachineManager({ dbPath: './state-machines.db' });

// 创建工具
const smTool = createSMCommandTool(manager);

// 创建状态实例
await smTool.invoke({
    command: 'create_state_instance',
    state_id: 'task-001',
    machine_id: 'task-workflow',
    initial_context: { assignee: 'user-1' },
});

// 转移状态
await smTool.invoke({
    command: 'transition_to',
    state_id: 'task-001',
    machine_id: 'task-workflow',
    target_state: 'in_progress',
    event_payload: { started_at: new Date().toISOString() },
});

// 获取历史
await smTool.invoke({
    command: 'get_transition_history',
    state_id: 'task-001',
    limit: 10,
});

// 回滚
await smTool.invoke({
    command: 'rollback_to_state',
    state_id: 'task-001',
    transition_id: 1,
});
```

## Future Extensions

1. **可视化实现**: 基于预留的数据结构实现状态机图形化编辑器
2. **分布式状态机**: 支持跨多个进程的状态机同步
3. **状态机模板库**: 预定义常用状态机模板
4. **监控和告警**: 状态转移异常时的自动告警
5. **状态机测试**: 模型驱动的状态机测试工具

## References

- XState 官方文档: https://stately.ai/docs/xstate
- LangChain StateGraph 文档
- zen-swarm 项目架构文档
- Memory: `.claude/memories/xstate-smiddleware-implementation/MEMORY.md`
