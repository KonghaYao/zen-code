# Subagents 设计文档

> **状态**: ✅ 已完成（实现与本文档一致） **最后验证**: 2026-03-06

## 1. 概述

### 1.1 目标

基于 LangGraph `switchBranch` 的 subagents 系统，允许：

- 后端通过分支选择不同的 agent 执行路径
- 前端通过参数控制使用的 agent
- 与 SubAgentsMiddleware 插件系统独立运行

### 1.2 与现有系统的区别

| 维度       | SubAgentsMiddleware            | SwitchBranch Subagents  |
| ---------- | ------------------------------ | ----------------------- |
| 实现方式   | Tool 调用 + Middleware 注入    | LangGraph switchBranch  |
| 触发机制   | AI 决定调用 ask_subagents tool | 前端参数控制 + 状态驱动 |
| 状态管理   | task_store 存储子任务状态      | 共享主状态，分支执行    |
| 使用场景   | AI 自主委托专门任务            | 用户明确切换 agent 模式 |
| 上下文隔离 | 完全隔离的子状态               | 共享历史记录            |

### 1.3 设计原则

- **状态驱动**：通过 `switch_command` 字段控制分支选择
- **AgentPackage 驱动**：所有 agent 配置由 `AgentPackage` 管理，非硬编码
- **类型安全**：TypeScript 严格模式，明确 agent 配置 schema

---

## 2. 状态设计

使用现有的 `switch_command` 字段控制 agent 切换。

**可用的 switch_command 值**（`packages/agent/src/state.ts`）：

- `''`（空字符串）/ `'default'` - 默认：Jarvis，完整能力代码助手（`agents/default`）
- `'agents/manager'` - 任务管理员（`agents/manager`）
- `'smart_memory'` - 智能记忆（内置特殊分支）

---

## 3. 后端实现

### 3.1 Agent 配置系统

**当前架构**（已从硬编码 `AgentConfig` 迁移到 `AgentPackage`）：

```
packages/agent/src/subagents/
├── loader.ts          # 加载默认配置到 AgentPackage（MemoryStorage）
├── tools.ts           # 注册工具到 pkg.tools registry
├── middlewares.ts     # 注册中间件到 pkg.middlewares registry
├── config.ts          # loadAgentsList() 从 AgentPackage 读取 FEAgentConfig
└── factory-v2.ts      # createStandardAgentV2() 工厂函数
```

**`loader.ts` 中注册的 Agent**（`packages/agent/src/subagents/loader.ts`）：

```typescript
// agents/default - Jarvis 代码实现助手
await pkg.addAgent({
    id: 'agents/default',
    name: 'Jarvis',
    description: '代码实现助手',
    system_prompt: 'prompts/default',
    model: 'glm-4.7',
    tools: {
        ask_user_questions: true,
        todo_write: true,
    },
    middleware: {
        filesystem: true,
        terminal: true,
        agents_md: true,
        skills: true,
        memories: true,
        subagents: true,
    },
});

// agents/manager - 任务管理员
await pkg.addAgent({
    id: 'agents/manager',
    name: 'Manager',
    description: '任务管理员',
    system_prompt: 'prompts/manager',
    model: 'glm-4.7',
    tools: { ask_user_questions: true, todo_write: true },
    middleware: {
        filesystem: true,
        terminal: true,
        agents_md: true,
        skills: true,
        memories: true,
        subagents: true,
    },
});
```

**注意**：`config.ts` 的 `loadAgentsList()` 需要传入 `AgentPackage` 实例（非原设计的零参数调用）。

### 3.2 Agent 工厂（factory-v2.ts）

```typescript
// packages/agent/src/subagents/factory-v2.ts

export async function createStandardAgentV2(
    agentId: string,
    pkg: AgentPackage,
    state: CodeStateType,
    runtime: Runtime,
    options?: { parent_id?: string },
): Promise<ReactAgent>;
```

**工厂流程**：

1. 从 `pkg.getAgent(agentId)` 加载 agent 配置
2. 从 `pkg.validateAgent(agentId)` 验证配置
3. 使用 `state.model_id` 和 `state.provider_type` 初始化模型
4. 从 `pkg.tools` registry 加载工具
5. 从 `pkg.middlewares` registry 加载中间件
6. 始终追加 `MCPWithConfigMiddleware`（MCP 工具）
7. 追加 `humanInTheLoopMiddleware`（YOLO_MODE 控制 terminal 审批）
8. 追加 `anthropicPromptCachingMiddleware`（Anthropic 时启用）
9. 加载 `prompts/xxx` 的内容作为系统提示词

**isSubAgent 逻辑**：

- `options.parent_id` 存在 → 为子代理
- 子代理跳过 `subagents` 中间件（避免无限递归）

