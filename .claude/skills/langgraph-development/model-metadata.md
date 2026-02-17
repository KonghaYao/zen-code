# Model Metadata in LangChain Models

## Overview

`metadata` 参数在 LangChain 模型中用于附加自定义数据到模型实例，用于追踪代理调用链。它基于 LangChain 的
`BaseLangChainParams` 接口，所有模型类都支持。

## LangChain 基础架构

### BaseLangChainParams 接口

LangChain 的所有模型类都继承自 `BaseLangChain`，支持 `metadata` 字段：

```typescript
// node_modules/@langchain/core/dist/language_models/base.d.ts
interface BaseLangChainParams {
    verbose?: boolean;
    callbacks?: Callbacks;
    tags?: string[];
    metadata?: Record<string, unknown>; // ← 支持自定义元数据
}

interface BaseLanguageModelParams extends AsyncCallerParams, BaseLangChainParams {
    // 模型参数继承此接口，自动包含 metadata 支持
}
```

### ToolCall ID 自动生成

LangChain 在每次工具调用时自动生成唯一的 `toolCall.id`：

```typescript
// ToolRuntime 接口定义
interface ToolRuntime<TState, TContext> {
    toolCall: {
        id: string; // ← LangChain 自动生成的 UUID
    };
    state: TState;
    runtime: Runtime<TContext>;
}
```

## 基本用法

```typescript
const model = new ChatOpenAI({
    model: 'gpt-4',
    metadata: {
        parent_id: 'task-123', // 父任务 ID（子代理才有值）
    },
});
```

## Code-Graph 实现

### 1. 从 LangChain ToolCall 获取 ID

```typescript
// packages/agent/src/tools/task_tools/create_task_tool.ts:38
tool(
    async (args, config: ToolRuntime<typeof SubAgentStateSchema, any>) => {
        const state = config.state;
        // 优先使用传入的 task_id，否则使用 LangChain 自动生成的 toolCall.id
        const taskId: string = args.task_id || config.toolCall!.id!;
        //                                           ^^^^^^^^^^^^^^^^^^
        //                                           ← 从 LangChain ToolRuntime 获取
        // ... 创建子代理
    },
    { schema },
);
```

### 2. SubAgent Middleware 传递 parent_id

```typescript
// packages/agent/src/middlewares/subTasks.ts
this.tools.push(
    create_task_tool(async (taskId, args, state) => {
        return await createStandardAgentV2(
            args.subagent_id,
            pkg,
            state,
            {},
            { parent_id: taskId }, // 将 taskId 作为 parent_id 传递
        );
    }),
);
```

### 3. Agent Factory 设置 metadata

```typescript
// packages/agent/src/subagents/factory-v2.ts
const model = await initChatModel(state.model_id, {
    modelProvider: state.provider_id,
    metadata: {
        parent_id: options?.parent_id, // 设置到模型 metadata
    },
});
```

### 4. initChatModel 传递给底层模型

```typescript
// packages/agent/src/utils/initChatModel.ts
export const initChatModel = async (modelId: string, options: InitChatModelOptions = {}) => {
    const { modelProvider, metadata, enableThinking = true } = options;

    if (modelProvider === 'anthropic') {
        model = new ChatAnthropic({
            model: modelId,
            metadata: options.metadata, // ← ChatAnthropic 支持 metadata
            // ... 其他参数
        });
    } else {
        model = new ChatOpenAI({
            model: modelId,
            metadata: options.metadata, // ← ChatOpenAI 支持 metadata
            // ... 其他参数
        });
    }

    return model;
};
```

## 完整数据流

```
1. LangChain 生成 ToolCall ID
   ┌─────────────────────────────────────────┐
   │ LangChain Tool Runtime                    │
   │ toolCall.id = "auto-generated-uuid"       │
   └─────────────────────────────────────────┘
                    ↓
2. create_task_tool 获取 ID
   ┌─────────────────────────────────────────┐
   │ create_task_tool                         │
   │ taskId = args.task_id || toolCall.id     │
   └─────────────────────────────────────────┘
                    ↓
3. SubAgentsMiddleware 传递
   ┌─────────────────────────────────────────┐
   │ createStandardAgentV2(..., { parent_id })│
   │ parent_id = taskId                       │
   └─────────────────────────────────────────┘
                    ↓
4. initChatModel 设置 metadata
   ┌─────────────────────────────────────────┐
   │ new ChatAnthropic/OpenAI({              │
   │   metadata: { parent_id }              │
   │ })                                       │
   └─────────────────────────────────────────┘
                    ↓
5. Middleware 访问
   ┌─────────────────────────────────────────┐
   │ wrapModelCall(request, handler)         │
   │ request.model.metadata.parent_id        │
   └─────────────────────────────────────────┘
```

## 架构层次

```
┌─────────────────────────────────────────────────────┐
│ LangChain Core                                      │
│                                                     │
│ BaseLangChainParams                                │
│   └─ metadata: Record<string, unknown>              │
│                                                     │
│ ToolRuntime<TState, TContext>                       │
│   └─ toolCall: { id: string }                      │
│       (自动生成 UUID)                               │
└─────────────────────────────────────────────────────┘
                    ↓ extends
┌─────────────────────────────────────────────────────┐
│ LangChain Models                                    │
│                                                     │
│ ChatAnthropic / ChatOpenAI                          │
│   └─ 继承 BaseLangChain                             │
│   └─ 支持 metadata 构造参数                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ Code-Graph Middleware                               │
│                                                     │
│ wrapModelCall(request: ModelRequest, handler)      │
│   request.model: LanguageModelLike                  │
│     └─ metadata: { parent_id: string }             │
└─────────────────────────────────────────────────────┘
```

## 使用场景

### 1. 判断是否为子代理

```typescript
const isSubAgent = !!model.metadata?.parent_id;
```

### 2. 调试日志

```typescript
async wrapModelCall(request, handler) {
    if (request.model.metadata?.parent_id) {
        console.log(`[SubAgent] Parent: ${request.model.metadata.parent_id}`);
    }
    return await handler(request);
}
```

### 3. 成本归属

```typescript
// 按父任务统计成本
stats.filter((s) => s.parent_id === 'task-123');
```

### 4. 调用链构建

```typescript
const callTree = {
    taskId: 'task-123',
    agent: 'default',
    metadata: { parent_id: undefined },
    subcalls: [
        {
            taskId: 'task-124',
            agent: 'research',
            metadata: { parent_id: 'task-123' },
        },
    ],
};
```

## 扩展字段

```typescript
metadata: {
    parent_id: string,      // 父任务 ID
    agent_id: string,       // 当前代理 ID
    thread_id: string,      // 会话 ID
    trace_id: string,       // 分布式追踪 ID
}
```

## 字段说明

| 字段        | 类型                  | 说明                          |
| ----------- | --------------------- | ----------------------------- |
| `parent_id` | `string \| undefined` | 父任务 ID，主代理为 undefined |
| `agent_id`  | `string`              | 当前代理 ID                   |
| `thread_id` | `string`              | 会话/线程 ID                  |
| `trace_id`  | `string`              | 分布式追踪 ID                 |

## 关键点

- **parent_id** 是核心字段，用于区分主代理和子代理调用
- **toolCall.id** 由 LangChain 自动生成，无需手动管理
- 子代理通过 task tool 传入 `taskId`（即 `toolCall.id`）作为 `parent_id`
- metadata 在 middleware 中可访问，用于日志、监控、成本统计
- 所有 LangChain 模型类（ChatOpenAI、ChatAnthropic 等）都支持 metadata 参数
