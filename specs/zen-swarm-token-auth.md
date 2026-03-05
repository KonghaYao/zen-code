# Zen Swarm Token 认证机制设计

## 背景

Zen Swarm 作为本地运行的 Web UI 服务，需要防止同一局域网内的未授权访问。采用内存 Token 校验机制，简单且有效。

## 需求

| 维度         | 决策                                                                |
| ------------ | ------------------------------------------------------------------- |
| Token 生成   | 服务启动时自动生成一个随机 token（内存存储）                        |
| URL 传递方式 | Query 参数：`http://localhost:8124/ui?token=xxx`                    |
| 前端存储     | 读取 URL token → 存入 `sessionStorage` → 之后从 sessionStorage 读取 |
| 请求携带方式 | `Authorization: Bearer <token>` Header                              |
| 校验范围     | `/api/trpc`、`/api/langgraph`、`/ws/terminal`                       |
| 不保护范围   | `/ui` 静态资源、`/health` 健康检查                                  |
| 校验失败处理 | 后端返回 401，前端跳转到 `/unauthorized` 错误页                     |
| Token 有效期 | 服务重启前永久有效（内存生命周期）                                  |
| 日志输出     | 控制台打印完整带 token 的访问 URL                                   |
| 环境变量预设 | 不支持，每次启动自动生成                                            |

---

## 架构设计

### 整体流程

```
[服务启动]
  → generateToken() → 内存存储
  → 控制台打印：🔑 Access URL: http://127.0.0.1:8124/ui?token=<TOKEN>

[用户访问]
  → 打开浏览器访问 URL（含 token query 参数）
  → 前端 index.tsx 读取 ?token=xxx
  → 存入 sessionStorage('zen_token')
  → TRPCProvider / apiClient 注入 Authorization header

[API 请求]
  → 请求携带 Authorization: Bearer <token>
  → Hono 中间件校验 token
  → 成功：放行请求
  → 失败：返回 401 JSON { error: "Unauthorized" }
  → 前端检测到 401：跳转 /unauthorized

[WebSocket 连接]
  → ws://127.0.0.1:8124/ws/terminal?token=xxx
  → server.ts fetch() 升级前校验 token query 参数
  → 失败：返回 400 Response
```

---

## 后端实现

### 新建文件：`zen-swarm/src/auth/tokenAuth.ts`

```typescript
import { crypto } from 'node:crypto';
import type { Context, Next } from 'hono';

// 内存中存储当前 token
let currentToken: string | null = null;

/**
 * 生成服务 token（启动时调用一次）
 */
export function generateToken(): string {
    currentToken = crypto.randomUUID().replace(/-/g, '');
    return currentToken;
}

/**
 * 校验 token 是否合法
 */
export function validateToken(token: string): boolean {
    return !!currentToken && token === currentToken;
}

/**
 * Hono 认证中间件
 * 从 Authorization: Bearer <token> 中提取并校验 token
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
    const authorization = c.req.header('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized', message: 'Missing Authorization header' }, 401);
    }
    const token = authorization.slice(7); // 去掉 "Bearer "
    if (!validateToken(token)) {
        return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }
    await next();
}
```

### 修改：`zen-swarm/src/server.ts`

**关键改动**：

1. 启动时生成 token
2. 在 `/api/langgraph` 和 `/api/trpc` 路由前挂载 `authMiddleware`
3. WebSocket 升级时校验 token query 参数
4. 打印完整访问 URL

```typescript
// 新增 import
import { generateToken, validateToken, authMiddleware } from './auth/tokenAuth.js';

// 启动时生成 token（在所有初始化之前）
const token = generateToken();

// 在 API 路由之前注册认证中间件
app.use('/api/*', authMiddleware);

// 日志改为包含 token 的完整 URL
console.log(`🔑 Access URL: http://127.0.0.1:${port}/ui?token=${token}`);

// WebSocket 升级时校验 token
if (url.pathname === '/ws/terminal') {
    const wsToken = url.searchParams.get('token');
    if (!wsToken || !validateToken(wsToken)) {
        return new Response('Unauthorized', { status: 401 });
    }
    // ... 原有升级逻辑
}
```

---

## 前端实现

### 修改：`zen-swarm/src/frontend/index.tsx`

在应用挂载前读取 token 并存入 sessionStorage：

```typescript
// 启动时解析 URL token
function initToken(): void {
    // 尝试从 URL query 参数获取 token
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
        sessionStorage.setItem('zen_token', urlToken);
        // 清除 URL 中的 token 参数（可选，提升安全性）
        // urlParams.delete('token');
        // window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
}

initToken();
```

### 工具函数：`zen-swarm/src/frontend/utils/auth.ts`

```typescript
const TOKEN_KEY = 'zen_token';

