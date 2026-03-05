/**
 * 前端 Token 认证工具函数
 *
 * 封装 sessionStorage 中的 token 读写，
 * 以及构造 Authorization header 的方法。
 */

const TOKEN_KEY = 'zen_token';

/**
 * 从 sessionStorage 获取当前 session token
 * 关闭标签页后自动失效
 */
export function getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * 将 token 存入 sessionStorage
 */
export function setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * 清除 sessionStorage 中的 token
 */
export function clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
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
