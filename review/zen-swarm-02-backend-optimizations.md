# Zen Swarm 后端优化建议

**涉及文件**: `server.ts`, `graphBuilder.ts`, `agents/factory.ts`, `api/index.ts`

---

## 1. Agent 创建链路性能

### 问题：每次请求重复加载相同配置

`createSwarmAgent()` 在每次 LangGraph 节点执行时都执行以下数据库查询：

```typescript
// factory.ts 每次调用时
const agentConfig  = await pkg.getAgent(agentId);       // DB query 1
const modelConfig  = await pkg.getModel(effectiveModelId); // DB query 2
const provider     = await providerStorage.getById(providerId); // DB query 3
const decryptedKey = await providerStorage.getDecryptedApiKey(providerId); // DB query 4
const promptConfig = await pkg.getPromptWithContent(...); // DB query 5
```

5 次串行数据库查询，且没有任何缓存。对于 Cron 任务（同一 agent 每小时触发一次），每次都重新加载相同配置。

### 建议

**短期（无需大改）**: 对 AgentConfig + ModelConfig + ProviderConfig 增加内存 TTL 缓存（30 秒），仅 `promptConfig`
保持每次查询（支持热更新 prompt）。

```typescript
// 伪代码示意
const configCache = new Map<string, { data: AgentConfig; expires: number }>();

async function getCachedAgentConfig(pkg, agentId) {
    const cached = configCache.get(agentId);
    if (cached && Date.now() < cached.expires) return cached.data;
    const data = await pkg.getAgent(agentId);
    configCache.set(agentId, { data, expires: Date.now() + 30_000 });
    return data;
}
```

**长期**: 在 `AgentPackage` 内部实现缓存层，对消费方透明。

---

## 2. swarmNode 的冗余 Agent 列表查询

```typescript
// graphBuilder.ts:19-23
const availableAgents = await getAvailableAgentIds(agentPackage);
if (!availableAgents.includes(agent_id)) {
    throw new Error(`Unknown agent: ${agent_id}...`);
}
```

`getAvailableAgentIds` 调用 `pkg.listAgents()` 做全表扫描，仅用于错误校验。实际上 `createSwarmAgent` 内部已经在
`pkg.getAgent(agentId)` 返回 null 时抛出同等错误。

**建议**: 移除预检查，让 `createSwarmAgent` 内部的 null 检查承担这个职责，减少 1 次查询。

---

## 3. `@ts-ignore` 注释

`factory.ts` 中存在两处 `@ts-ignore`:

```typescript
// factory.ts:154
humanInTheLoopMiddleware({
    /** @ts-ignore */
    interruptOn,
}),

// factory.ts:171
/** @ts-ignore */
stateSchema: SwarmState,
```

这表明 `SwarmState` 和 `humanInTheLoopMiddleware` 的类型定义与实际用法存在不匹配。`@ts-ignore` 会屏蔽未来真实类型错误。

**建议**:

1. 检查 `humanInTheLoopMiddleware` 的参数类型定义，扩展 `interruptOn` 的允许字段
2. 确认 `createAgent` 的 `stateSchema` 参数期望类型，将 `SwarmState` 显式转换为正确类型而非跳过检查

---

## 4. tRPC Router 重复定义

`api/index.ts` 中 `baseRouter` 对象被写了两次：

```typescript
// 第一次：appRouter（第 27-39 行）
export const appRouter = router({
    models: modelsRouter,
    // ...11 个路由...
});

// 第二次：createMergedRouter 内部（第 50-62 行）
const baseRouter = {
    models: modelsRouter,
    // ...11 个路由...完全相同...
};
```

两个定义完全相同，未来新增路由需修改两处，容易遗漏。

**建议**: 将 `baseRouter` 提取为常量，`appRouter` 直接由 `router(baseRouter)` 创建：

```typescript
const baseRouterDef = {
    models: modelsRouter,
    // ...
};

export const appRouter = router(baseRouterDef);

export function createMergedRouter(...) {
    // 直接复用 baseRouterDef
    if (stateMachineManager && smDatabase && providerStorage) {
        return router({ ...baseRouterDef, sm: smRouter, providers: providerRouter });
    }
    // ...
}
```

---

## 5. 服务器启动时无 graceful shutdown

当前 `server.ts` 没有监听 `SIGTERM`/`SIGINT`，直接 `Bun.serve()` 启动后无优雅关闭逻辑：

- 正在执行的 LangGraph 调用会被强制中断
- Cron 任务状态可能停留在 `running`（数据库中），重启后无法自动恢复

**建议**:

```typescript
process.on('SIGTERM', async () => {
    await cronScheduler.stop();
    // 等待进行中的请求完成（可设 5 秒超时）
    process.exit(0);
});
```

并在系统启动时将所有 `running` 状态的 Cron 日志重置为 `failed`（带 `error_message: 'Server restarted'`）。

---

## 6. 自动打开浏览器的问题

```typescript
// server.ts:118
openBrowser(`http://127.0.0.1:${port}/ui`);
```

`openBrowser` 调用不等待服务器实际就绪。Bun 的 `serve()`
是同步启动，但 HTTP 端口监听到可接受请求之间有短暂延迟，在低性能机器上可能导致浏览器打开时服务尚未完全就绪。

**建议**: 在 `serve()` 的回调（Bun 0.6+ 支持 `onListen`）中调用 `openBrowser`，或在 `openBrowser` 内加 500ms 延迟。

---

## 7. 模型初始化没有连接池

`initChatModel()` 每次创建新的模型实例（ChatOpenAI / ChatAnthropic），这些客户端内部各自维护 HTTP
agent 和连接，无法复用。

**建议**: 按 `(provider_id, model_name, temperature)` 缓存模型实例，相同参数复用同一实例，减少 HTTP 连接建立开销。
