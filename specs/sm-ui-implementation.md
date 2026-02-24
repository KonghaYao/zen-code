# SMMiddleware UI Implementation Plan

## Status: 🚧 In Progress (Phase 1-4 Completed)

## Overview

为 SMMiddleware 构建独立的 Web UI 管理界面，提供状态机可视化展示和完整编辑能力。

## Requirements

| 项目     | 决策                            |
| -------- | ------------------------------- |
| 平台     | Web UI (zen-swarm)              |
| 路由     | `/sm` 独立页面                  |
| 可视化   | 树形结构展示状态机              |
| 编辑能力 | 完整编辑（添加/删除状态和转移） |
| 查看能力 | 查看状态实例、转移历史          |

## Features

### 1. 状态机定义管理

- **列表视图**: 显示所有状态机定义
- **树形可视化**: 以树形结构展示状态机层级
- **完整编辑**:
    - 添加/删除状态节点
    - 添加/删除转移（transitions）
    - 编辑状态属性（名称、类型、入口/出口动作）
    - 编辑转移属性（事件、目标、守卫条件）
    - 编辑初始状态和上下文

### 2. 状态实例监控

- 查看活跃的状态实例列表
- 查看实例当前状态、上下文
- 查看实例状态（active/completed/failed/paused）

### 3. 转移历史

- 查看状态实例的转移历史
- 支持回滚操作

## UI Design

### 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: State Machine Manager                                   │
├───────────────────┬─────────────────────────────────────────────┤
│                   │                                              │
│   Sidebar         │   Main Content                               │
│                   │                                              │
│   ┌─────────────┐ │   ┌─────────────────────────────────────────┐│
│   │ Definitions │ │   │                                         ││
│   │ ─────────── │ │   │         Tree View / Editor              ││
│   │ • workflow1 │ │   │                                         ││
│   │ • task-flow │ │   │                                         ││
│   │ • approval  │ │   │                                         ││
│   └─────────────┘ │   │                                         ││
│                   │   │                                         ││
│   ┌─────────────┐ │   │                                         ││
│   │ Instances   │ │   │                                         ││
│   │ ─────────── │ │   └─────────────────────────────────────────┘│
│   │ • task-001  │ │                                              │
│   │ • task-002  │ │                                              │
│   └─────────────┘ │                                              │
│                   │                                              │
└───────────────────┴─────────────────────────────────────────────┘
```

### 树形可视化示例

```
task-workflow
├── idle (initial)
│   └── START → in_progress
├── in_progress
│   ├── COMPLETE → completed
│   └── FAIL → failed
├── completed (final)
└── failed (final)
```

### 编辑器交互

- **添加状态**: 右键菜单 → "Add State" / 点击 "+" 按钮
- **删除状态**: 右键菜单 → "Delete State"
- **添加转移**: 选中状态 → "Add Transition" → 选择目标状态
- **编辑属性**: 选中节点 → 右侧属性面板

## Tech Stack

| 技术            | 用途     |
| --------------- | -------- |
| React           | UI 框架  |
| Zustand         | 状态管理 |
| tRPC            | API 调用 |
| Tailwind CSS    | 样式     |
| lucide-react    | 图标     |
| Arborist (可选) | 树形组件 |

## API Requirements

需要为 UI 添加的 tRPC 路由：

```typescript
// 状态机定义
sm.listDefinitions: () => StateMachineDefinition[]
sm.getDefinition: (machine_id: string) => StateMachineDefinition
sm.createDefinition: (definition: StateMachineDefinition) => void
sm.updateDefinition: (machine_id: string, definition: StateMachineDefinition) => void
sm.deleteDefinition: (machine_id: string) => void

// 状态实例
sm.listInstances: (machine_id?: string) => StateInstance[]
sm.getInstance: (state_id: string) => StateInstance
sm.deleteInstance: (state_id: string) => void

// 转移历史
sm.getHistory: (state_id: string, limit?: number) => TransitionHistory

