# Tool → Middleware 全量重构方案

## 背景

当前系统同时存在 `tool` 和 `middleware`
两个概念，造成 API 分散、配置冗余。本次重构目标是**完全去除 tool 概念**，将整个系统统一为 middleware 概念，tool 的注册和管理完全由各个 middleware 自己负责。

## 需求总结

- **范围**：全量重构，覆盖所有层级（standard-agent / agent-middlewares / agent / zen-code / zen-swarm）
- **AgentPackage**：保留，但删除所有 tool 相关方法
- **AgentSchema**：删除 `tools` 字段，只保留 `middlewares` 字段
- **MCP 流程**：保持不变
- **HITL 流程**：保持不变
- **创建 agent**：只传 `middlewares` 数组，不再有任何 tool 配置

## 核心变更对照表

| 变更点                 | 现状                                                       | 目标                                                 |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| AgentPackage           | 同时有 `tools` 和 `middlewares` Registry                   | 只保留 `middlewares` Registry，删除 `tools` Registry |
| AgentSchema            | 有 `tools` 字段 + `middleware` 字段                        | 只有 `middlewares` 字段（注意改为复数）              |
| StandardAgent          | `.tools` 属性 + `.middleware` 属性                         | 只有 `.middlewares` 属性                             |
| IStorage               | 有 `insertTool / getTool / getAllTools / ...`              | 删除全部 tool 相关方法                               |
| factory-v2.ts          | 先收集 tools[]，再 build middleware                        | 直接传 middlewares，tools 由 middleware 自己注入     |
| AgentConfig 数据库存储 | `tools: Record<id, bool>` + `middleware: Record<id, bool>` | 只有 `middlewares: Record<id, bool>`                 |

---

## 分层改动清单

### 1. `packages/standard-agent` — 框架层

#### `schemas.ts`

- 删除 `ToolSchema`、`ToolCustomParamsSchema`
- `AgentSchema` 删除 `tools` 字段
- `AgentSchema` 的 `middleware` 字段改名为 `middlewares`（统一使用复数）
- `AgentPackageSchema` 删除 `tools` 相关字段

```typescript
// 之前
export const AgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    system_prompt: PromptSchema.shape.id,
    tools: z.record(ToolSchema.shape.id, z.union([z.boolean(), ToolCustomParamsSchema])), // ← 删除
    middleware: z.record(MiddlewareSchema.shape.id, z.union([z.boolean(), MiddlewareCustomParamsSchema])),
    model: ModelSchema.shape.id,
});

// 之后
export const AgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    system_prompt: PromptSchema.shape.id,
    middlewares: z.record(MiddlewareSchema.shape.id, z.union([z.boolean(), MiddlewareCustomParamsSchema])),
    model: ModelSchema.shape.id,
});
```

#### `types.ts`

- 删除 `ToolImplementation` 接口

#### `registry.ts`

- 删除整个 `ToolRegistry` 类，只保留 `MiddlewareRegistry`

#### `agent.ts`（StandardAgent）

- 删除 `ToolConfig` 接口
- 删除 `.tools` getter
- 删除 `getToolConfig()` 方法
- `.middleware` getter 改名为 `.middlewares`

```typescript
// 之前
export class StandardAgent {
    get tools(): Record<string, ToolConfig> { ... }         // ← 删除
    get middleware(): Record<string, MiddlewareConfig> { ... }

    getToolConfig(toolId: string): ToolConfig | undefined { ... }  // ← 删除
}

// 之后
export class StandardAgent {
    get middlewares(): Record<string, MiddlewareConfig> { ... }
}
```

#### `repository.ts`（AgentRepository）

- 删除 `addTool / getTool / listTools / updateTool / deleteTool` 方法
- `getAgent()` 返回的数据中删除 tools 相关处理

#### `package.ts`（AgentPackage）

- 删除 `readonly tools = new ToolRegistry()`
- 删除代理属性/方法：`getTool`、`listTools`
- 删除 `addTool()` 方法
- 删除 `fromStorage()` 中 tool 相关加载逻辑（`storage.getAllTools()`）

```typescript
// 之前
export class AgentPackage {
    readonly tools = new ToolRegistry();      // ← 删除
    readonly middlewares = new MiddlewareRegistry();

    getTool!: AgentRepository['getTool'];     // ← 删除
    listTools!: AgentRepository['listTools']; // ← 删除

    async addTool(data: ...): Promise<void>   // ← 删除
}

// 之后
export class AgentPackage {
    readonly middlewares = new MiddlewareRegistry();
}
```

#### `storage/abstract.ts`（IStorage）

- 删除 `ToolRow`、`AgentToolRow` 类型定义
- 删除 `insertTool / getTool / getAllTools / updateTool / deleteTool` 接口方法
- `getAgent()` 和 `getAllAgents()` 返回类型中删除 `tools` 字段
- `AgentWithRelations` 删除 tools 相关

#### `validator.ts`（AgentValidator）

- 删除对 tool 的校验逻辑（检查 agent.tools 中每个 toolId 是否存在于 registry）

