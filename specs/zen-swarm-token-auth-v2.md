# Zen Swarm Token 认证系统 v2 设计

> **状态**: 📝 规划中（待实现） **前置文档**: `specs/zen-swarm-token-auth.md`（v1 方案，已废弃）

## 背景与动机

v1 方案每次服务重启生成随机 token，用户需要从终端复制含 token 的 URL 才能访问，体验较差。v2 方案改为：密码注册/登录 + 前端登录页，token 持久化到文件，无需每次重启后重新获取链接。

---

## 核心设计决策

| 维度                 | v1（废弃）              | v2（新方案）                             |
| -------------------- | ----------------------- | ---------------------------------------- |
| Token 来源           | 服务启动随机生成        | 用户密码经前端 SHA-256 Hash 派生         |
| Token 存储（服务端） | 内存（重启失效）        | `~/.zen-swarm/token`（文件持久化）       |
| Token 存储（前端）   | `sessionStorage`        | `localStorage`（持久，关闭浏览器不丢失） |
| 首次使用             | 终端复制带 token 的 URL | 浏览器内注册页设置密码                   |
| 登录入口             | URL `?token=xxx` 参数   | 前端登录页（密码输入）                   |
| 鉴权范围             | HTTP API + WebSocket    | HTTP API + WebSocket + tRPC（不变）      |

---

## 完整认证流程

```
首次访问（服务端无 token 文件）
  → GET /api/auth/status → { registered: false }
  → 前端跳转 /register（注册页）
  → 用户输入密码
  → 前端：token = await sha256(password)
  → POST /api/auth/register { token }
  → 服务端：保存 token 到 ~/.zen-swarm/token 文件
  → 前端：localStorage.setItem('zen_token', token)
  → 跳转到主页 /

已注册用户访问（服务端有 token 文件）
  → 前端检查 localStorage.getItem('zen_token')
    ├─ 有 token → 发送 API 请求
    │   ├─ 成功 → 正常使用
    │   └─ 401 → 清除 localStorage → 跳转 /login
    └─ 无 token → 跳转 /login（登录页）

登录页
  → 用户输入密码
  → 前端：token = await sha256(password)
  → 前端：直接设置 localStorage + 发送测试请求验证
    ├─ 成功 → 跳转主页 /
    └─ 失败（401）→ 显示「密码错误」提示
```

---

## 服务端设计

### Token 文件

- **路径**: `~/.zen-swarm/token`
- **格式**: 纯文本，存储前端 SHA-256 派生的 hex 字符串（64 字符）
- **创建时机**: 用户首次注册时由服务端写入
- **权限**: `0600`（仅所有者可读写）

### 新建：`zen-swarm/src/auth/tokenAuth.ts`（重写）

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Context, Next } from 'hono';

const TOKEN_DIR = join(homedir(), '.zen-swarm');
const TOKEN_FILE = join(TOKEN_DIR, 'token');

/**
 * 检查是否已注册（token 文件是否存在）
 */
export async function isRegistered(): Promise<boolean> {
    return existsSync(TOKEN_FILE);
}

/**
 * 从文件读取 token
 */
export async function loadToken(): Promise<string | null> {
    try {
        const content = await readFile(TOKEN_FILE, 'utf-8');
        return content.trim() || null;
    } catch {
        return null;
    }
}

/**
 * 保存 token 到文件（首次注册时调用）
 */
export async function saveToken(token: string): Promise<void> {
    await mkdir(TOKEN_DIR, { recursive: true });
    await writeFile(TOKEN_FILE, token, { encoding: 'utf-8', mode: 0o600 });
}

/**
 * 校验 token 是否合法（与文件中的 token 比对）
 */
export async function validateToken(token: string): Promise<boolean> {
    const stored = await loadToken();
    return !!stored && stored === token;
}

/**
 * Hono 认证中间件
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
    const authorization = c.req.header('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized', message: 'Missing Authorization header' }, 401);
    }
    const token = authorization.slice(7);
    const valid = await validateToken(token);
    if (!valid) {
        return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }
    await next();
}
```

### 新增：`zen-swarm/src/api/auth.ts`

```typescript
import { Hono } from 'hono';
import { isRegistered, saveToken, validateToken } from '../auth/tokenAuth.js';

export const authRouter = new Hono();

/** 检查注册状态 */
authRouter.get('/status', async (c) => {
    const registered = await isRegistered();
    return c.json({ registered });
});

/** 首次注册（仅在未注册时可调用） */
authRouter.post('/register', async (c) => {
    if (await isRegistered()) {
        return c.json({ error: 'Already registered' }, 400);
    }
    const { token } = await c.req.json<{ token: string }>();
    if (!token || typeof token !== 'string' || token.length !== 64) {
        return c.json({ error: 'Invalid token format' }, 400);
    }
    await saveToken(token);
    return c.json({ success: true });
});