/**
 * 获取当前 session token
 */
export function getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * 构造 Authorization header
 */
export function getAuthHeaders(): Record<string, string> {
    const token = getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}
```

### 修改：`zen-swarm/src/frontend/components/TRPCProvider.tsx`

在 `httpBatchLink` 中注入 token header：

```typescript
import { getAuthHeaders } from '../utils/auth.js';

const [trpcClient] = useState(() =>
    trpc.createClient({
        links: [
            httpBatchLink({
                url: '/api/trpc',
                headers() {
                    return getAuthHeaders();
                },
            }),
        ],
    }),
);
```

### 修改：`zen-swarm/src/frontend/api.ts`

同步更新 `apiClient`（供 stores 直接使用）：

```typescript
import { getAuthHeaders } from './utils/auth.js';

export const apiClient = createTRPCClient<FullAppRouter>({
    links: [
        httpBatchLink({
            url: '/api/trpc',
            headers() {
                return getAuthHeaders();
            },
        }),
    ],
});
```

### 修改：`zen-swarm/src/frontend/App.tsx`

添加 `/unauthorized` 路由：

```typescript
import { Unauthorized } from './views/Unauthorized.js';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<DockLayout />} />
      </Routes>
    </HashRouter>
  );
}
```

### 新建：`zen-swarm/src/frontend/views/Unauthorized.tsx`

```typescript
export function Unauthorized() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>401 - Unauthorized</h1>
      <p>无效的访问令牌，请使用正确的访问链接。</p>
      <p>请查看服务器控制台获取带有 token 的访问 URL。</p>
    </div>
  );
}
```

### 401 拦截：全局响应处理

需要在 tRPC 或 fetch 层面拦截 401，自动跳转到 `/unauthorized`：

**方案**：在 `TRPCProvider.tsx` 的 `QueryClient` 中配置全局错误处理：

```typescript
const [queryClient] = useState(
    () =>
        new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
            queryCache: new QueryCache({
                onError: (error) => {
                    if (isTRPCClientError(error) && error.data?.httpStatus === 401) {
                        window.location.hash = '/unauthorized';
                    }
                },
            }),
            mutationCache: new MutationCache({
                onError: (error) => {
                    if (isTRPCClientError(error) && error.data?.httpStatus === 401) {
                        window.location.hash = '/unauthorized';
                    }
                },
            }),
        }),
);
```

---

## 文件改动清单

| 文件                                                 | 类型 | 说明                                       |
| ---------------------------------------------------- | ---- | ------------------------------------------ |
| `zen-swarm/src/auth/tokenAuth.ts`                    | 新建 | Token 生成、校验、Hono 中间件              |
| `zen-swarm/src/server.ts`                            | 修改 | 注册 auth 中间件、打印 URL、WebSocket 校验 |
| `zen-swarm/src/frontend/index.tsx`                   | 修改 | 启动时解析 URL token → sessionStorage      |
| `zen-swarm/src/frontend/utils/auth.ts`               | 新建 | getToken() / getAuthHeaders() 工具函数     |
| `zen-swarm/src/frontend/api.ts`                      | 修改 | apiClient 添加 Authorization header        |
| `zen-swarm/src/frontend/components/TRPCProvider.tsx` | 修改 | httpBatchLink headers 注入、401 全局拦截   |
| `zen-swarm/src/frontend/views/Unauthorized.tsx`      | 新建 | 401 错误展示页                             |
| `zen-swarm/src/frontend/App.tsx`                     | 修改 | 添加 /unauthorized 路由                    |

---

## 安全说明

1. **Token 强度**：使用 `crypto.randomUUID()` 生成 128-bit 随机 token，碰撞概率极低
2. **内存存储**：token 不持久化，服务重启自动失效
3. **sessionStorage**：关闭标签页后 token 自动清除，不跨 session 泄露
4. **HTTPS**：生产环境建议配合 HTTPS 使用，防止 token 在网络传输中泄露
5. **不保护静态资源**：`/ui` HTML/CSS/JS 不受保护（符合需求），但 API 数据完全受保护

---

## 测试要点

- [ ] 服务启动后控制台打印正确的 URL（含 token）
- [ ] 使用正确 token URL 访问，API 请求成功
- [ ] 不携带 token 访问 `/api/trpc`，返回 401
- [ ] 携带错误 token，返回 401
- [ ] 前端检测到 401，自动跳转 `/unauthorized`
- [ ] 关闭标签页后再打开，sessionStorage 清空，需重新使用 token URL
- [ ] WebSocket `/ws/terminal?token=xxx` 正确校验
- [ ] `/health` 接口无需 token 可正常访问
