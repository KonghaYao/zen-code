# Zen Swarm

基于 LangGraph 的简化多 Agent 协作后端服务器

## 特性

- **标准架构**: 使用 `@langgraph-js/standard-agent` 和 `AgentPackage`
- **LangGraph 集成**: 完整的 LangGraph 生态系统支持
- **流式响应**: 通过 `@langgraph-js/pure-graph` 自动提供
- **多 Provider**: 支持 OpenAI 和 Anthropic
- **配置驱动**: 使用 AgentPackage 管理配置

## 开发

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 构建
bun run build

# 启动生产服务
bun run start
```

## API

服务器启动后，LangGraph HTTP API 自动在 `/api/langgraph` 端点可用。

### 健康检查

```bash
GET http://127.0.0.1:8124/health
```

### 调用 Graph（invoke）

```bash
POST http://127.0.0.1:8124/api/langgraph/swarm/invoke
Content-Type: application/json

{
  "input": {
    "messages": [{"role": "user", "content": "Hello"}]
  }
}
```

### 流式调用（stream）

```bash
POST http://127.0.0.1:8124/api/langgraph/swarm/stream
Content-Type: application/json

{
  "input": {
    "messages": [{"role": "user", "content": "Hello"}]
  }
}
```

## 架构

```
zen-swarm/
├── src/
│   ├── config/
│   │   └── loader.ts          # AgentPackage 配置加载
│   ├── agents/
│   │   └── factory.ts         # Agent 创建工厂
│   ├── state.ts               # LangGraph 状态定义
│   ├── graphBuilder.ts        # Graph 构建
│   ├── server.ts              # Hono 服务器
│   ├── utils/
│   │   └── initChatModel.ts   # 模型初始化
│   └── index.ts
```

## 核心组件

### State (state.ts)

- 使用 `createState(MessagesAnnotation).build()`
- 支持消息、agent 配置、协作状态

### Config Loader (config/loader.ts)

- 使用 `AgentPackage` + `MemoryStorage`
- 管理模型、提示词、工具、中间件配置

### Agent Factory (agents/factory.ts)

- `createSwarmAgent()` - 从配置创建 agent
- 支持动态工具和中间件加载

### Graph Builder (graphBuilder.ts)

- 使用 `StateGraph` 构建协作图
- 支持多 agent 路由

### Server (server.ts)

- 使用 `@langgraph-js/pure-graph` 的 `registerGraph()`
- 自动提供 HTTP API + SSE 流式支持

## 与 @codegraph/agent 的区别

| 特性     | @codegraph/agent | zen-swarm |
| -------- | ---------------- | --------- |
| MCP 支持 | ✅               | ❌        |
| HITL     | ✅               | ❌        |
| 记忆系统 | ✅               | ❌        |
| 技能系统 | ✅               | ❌        |
| 复杂度   | 完整功能         | 简化版本  |
| 用途     | 生产环境         | 学习/原型 |

## 扩展

### 添加新 Agent

在 `config/loader.ts` 中：

```typescript
await pkg.addAgent({
    id: 'agents/my-agent',
    name: 'My Agent',
    description: 'Agent description',
    system_prompt: 'prompts/default',
    model: 'gpt-4o-mini',
    tools: {},
    middleware: {},
});
```

### 添加新工具

参考 `packages/agent/src/subagents/tools.ts`，使用 LangChain `tool()` 创建工具，然后通过 `AgentPackage` 注册。
