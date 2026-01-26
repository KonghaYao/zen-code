# Multi-Agent 实例 + Web UI 架构难点分析

## 概述

当前 zen-code 项目采用单一 LangGraph Server + TUI 架构。要支持多 agent 实例和 Web UI，需要解决一系列架构挑战。

---

## 1. 多实例管理

### 当前状态
- 单一 LangGraph Server (port 8123)
- 单一 graph 实例处理所有请求
- TUI 直接连接到这个实例

### 新需求挑战

#### 1.1 实例隔离
- **问题**：多个 agent 实例的内存状态、对话历史如何隔离？
- **场景**：
  ```
  用户 A 开启 agent-1 (8123) - 处理代码审查
  用户 B 开启 agent-2 (8124) - 处理重构任务
  用户 C 开启 agent-3 (8125) - 处理性能优化
  ```

#### 1.2 端口管理
- **问题**：如何动态分配端口？（8123, 8124, 8125...）
- **冲突**：端口占用检测、释放

#### 1.3 实例生命周期
- 创建、销毁、重启 agent 实例的策略
- 健康检查机制

---

## 2. 状态同步问题

### 当前状态
- 前端（TUI）存储配置：`~/.zen-code/settings.json`
- 后端依赖环境变量获取配置

### 多实例挑战

#### 2.1 配置隔离
- **问题**：每个 agent 实例需要不同的配置（模型、API key、参数）
- **冲突**：
  ```javascript
  // 当前问题
  Agent 1: 读取 ~/.zen-code/settings.json (model: claude-sonnet)
  Agent 2: 写入 ~/.zen-code/settings.json (model: gpt-4)
  // 覆盖冲突
  ```

#### 2.2 会话持久化
- 每个 agent 实例的对话历史如何保存？
- 是否需要在实例间共享？

#### 2.3 Memory 系统
- `.langgraph_api/memory.md` 是全局的
- 多实例如何共享/隔离？

---

## 3. 资源竞争与隔离

### 3.1 LLM API 调用配额
- 多实例并发调用可能导致 API 限流
- OpenAI/Anthropic 的 Rate Limit 如何分配？

### 3.2 资源监控
- 每个 agent 实例的内存占用
- 并发任务数控制
- 超时处理机制

**需要新增**：
```typescript
// agents/code/ResourceManager.ts
export class ResourceManager {
    private activeInstances: Map<string, AgentInstance>;
    private rateLimiter: RateLimiter;

    async acquireSlot(instanceId: string): Promise<boolean> {
        // 限流逻辑
    }
}
```

---

## 4. Web UI 架构设计

### TUI vs Web UI 差异

| 维度 | TUI | Web UI |
|------|-----|--------|
| 渲染 | Ink (React for terminal) | React/Next.js |
| 通信 | stdin/stdout + HTTP | WebSocket/HTTP |
| 状态 | 本地内存 | 远程服务器 |
| 部署 | 单机 | 需要后端服务 |

### 核心难点

#### 4.1 实时通信
- **TUI**：使用本地调用
- **Web UI**：需要 WebSocket 处理流式输出

#### 4.2 状态管理
- **TUI**：状态在本地
- **Web UI**：需要在浏览器和后端之间同步状态

#### 4.3 认证授权
- **TUI**：不需要用户系统
- **Web UI**：需要用户认证、权限控制

**通信对比**：
```typescript
// TUI (本地)
const response = await sendMessage(content, { extraParams });

// Web UI (远程)
const ws = new WebSocket('ws://localhost:8123/ws');
ws.onmessage = (event) => {
    // 处理流式输出
};
```

---

## 5. 统一后端 API

### 当前后端
- LangGraph Server (`agents/code/server.ts`) 提供 HTTP 端点
- 没有实例管理 API

### 需要新增