/** 验证 token（登录验证） */
authRouter.post('/verify', async (c) => {
    const { token } = await c.req.json<{ token: string }>();
    if (!token) {
        return c.json({ valid: false }, 401);
    }
    const valid = await validateToken(token);
    return c.json({ valid }, valid ? 200 : 401);
});
```

### 修改：`zen-swarm/src/server.ts`

- 移除 `generateToken()` 调用
- 挂载 `authRouter` 到 `/api/auth`（**不需要鉴权**，注册/登录接口为公开接口）
- `/api/auth/*` 排除在 `authMiddleware` 之外
- WebSocket 升级改为异步 `validateToken`

---

## 前端设计

### 修改：`zen-swarm/src/frontend/utils/auth.ts`

```typescript
const TOKEN_KEY = 'zen_token';

/** 从 localStorage 获取 token */
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

/** 存入 localStorage */
export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

/** 清除 localStorage token */
export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/** 构造 Authorization header */
export function getAuthHeaders(): Record<string, string> {
    const token = getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

/** 将密码 SHA-256 派生为 token */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

### 新建：`zen-swarm/src/frontend/views/LoginView.tsx`

- 密码输入框 + 登录按钮
- 前端 hash → localStorage → 发送 `/api/auth/verify` 验证
- 成功 → 跳转 `/`，失败 → 显示错误

### 新建：`zen-swarm/src/frontend/views/RegisterView.tsx`

- 密码输入框 + 确认密码框 + 注册按钮
- 调用 `POST /api/auth/register { token: sha256(password) }`
- 成功 → localStorage + 跳转 `/`

### 新建：`zen-swarm/src/frontend/components/AuthGuard.tsx`

```typescript
/**
 * 路由守卫组件
 * - 无 token → 跳转 /login
 * - 有 token 但 API 返回 401 → 清除 + 跳转 /login
 * - 服务端未注册 → 跳转 /register
 */
```

### 修改：`zen-swarm/src/frontend/App.tsx`

```typescript
export function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginView />} />
                <Route path="/register" element={<RegisterView />} />
                <Route path="/setup" element={<SetupWizard />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="*" element={
                    <AuthGuard>
                        <DockLayout />
                    </AuthGuard>
                } />
            </Routes>
        </HashRouter>
    );
}
```

---

## 文件改动清单

| 文件                                              | 类型 | 说明                                                  |
| ------------------------------------------------- | ---- | ----------------------------------------------------- |
| `zen-swarm/src/auth/tokenAuth.ts`                 | 重写 | 文件持久化 token，异步 validate                       |
| `zen-swarm/src/api/auth.ts`                       | 新建 | /status、/register、/verify 接口                      |
| `zen-swarm/src/server.ts`                         | 修改 | 移除随机生成，挂载 authRouter，排除 /api/auth/\* 鉴权 |
| `zen-swarm/src/frontend/utils/auth.ts`            | 修改 | sessionStorage → localStorage，新增 hashPassword      |
| `zen-swarm/src/frontend/views/LoginView.tsx`      | 新建 | 密码登录页                                            |
| `zen-swarm/src/frontend/views/RegisterView.tsx`   | 新建 | 首次注册设置密码页                                    |
| `zen-swarm/src/frontend/components/AuthGuard.tsx` | 新建 | 路由守卫（检查 token + 注册状态）                     |
| `zen-swarm/src/frontend/App.tsx`                  | 修改 | 新增 /login、/register 路由，AuthGuard 包裹主页       |

---

## 安全说明

1. **密码不离开浏览器**：密码在前端 SHA-256 后才发送，服务端只存储 Hash 值
2. **文件权限**：token 文件设置 `0600` 权限，仅所有者可读写
3. **注册接口保护**：`/api/auth/register` 在已注册后返回 400，防止覆盖
4. **localStorage 持久化**：关闭浏览器不丢失，但仅在同源下有效
5. **HTTPS 建议**：生产环境建议配合 HTTPS，防止 token 明文传输被截获

---

## 测试要点

- [ ] 首次访问，`/api/auth/status` 返回 `{ registered: false }` → 跳转注册页
- [ ] 注册成功后，`~/.zen-swarm/token` 文件存在且内容正确
- [ ] 已注册时再访问注册接口，返回 400
- [ ] 正确密码登录，`/api/auth/verify` 返回 200 → 跳转主页
- [ ] 错误密码登录，返回 401 → 显示错误提示
- [ ] localStorage 存有 token，刷新页面不需要重新登录
- [ ] localStorage token 无效时，自动跳转 /login
- [ ] WebSocket 连接携带正确 token 可正常升级
- [ ] `/health` 和 `/api/auth/*` 无需 token 可正常访问
