# Zen Swarm 安全审查

**涉及范围**: API 层、Provider 密钥管理、工具执行、HITL 机制

---

## 1. HITL（Human-in-the-Loop）配置被注释掉

### 当前状态

```typescript
// factory.ts:145-150
// 先不限制命令行使用
// if (process.env.YOLO_MODE !== 'true') {
//     Object.assign(interruptOn, {
//         terminal: { allowedDecisions: ['approve', 'reject', 'edit'] },
//     });
// }
```

终端命令执行的 HITL 检查被注释掉，意味着 Agent 可以无需用户确认直接执行任意终端命令。

`ask_user_questions` 的 HITL 保留：

```typescript
const interruptOn: any = {
    ask_user_questions: {
        allowedDecisions: ['respond', 'approve', 'reject', 'edit'],
    },
};
```

### 风险

在 Cron 定时任务场景下，没有用户在场监督，Agent 执行 `terminal` 工具时完全不受人工审核。如果 Cron 任务的 `prompt`
被恶意构造（或 Agent 产生幻觉），可能执行破坏性命令。

### 建议

明确决策：

- **选项 A**: 在 Cron 执行上下文中禁用终端工具（而不是禁用 HITL）
- **选项 B**: 恢复终端 HITL，但为 Cron 任务单独配置一个无终端工具的 Agent
- **选项 C**: 添加终端命令白名单，仅允许特定命令模式

至少应在文档中明确说明当前这是有意为之的决策，而不是遗留的注释代码。

---

## 2. Provider API Key 加密方案不透明

```typescript
// factory.ts:63
const decryptedApiKey = await providerStorage.getDecryptedApiKey(providerId);
```

API Key 通过 `ProviderStorage`
加密存储，但加密密钥的来源不明。如果使用固定硬编码密钥，加密仅提供混淆而非真正的安全保护。

**建议**: 审查 `ProviderStorage` 的加密实现：

1. 加密密钥是否随机生成并安全存储？
2. 是否有密钥轮换机制？
3. 数据库文件 `./data/index.db` 的文件权限是否只允许运行用户读写？

---

## 3. tRPC 接口无认证

所有 tRPC 接口（包括 agents CRUD、providers 管理、文件读写）都没有认证保护：

```typescript
// api/trpc.ts（推断）
export const t = initTRPC.context<Context>().create();
export const publicProcedure = t.procedure; // 无认证
```

当 `LANGGRAPH_API_URL` 配置为远程服务器时（非 `127.0.0.1`），任何能访问该端口的人都可以：

- 读取所有 Agent 配置
- 修改 Provider API Key
- 执行文件操作（通过 `files` 路由）
- 触发 Cron 任务

### 建议

**最低限度**: 对修改操作（mutate procedures）增加基于 API Token 的简单认证：

```typescript
// 环境变量配置
SWARM_API_TOKEN = your - secret - token;

// tRPC context
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    const token = ctx.req.header('x-api-token');
    if (token !== process.env.SWARM_API_TOKEN) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({ ctx });
});
```

对本地开发场景（`127.0.0.1`），可以豁免认证检查。

---

## 4. 文件操作路由无路径限制

`files` tRPC 路由提供文件读写能力，如果没有路径沙箱，理论上可以读取服务器上的任意文件。

**建议**: 确认 `filesRouter` 中是否有路径验证（如限制只能在 workspace root 下操作）。如果没有，需要增加：

```typescript
function validatePath(path: string, workspaceRoot: string): void {
    const resolved = resolve(path);
    if (!resolved.startsWith(resolve(workspaceRoot))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Path outside workspace' });
    }
}
```

---

## 5. WebSocket 终端无会话隔离

```typescript
// server.ts:98-100
const upgraded = server.upgrade(req, {
    data: { sessionIds: new Set<string>() },
});
```

WebSocket 终端升级时没有检查来源或认证令牌，任何连接到 `/ws/terminal` 的客户端都可以获得终端访问权限。

结合第 3 条（无认证），本地网络中的其他设备理论上可以通过 WebSocket 获取服务器终端控制权。

**建议**: 在 WebSocket 升级握手时验证请求头中的认证令牌。

---

## 6. 日志中的敏感信息

```typescript
// server.ts:40
app.use(logger());
```

Hono 的 `logger()` 中间件会记录所有请求路径，包括 tRPC 调用的端点名称。如果将来 API
Key 通过 URL 传递（虽然当前是请求体），会被记录到日志。

目前风险较低，但需注意日志输出不应包含 Provider API Key、用户提示词等敏感信息。

---

## 7. 依赖安全

建议定期执行：

```bash
bun audit  # 检查已知漏洞
```

特别关注：

- `@langchain/langgraph` - LangGraph 执行环境
- `node-cron` - 定时任务执行器
- `xterm` - 终端模拟器（前端）