#### 5.1 实例管理 API
```typescript
// agents/code/instance-manager.ts

POST   /instances          // 创建新实例
GET    /instances          // 列出所有实例
GET    /instances/:id      // 获取实例状态
DELETE /instances/:id      // 销毁实例
POST   /instances/:id/chat // 发送消息到实例

// 实例配置
{
    id: "uuid-xxx",
    port: 8124,
    config: {
        main_model: "claude-sonnet",
        enable_thinking: true,
        switch_command: "finder"
    },
    status: "running" | "idle" | "stopped"
}
```

#### 5.2 WebSocket 端点
```typescript
// 流式输出
WS /instances/:id/stream

// 消息格式
{
    type: "chunk" | "tool_call" | "done" | "error",
    data: {...}
}
```

---

## 6. 前端代码复用

### TUI 和 Web UI 的差异

| 层级 | TUI | Web UI | 复用策略 |
|------|-----|--------|---------|
| 组件层 | `<Box><Text>` | `<div><p>` | 不复用 |
| 交互层 | `useInput` | 标准事件 | 不复用 |
| 状态层 | ChatProvider | ChatProvider (Web) | 需适配 |
| 工具层 | TUI tools | Web tools | 需适配 |
| 类型层 | 共享类型 | 共享类型 | 完全复用 |

### 代码复用策略

```typescript
// 共享业务逻辑层
tui/src/chat/store/         → 可复用
tui/src/chat/context/       → 部分复用
tui/src/chat/tools/         → 需适配

// 平台特定层
tui/src/chat/components/    → TUI 专用
web-ui/src/components/      → Web UI 专用

// 共享类型
types/chat.ts               → 前后端共享
```

---

## 7. 部署复杂度

### 当前部署
```bash
bun run dev:server  # 单一后端 (8123)
bun run dev        # 单一 TUI
```

### 多实例 + Web UI 部署
```bash
# 实例管理器
bun run dev:instance-manager  # 端口 9000

# Agent 实例（动态创建）
# port 8123, 8124, 8125...

# Web UI 服务器
bun run dev:web-ui           # 端口 3000
```

### Docker 化挑战
- 每个实例需要独立容器？
- 如何共享 `.langgraph_api/` 数据？
- 配置管理（环境变量挂载）

---

## 8. 优先级建议

### Phase 1: 单实例 Web UI
- 实现 Web UI，复用现有 TUI 逻辑
- WebSocket 适配流式输出
- 保持单 agent 实例

### Phase 2: 多实例管理器
- 创建实例管理服务
- 动态端口分配
- 实例生命周期管理

### Phase 3: 状态持久化
- 数据库存储会话历史
- 配置隔离方案
- Memory 系统多实例支持

### Phase 4: 资源与监控
- Rate Limiting
- 实例监控面板
- 日志聚合

---

## 9. 潜在方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **多进程** | 隔离性好 | 资源占用高，管理复杂 |
| **多线程** | 资源共享 | Node.js 单线程限制 |
| **单一 Graph + 多会话** | 资源效率高 | 状态隔离难实现 |
| **Docker 容器化** | 完全隔离 | 部署复杂度高 |

### 推荐方案：单一 Graph + 多会话 ID

```typescript
// 扩展现有 graph
const response = await graph.invoke(input, {
    thread_id: 'user-123',  // 隔离会话
    recursionLimit: 200,
});
```

**优势**：
- 无需启动多个进程
- 资源共享（内存、连接池）
- LangGraph 原生支持 `thread_id`

---

## 总结

### 最大难点
1. **状态隔离** - 多实例的配置/历史如何隔离
2. **资源管理** - API 配额、并发控制
3. **Web UI 适配** - 实时通信、状态同步
4. **部署复杂度** - 多实例启停、监控

### 建议路线
1. 先实现单实例 Web UI（验证可行性）
2. 引入 `thread_id` 实现逻辑隔离（而非物理多实例）
3. 最后考虑物理多实例（如需真正的资源隔离）