#### `serializer.ts`（AgentSerializer）

- 删除 tool 序列化/反序列化逻辑

---

### 2. `packages/agent-middlewares` — 具体实现层

`FilesystemMiddleware`、`TerminalMiddleware` 内部实现**保持不变**，它们已经自己管理 tool 注入。

只需确认不再对外 export 任何 `ToolImplementation` 类型数据。

---

### 3. `packages/agent` — 应用层

#### `subagents/factory-v2.ts`

删除 tool 收集循环，`createAgent()` 不再传 `tools` 参数：

```typescript
// 之前
const tools: DynamicStructuredTool[] = [];
for (const [toolId, params] of Object.entries(agentConfig.tools)) {
    const toolImpl = toolRegistry.getImplementation(toolId);
    // ... 包装成 LangChain tool
    tools.push(langChainTool);
}

return createAgent({
    model,
    systemPrompt,
    tools, // ← 删除
    middleware,
});

// 之后
// 直接构建 middleware 数组，不再有 tools 收集步骤
return createAgent({
    model,
    systemPrompt,
    middleware,
});
```

#### `subagents/loader.ts`（如有）

- 删除注册 tool 到 AgentPackage 的调用

---

### 4. Storage 实现层

#### `storage/memory.ts`（standard-agent）

- 删除 tool 内存表：`_tools: Map<string, ToolRow>`
- 删除所有 tool CRUD 实现方法

#### `storage/sqlite.ts`（zen-swarm）

- 删除 `tools` 表的建表 DDL
- 删除 `agent_tools` 关联表
- 删除对应 CRUD 方法实现
- 添加数据库 migration：删除旧表，清理 `agents` 表中的 tools 列

---

### 5. `zen-swarm` — Web UI 层

- tRPC router 中删除 tool 相关路由（如有）
- 前端组件中删除 tool 管理 UI（如有）
- Agent 编辑界面：删除 tool 勾选项，只保留 middleware 配置

---

### 6. `zen-code` — TUI 客户端

- 删除 tool 相关的 hooks（如 `useTools`）
- 删除 tool 相关的 query keys
- AgentPanel / TaskPanel 等组件中删除 tool 相关显示

---

## 重构后目标形态

### 创建 Agent

```typescript
// 完整调用链
const agent = await createStandardAgentV2('default', pkg, state, runtime);

// factory-v2.ts 内部逻辑（简化后）
const agentConfig = await pkg.getAgent(agentId);

const middleware: AgentMiddleware[] = [];
for (const [middlewareId, params] of Object.entries(agentConfig.middlewares)) {
    if (middlewareId === 'subagents' && isSubAgent) continue;
    const impl = pkg.middlewares.getImplementation(middlewareId);
    middleware.push(await impl.execute(params.customParams || {}));
}

// MCP、HITL、AnthropicCache 作为内置 middleware 追加
middleware.push(new MCPWithConfigMiddleware());
if (process.env.YOLO_MODE !== 'true') {
    middleware.push(humanInTheLoopMiddleware({ interruptOn }));
}
if (process.env.MODEL_PROVIDER === 'anthropic') {
    middleware.push(anthropicPromptCachingMiddleware());
}

return createAgent({ name, model, systemPrompt, middleware });
```

### AgentSchema（目标形态）

```typescript
const AgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    system_prompt: z.string(), // prompt id
    model: z.string(), // model id
    middlewares: z.record(
        z.string(), // middleware id
        z.union([z.boolean(), z.any()]), // enabled + customParams
    ),
});
```

### AgentPackage（目标形态）

```typescript
export class AgentPackage {
    readonly middlewares = new MiddlewareRegistry();

    // 保留
    getModel, getPrompt, getPromptWithContent, ...
    listModels, listPrompts, ...
    getMiddleware, listMiddlewares
    validateAgent, validateAll
    toJSON

    // 删除
    // tools = new ToolRegistry()
    // addTool(), getTool(), listTools()
}
```

---

## 迁移注意事项

1. **SQLite 数据库 migration**：需要脚本删除 `tools` 表、`agent_tools` 关联表，以及 agents 数据中的 tools 字段
2. **存量 agent 数据**：存量配置中的 `tools` 字段将被忽略，不再读取
3. **MCP 流程不变**：MCPMiddleware 内部 tool 注入逻辑不受影响，对外透明
4. **HITL 不变**：`humanInTheLoopMiddleware` 配置方式保持不变
5. **字段命名**：`middleware`（单数）统一改为 `middlewares`（复数），与 `tools` 删除同步进行

## 实施顺序建议

1. `packages/standard-agent` — 修改 schemas、删除 ToolRegistry、更新 IStorage 接口
2. `packages/standard-agent` — 更新 memory storage 实现
3. `packages/agent` — 更新 factory-v2.ts、loader.ts
4. `zen-swarm` — 更新 sqlite storage、tRPC router、前端组件
5. `zen-code` — 更新 hooks、query keys、UI 组件
6. 全量运行测试，修复类型错误
