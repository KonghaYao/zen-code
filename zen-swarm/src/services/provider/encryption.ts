/**
 * API Key 加密工具
 * 使用 AES-256-GCM 加密存储敏感数据
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// ========================================
// Configuration
// ========================================

const ALGORITHM = 'aes-256-gcm';

// 从环境变量获取加密密钥（32 bytes）
// 如果没有设置，使用默认密钥（生产环境应该设置）
const getEncryptionKey = (): Buffer => {
    const key = process.env.PROVIDER_ENCRYPTION_KEY;
    if (key) {
        // 使用 scrypt 派生密钥
        return scryptSync(key, 'zen-swarm-provider-salt', 32);
    }
    // 默认密钥（仅用于开发环境）
    return scryptSync('zen-swarm-default-key-please-change-in-production', 'zen-swarm-provider-salt', 32);
};

// 缓存加密密钥
let cachedKey: Buffer | null = null;

const getOrCreateKey = (): Buffer => {
    if (!cachedKey) {
        cachedKey = getEncryptionKey();
    }
    return cachedKey;
};

// ========================================
// Encryption
// ========================================

export interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
}

/**
 * 加密 API Key
 * @param plaintext 原始文本
 * @returns 加密后的数据（包含 IV 和 Auth Tag）
 */
export function encryptApiKey(plaintext: string): EncryptedData {
    const key = getOrCreateKey();
    const iv = randomBytes(16);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}

/**
 * 解密 API Key
 * @param encrypted 加密文本
 * @param iv 初始化向量（hex 格式）
 * @param authTag 认证标签（hex 格式）
 * @returns 原始文本
 */
export function decryptApiKey(encrypted: string, iv: string, authTag: string): string {
    const key = getOrCreateKey();

    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * 脱敏显示 API Key
 * @param apiKey 原始 API Key
 * @returns 脱敏后的 API Key（如 sk-t**********6789）
 */
export function maskApiKey(apiKey: string): string {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '****';
    return `${apiKey.slice(0, 4)}${'*'.repeat(Math.min(apiKey.length - 8, 20))}${apiKey.slice(-4)}`;
}

/**
 * 验证 API Key 格式
 * @param apiKey API Key
 * @param type 提供商类型
 * @returns 是否有效
 */
export function validateApiKeyFormat(apiKey: string, type: 'openai' | 'anthropic'): { valid: boolean; error?: string } {
    if (!apiKey || apiKey.length < 10) {
        return { valid: false, error: 'API Key 长度不足' };
    }

    // OpenAI API Key 通常以 sk- 开头
    if (type === 'openai' && !apiKey.startsWith('sk-')) {
        return { valid: false, error: 'OpenAI API Key 通常以 sk- 开头' };
    }

    // Anthropic API Key 通常以 sk-ant- 开头
    if (type === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
        // 不强制要求，只做提示
        // return { valid: false, error: 'Anthropic API Key 通常以 sk-ant- 开头' };
    }

    return { valid: true };
}
