/**
 * Auth API 路由
 *
 * 公开接口（不需要 token 鉴权）：
 * - GET  /api/auth/status   - 检查注册状态
 * - POST /api/auth/register - 首次注册（设置密码 → 保存 token）
 * - POST /api/auth/verify   - 验证 token（登录），成功后下发 HttpOnly Cookie
 * - POST /api/auth/logout   - 登出，清除 Cookie
 */

import { Hono } from 'hono';
import { isRegistered, saveToken, validateToken } from '../auth/tokenAuth.js';

export const authRouter = new Hono();

// Cookie 配置
const COOKIE_NAME = 'zen_token';
// 30 天过期
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function buildSetCookie(token: string): string {
    return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

function buildClearCookie(): string {
    return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * GET /api/auth/status
 * 检查服务端是否已完成注册
 */
authRouter.get('/status', async (c) => {
    const registered = await isRegistered();
    return c.json({ registered });
});

/**
 * POST /api/auth/register
 * 首次注册：保存前端 SHA-256 派生的 token 到文件
 * 注册成功后同时下发 HttpOnly Cookie
 */
authRouter.post('/register', async (c) => {
    if (await isRegistered()) {
        return c.json({ error: 'Already registered' }, 400);
    }

    let body: { token?: string };
    try {
        body = await c.req.json<{ token: string }>();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const { token } = body;

    // token 必须是合法的 64 字符 hex 字符串（SHA-256 输出）
    if (!token || typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
        return c.json({ error: 'Invalid token format. Expected 64-char hex string (SHA-256)' }, 400);
    }

    await saveToken(token);

    // 注册成功，下发 HttpOnly Cookie（避免前端需要手动存储）
    c.header('Set-Cookie', buildSetCookie(token));
    return c.json({ success: true });
});

/**
 * POST /api/auth/verify
 * 验证 token 是否正确（登录）
 * 支持两种方式：
 * 1. Cookie 模式：body 中 token 为空，从 Cookie 中读取（AuthGuard 静默验证）
 * 2. 密码登录：body 中传入 SHA-256(password)，成功后下发 HttpOnly Cookie
 */
authRouter.post('/verify', async (c) => {
    let body: { token?: string };
    try {
        body = await c.req.json<{ token: string }>();
    } catch {
        body = {};
    }

    // 优先使用 Cookie 中的 token（向前兼容）
    const cookieHeader = c.req.header('Cookie') ?? null;
    const cookieToken = (() => {
        if (!cookieHeader) return null;
        const match = cookieHeader.match(/(?:^|;\s*)zen_token=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    })();

    const token = cookieToken || body.token;

    if (!token || typeof token !== 'string') {
        return c.json({ valid: false }, 400);
    }

    const valid = await validateToken(token);
    if (valid) {
        // 下发 / 续期 HttpOnly Cookie
        c.header('Set-Cookie', buildSetCookie(token));
        return c.json({ valid: true });
    } else {
        return c.json({ valid: false }, 401);
    }
});

/**
 * POST /api/auth/logout
 * 登出：清除 HttpOnly Cookie
 */
authRouter.post('/logout', (c) => {
    c.header('Set-Cookie', buildClearCookie());
    return c.json({ success: true });
});
