/**
 * Auth API 路由
 *
 * 公开接口（不需要 token 鉴权）：
 * - GET  /api/auth/status   - 检查注册状态
 * - POST /api/auth/register - 首次注册（设置密码 → 保存 token）
 * - POST /api/auth/verify   - 验证 token 是否正确（登录验证）
 */

import { Hono } from 'hono';
import { isRegistered, saveToken, validateToken } from '../auth/tokenAuth.js';

export const authRouter = new Hono();

/**
 * GET /api/auth/status
 * 检查服务端是否已完成注册
 * 前端首次访问时调用，决定跳转注册页还是登录页
 */
authRouter.get('/status', async (c) => {
    const registered = await isRegistered();
    return c.json({ registered });
});

/**
 * POST /api/auth/register
 * 首次注册：保存前端 SHA-256 派生的 token 到文件
 * 已注册后再调用返回 400
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
    return c.json({ success: true });
});

/**
 * POST /api/auth/verify
 * 验证 token 是否与文件中的 token 匹配（用于登录时验证）
 * 前端 SHA-256(password) 后发送此请求
 */
authRouter.post('/verify', async (c) => {
    let body: { token?: string };
    try {
        body = await c.req.json<{ token: string }>();
    } catch {
        return c.json({ valid: false }, 400);
    }

    const { token } = body;
    if (!token || typeof token !== 'string') {
        return c.json({ valid: false }, 400);
    }

    const valid = await validateToken(token);
    if (valid) {
        return c.json({ valid: true });
    } else {
        return c.json({ valid: false }, 401);
    }
});
