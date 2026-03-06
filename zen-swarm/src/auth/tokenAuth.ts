/**
 * Token 认证模块 v3
 *
 * 认证流程：
 * 1. 用户输入密码，前端 SHA-256 派生 token
 * 2. 首次注册：POST /api/auth/register → 服务端保存 token 到 ~/.zen-swarm/token
 * 3. 后续登录：POST /api/auth/verify → 成功后服务端下发 HttpOnly Cookie
 * 4. 所有 /api/* 请求优先读取 Cookie，兼容旧版 Authorization: Bearer <token> header
 * 5. WebSocket 升级请求从 Cookie 中读取 token，不再通过 URL 参数传递
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { timingSafeEqual } from 'node:crypto';
import type { Context, Next } from 'hono';

const TOKEN_DIR = join(homedir(), '.zen-swarm');
const TOKEN_FILE = join(TOKEN_DIR, 'token');
const COOKIE_NAME = 'zen_token';

// 内存缓存，避免每次请求都读文件（token 注册后不会改变）
let cachedToken: string | null | undefined = undefined; // undefined = 未初始化

/**
 * 检查是否已完成注册（token 文件是否存在）
 */
export async function isRegistered(): Promise<boolean> {
    try {
        await access(TOKEN_FILE);
        return true;
    } catch {
        return false;
    }
}

/**
 * 从文件读取持久化的 token（带内存缓存）
 */
export async function loadToken(): Promise<string | null> {
    if (cachedToken !== undefined) {
        return cachedToken;
    }
    try {
        const content = await readFile(TOKEN_FILE, 'utf-8');
        cachedToken = content.trim() || null;
        return cachedToken;
    } catch {
        cachedToken = null;
        return null;
    }
}

/**
 * 保存 token 到文件（首次注册时调用）
 * 文件权限设置为 0o600（仅所有者可读写）
 */
export async function saveToken(token: string): Promise<void> {
    await mkdir(TOKEN_DIR, { recursive: true });
    await writeFile(TOKEN_FILE, token, { encoding: 'utf-8', mode: 0o600 });
    cachedToken = token;
}

/**
 * 校验 token 是否合法（与文件中的 token 比对）
 * 使用 timingSafeEqual 防止时序攻击
 */
export async function validateToken(token: string): Promise<boolean> {
    const stored = await loadToken();
    if (!stored) return false;
    if (stored.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(stored), Buffer.from(token));
}

/**
 * 从请求中提取 token
 * 优先级：HttpOnly Cookie > Authorization: Bearer header（向后兼容）
 */
export function extractTokenFromRequest(req: Request): string | null {
    // 优先从 Cookie 读取（HttpOnly，防 XSS）
    const cookie = req.headers.get('Cookie');
    if (cookie) {
        const match = cookie.match(/(?:^|;\s*)zen_token=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
    }

    // 兼容旧版 Authorization: Bearer header
    const authorization = req.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        return authorization.slice(7);
    }

    return null;
}

/**
 * 从 WebSocket 升级请求的 Cookie 中提取 token
 * WebSocket 升级时浏览器会自动携带同源 Cookie，无需 URL 参数
 */
export function extractTokenFromCookie(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/(?:^|;\s*)zen_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Hono 认证中间件
 * 支持 HttpOnly Cookie 和 Authorization: Bearer header（向后兼容）
 * 校验失败返回 401 JSON 响应
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
    const token = extractTokenFromRequest(c.req.raw);

    if (!token) {
        return c.json({ error: 'Unauthorized', message: 'Missing authentication token' }, 401);
    }

    const valid = await validateToken(token);
    if (!valid) {
        return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }

    await next();
}
