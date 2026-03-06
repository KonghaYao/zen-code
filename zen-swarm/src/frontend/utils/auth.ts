/**
 * 前端 Token 认证工具函数 v2
 *
 * 认证流程：
 * 1. 用户输入密码，通过 hashPassword() 派生 token（SHA-256）
 * 2. token 存储在 localStorage（持久化，关闭浏览器不丢失）
 * 3. 所有 API 请求通过 getAuthHeaders() 携带 Authorization: Bearer <token>
 */

const TOKEN_KEY = 'zen_token';

/**
 * 从 localStorage 获取当前 token
 * 关闭浏览器后仍然保留
 */
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * 将 token 存入 localStorage
 */
export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 清除 localStorage 中的 token（登出时调用）
 */
export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * 构造 Authorization header 对象
 * 有 token 时返回 { Authorization: "Bearer <token>" }
 * 无 token 时返回空对象
 */
export function getAuthHeaders(): Record<string, string> {
    const token = getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

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
