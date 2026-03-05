/**
 * Token 认证模块
 *
 * 服务启动时生成一个随机 token 存储在内存中。
 * 所有 /api/* 请求需在 Authorization: Bearer <token> header 中携带此 token。
 * 服务重启后 token 自动失效（内存生命周期）。
 */

import type { Context, Next } from 'hono';

// 内存中存储当前 token（单例）
let currentToken: string | null = null;

/**
 * 生成服务 token
 * 服务启动时调用一次，使用 crypto.randomUUID() 生成 128-bit 随机 token
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
 * 从 Authorization: Bearer <token> header 中提取并校验 token
 * 校验失败返回 401 JSON 响应
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