### 3.3 Graph 节点（graphBuilder.ts）

```typescript
// packages/agent/src/graphBuilder.ts

export function createCodeGraph() {
    return new StateGraph(CodeState)
        .addNode('graph', async (state, runtime) => {
            const { switch_command: cmd } = state;

            // 特殊分支
            if (cmd === 'smart_memory') return switchBranch.smart_memory(state);

            // 从 agentPackage 单例加载
            const pkg = agentPackage;
            const availableAgents = await getAvailableAgentIds(pkg);

            // 路由逻辑：'default' 或空字符串 → 'agents/default'
            const agentId = (cmd === 'default' ? 'agents/default' : cmd) || 'agents/default';

            if (!availableAgents.includes(agentId)) {
                throw new Error(`Unknown agent: ${cmd}. Available: ${availableAgents.join(', ')}`);
            }
            return invokeAgent(agentId, pkg, state, runtime);
        })
        .addEdge(START, 'graph')
        .compile();
}
```

**注意**：`summarization` 分支已从 graphBuilder 中移除（原文档有误）。

---

## 4. 前端实现

### 4.1 AgentPanel 组件

**文件**: `zen-code/src/chat/components/panels/AgentPanel.tsx`

```typescript
// 当前 agent 从 config.switch_command 读取
const currentAgentId = config?.switch_command || 'default';

// 切换时写入 config
const switchCommand = agentId === 'default' ? '' : agentId;
await updateConfig({ switch_command: switchCommand });
```

### 4.2 zen-swarm 端

**文件**: `zen-swarm/src/frontend/views/ChatView.tsx`

zen-swarm 通过 `selectedAgentId` 状态管理当前 agent，在 `sendMessage` 时通过 `extraParams` 传递：

```typescript
await sendMessage([...], {
    extraParams: {
        agent_id: selectedAgentId,
        cwd: rootPath,
    },
});
```

**注意**：zen-swarm 使用 `agent_id` 字段（SwarmState），zen-code 使用 `switch_command`（CodeState），两者不同。

---

## 5. 配置系统

### 5.1 配置层次

1. **代码配置**（`packages/agent/src/subagents/loader.ts`）：
    - 内置 agents（`agents/default`、`agents/manager`）
    - 存储在 MemoryStorage（运行时，非持久化）

2. **用户配置**（`~/.zen-code/settings.json`）：
    - `switch_command`：当前选中的 agent（zen-code 端）

3. **运行时状态**（`CodeState.switch_command`）：
    - 从前端 extraParams 传入，路由时读取

### 5.2 Agent 列表 API

```typescript
// config.ts
export async function loadAgentsList(pkg: AgentPackage): Promise<Record<string, FEAgentConfig>>;
export function getDefaultAgentId(): string; // returns 'default'

// factory-v2.ts
export async function getAvailableAgentIds(pkg: AgentPackage): Promise<string[]>;
```

---

## 6. 使用场景

| Agent       | ID               | 工具                           | 中间件                           | 适用场景     |
| ----------- | ---------------- | ------------------------------ | -------------------------------- | ------------ |
| **Jarvis**  | `agents/default` | ask_user_questions, todo_write | filesystem, terminal, 全部中间件 | 通用代码助手 |
| **Manager** | `agents/manager` | ask_user_questions, todo_write | filesystem, terminal, 全部中间件 | 任务管理     |

**注意**：两个内置 agent 配置相同，差异在系统提示词（`prompts/default` vs `prompts/manager`）。

---

## 7. 文件路径

```
packages/agent/src/
├── config/
│   └── index.ts               # agentPackage 单例（top-level await 初始化）
├── subagents/
│   ├── loader.ts              # 注册内置 agents/tools/middlewares 到 AgentPackage
│   ├── tools.ts               # 工具 registry 注册
│   ├── middlewares.ts         # 中间件 registry 注册
│   ├── config.ts              # loadAgentsList(), getDefaultAgentId()
│   └── factory-v2.ts         # createStandardAgentV2(), getAvailableAgentIds()
├── graphBuilder.ts            # createCodeGraph() - switch_command 路由
└── state.ts                   # CodeState - switch_command 字段
```

---

## 附录：术语表

- **AgentPackage**: `@langgraph-js/standard-agent` 提供的配置管理中心
- **MemoryStorage**: 内存存储，运行时非持久化
- **switch_command**: CodeState 字段，控制路由到哪个 agent
- **agent_id**: SwarmState 字段（zen-swarm），与 switch_command 对应但不同
- **isSubAgent**: `options.parent_id` 存在时为真，跳过 subagents 中间件
- **MCPWithConfigMiddleware**: 替代原 MCPMiddleware，从配置加载 MCP 服务器
