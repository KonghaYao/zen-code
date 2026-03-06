/**
 * Token 认证模块 v2
 *
 * 认证流程：
 * 1. 用户在浏览器前端输入密码，前端 SHA-256 派生 token
 * 2. 首次注册时，前端将 token 发送到 /api/auth/register，服务端保存到 ~/.zen-swarm/token 文件
 * 3. 后续登录时，前端同样派生 token，通过 /api/auth/verify 与文件中的 token 比对
 * 4. 所有 /api/* 请求需在 Authorization: Bearer <token> header 中携带 token
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Context, Next } from 'hono';

const TOKEN_DIR = join(homedir(), '.zen-swarm');
const TOKEN_FILE = join(TOKEN_DIR, 'token');

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
    // 命中缓存
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
    // 更新内存缓存，避免下次读文件
    cachedToken = token;
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
 * 从 Authorization: Bearer <token> header 中提取并校验 token
 * 校验失败返回 401 JSON 响应
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
    const authorization = c.req.header('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized', message: 'Missing Authorization header' }, 401);
    }

    const token = authorization.slice(7); // 去掉 "Bearer "

    const valid = await validateToken(token);
    if (!valid) {
        return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }

    await next();
}