// 操作
sm.transitionTo: (params) => TransitionResult
sm.rollback: (state_id: string, transition_id: number) => RollbackResult
sm.sendEvent: (params) => SendEventResult
```

## Implementation Plan

### Phase 1: 基础设施

**完成**:

- [x] 创建 `/sm` 路由页面
- [x] 创建 tRPC router for SM
- [x] 创建 Zustand store for UI state
- [x] 实现侧边栏布局（Definitions + Instances）

**输出**:

- `zen-swarm/src/frontend/views/SM/SMView.tsx`
- `zen-swarm/src/api/sm.ts`
- `zen-swarm/src/frontend/stores/smStore.ts`

### Phase 2: 状态机定义管理

**完成**:

- [x] 实现定义列表组件
- [x] 实现树形可视化组件
- [x] 实现属性编辑面板
- [x] 实现添加/删除状态功能（UI 框架）
- [x] 实现添加/删除转移功能（UI 框架）

**输出**:

- `zen-swarm/src/frontend/views/SM/components/DefinitionList.tsx`
- `zen-swarm/src/frontend/views/SM/components/StateMachineEditor.tsx`
- `zen-swarm/src/frontend/views/SM/components/TreeView.tsx`
- `zen-swarm/src/frontend/views/SM/components/PropertyEditor.tsx`

### Phase 3: 状态实例监控

**完成**:

- [x] 实现实例列表组件
- [x] 实现实例详情面板
- [x] 实现实例状态显示
- [x] 实现手动触发转移功能（UI 框架）

**输出**:

- `zen-swarm/src/frontend/views/SM/components/InstanceList.tsx`
- `zen-swarm/src/frontend/views/SM/components/InstanceDetail.tsx`

### Phase 4: 转移历史与回滚

**完成**:

- [x] 实现历史时间线组件
- [x] 实现回滚操作（UI 框架）
- [x] 添加操作确认（UI 框架）

**输出**:

- `zen-swarm/src/frontend/views/SM/components/HistoryTimeline.tsx`

### Phase 5: 完善与优化

**任务**:

- [ ] 连接真实 tRPC API（替换 mock 数据）
- [ ] 添加加载状态优化
- [ ] 添加错误处理
- [ ] 添加空状态提示
- [ ] 性能优化
- [ ] 响应式适配

## File Structure

```
zen-swarm/src/
├── frontend/
│   ├── views/
│   │   └── SM/
│   │       ├── index.ts                 # 模块导出
│   │       ├── SMView.tsx               # 主页面组件
│   │       └── components/
│   │           ├── DefinitionList.tsx   # 定义列表
│   │           ├── StateMachineEditor.tsx # 编辑器主组件
│   │           ├── TreeView.tsx         # 树形可视化
│   │           ├── PropertyEditor.tsx   # 属性编辑器
│   │           ├── InstanceList.tsx     # 实例列表
│   │           ├── InstanceDetail.tsx   # 实例详情
│   │           └── HistoryTimeline.tsx  # 历史时间线
│   ├── stores/
│   │   └── smStore.ts                   # UI 状态管理
│   └── components/
│       └── app-registry/
│           ├── registry.ts              # 注册 SM 应用
│           └── types.ts                 # 添加 'sm' 到 AppId
├── api/
│   ├── index.ts                         # 导出 createSMRouter
│   └── sm.ts                            # tRPC 路由
└── middlewares/
    └── sm/
        ├── database.ts                  # 添加 getAllStateInstances
        └── ...                          # 其他现有文件
```

## Risks & Challenges

1. **复杂状态编辑**: 状态机定义结构复杂，需要良好的 UX 设计
2. **实时同步**: 多用户编辑同一状态机定义的冲突处理
3. **性能**: 大型状态机的渲染性能

## Success Criteria

- [ ] 可以查看所有状态机定义
- [ ] 可以创建/编辑/删除状态机定义
- [ ] 可以查看状态实例列表和详情
- [ ] 可以手动触发状态转移
- [ ] 可以查看转移历史并执行回滚
- [ ] UI 响应流畅，无明显卡顿
