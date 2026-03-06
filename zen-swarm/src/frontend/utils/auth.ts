/**
 * 前端 Token 认证工具函数 v3
 *
 * 认证流程（Cookie 模式）：
 * 1. 用户输入密码，通过 hashPassword() 派生 token（SHA-256）
 * 2. POST /api/auth/verify → 服务端校验成功后通过 Set-Cookie 下发 HttpOnly Cookie
 * 3. 所有 API 请求使用 credentials: 'include'，浏览器自动携带 Cookie
 * 4. HttpOnly Cookie 无法被 JS 读取，防止 XSS 窃取
 *
 * 注意：登出调用 POST /api/auth/logout，服务端清除 Cookie
 */

/**
 * 将密码通过 SHA-256 派生为 token
 * 密码不会离开浏览器，只有 Hash 值发送到服务端
 *
 * @param password 用户输入的明文密码
 * @returns 64 字符的十六进制字符串（SHA-256 输出）
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取 API 请求头
 * Cookie 模式下不再需要手动附加 Authorization header，
 * 浏览器会自动携带同源 Cookie。
 * 保留此函数是为了向后兼容，返回空对象。
 */
export function getAuthHeaders(): Record<string, string> {
    return {};
}

/**
 * 登出：通知服务端清除 HttpOnly Cookie
 */
export async function logout(): Promise<void> {
    await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
    });
}

// ========================================
// 以下为向后兼容的 localStorage 清理
// 旧版本可能在 localStorage 中存储了 token，首次升级时自动清除
// ========================================

const LEGACY_TOKEN_KEY = 'zen_token';

/**
 * 清理旧版 localStorage 中的 token（升级兼容）
 * 页面加载时调用一次，将旧 token 迁移到 Cookie 模式
 */
export async function migrateLegacyToken(): Promise<boolean> {
    try {
        const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
        if (!legacyToken) return false;

        // 用旧 token 尝试登录，成功则服务端下发 Cookie
        const resp = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: legacyToken }),
        });

        if (resp.ok) {
            // 迁移成功，删除 localStorage 中的旧 token
            localStorage.removeItem(LEGACY_TOKEN_KEY);
            return true;
        }
    } catch {
        // 迁移失败，静默处理
    }
    return false;
}
