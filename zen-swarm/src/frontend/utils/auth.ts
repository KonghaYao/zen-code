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
 * 纯 JS SHA-256 实现，用于 crypto.subtle 不可用时的降级（HTTP 非 localhost 场景）
 */
function sha256Pure(data: Uint8Array): string {
    // SHA-256 常量 K
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
        0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
        0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
        0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
        0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
        0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

    let h0 = 0x6a09e667,
        h1 = 0xbb67ae85,
        h2 = 0x3c6ef372,
        h3 = 0xa54ff53a;
    let h4 = 0x510e527f,
        h5 = 0x9b05688c,
        h6 = 0x1f83d9ab,
        h7 = 0x5be0cd19;

    const n = data.length;
    const totalLen = Math.ceil((n + 9) / 64) * 64;
    const msg = new Uint8Array(totalLen);
    msg.set(data);
    msg[n] = 0x80;
    const view = new DataView(msg.buffer);
    // 写入消息长度（比特数），密码长度不超过 2^29 字节，高 32 位恒为 0
    view.setUint32(totalLen - 4, (n * 8) >>> 0, false);

    for (let i = 0; i < totalLen; i += 64) {
        const w = new Uint32Array(64);
        for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
        for (let j = 16; j < 64; j++) {
            const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
            const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7];
        for (let j = 0; j < 64; j++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) >>> 0;
            [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
        }
        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
        h5 = (h5 + f) >>> 0;
        h6 = (h6 + g) >>> 0;
        h7 = (h7 + h) >>> 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map((v) => v.toString(16).padStart(8, '0')).join('');
}

/**
 * 将密码通过 SHA-256 派生为 token
 * 密码不会离开浏览器，只有 Hash 值发送到服务端
 *
 * 优先使用原生 Web Crypto API（安全上下文），
 * 降级到纯 JS 实现（HTTP 局域网访问时 crypto.subtle 不可用）
 *
 * @param password 用户输入的明文密码
 * @returns 64 字符的十六进制字符串（SHA-256 输出）
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    if (globalThis.crypto?.subtle) {
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
    // 降级：HTTP 局域网访问时 crypto.subtle 不可用，使用纯 JS 实现
    return sha256Pure(data);
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
