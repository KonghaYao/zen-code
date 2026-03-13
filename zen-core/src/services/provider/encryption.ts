/**
 * API Key 加密工具
 * 使用 AES-256-GCM 加密存储敏感数据
 *
 * 密钥获取优先级：
 * 1. 环境变量 PROVIDER_ENCRYPTION_KEY
 * 2. 持久化密钥文件 ~/.zen-swarm/encryption.key（首次启动自动生成）
 *
 * 严禁使用硬编码默认密钥。
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ========================================
// Configuration
// ========================================

const ALGORITHM = 'aes-256-gcm';
const KEY_DIR = join(homedir(), '.zen-swarm');
const KEY_FILE = join(KEY_DIR, 'encryption.key');
// 固定盐值用于 scrypt KDF（不需要保密，但每个安装实例的随机密钥已确保安全性）
const SCRYPT_SALT = 'zen-swarm-provider-v2-salt';

/**
 * 获取或生成加密密钥
 *
 * 优先使用环境变量，否则从持久化文件读取，
 * 文件不存在时自动生成随机密钥并写入（权限 0o600）。
 */
const getEncryptionKey = (): Buffer => {
    // 优先级 1：环境变量
    const envKey = process.env.PROVIDER_ENCRYPTION_KEY;
    if (envKey) {
        return scryptSync(envKey, SCRYPT_SALT, 32);
    }

    // 优先级 2：持久化密钥文件（首次自动生成）
    if (!existsSync(KEY_FILE)) {
        mkdirSync(KEY_DIR, { recursive: true });
        const newKey = randomBytes(32).toString('hex'); // 64 字符十六进制
        writeFileSync(KEY_FILE, newKey, { encoding: 'utf-8', mode: 0o600 });
    }

    const fileKey = readFileSync(KEY_FILE, 'utf-8').trim();
    if (!fileKey || fileKey.length < 32) {
        throw new Error(
            `Invalid encryption key in ${KEY_FILE}. Delete the file to regenerate, or set PROVIDER_ENCRYPTION_KEY env var.`,
        );
    }

    return scryptSync(fileKey, SCRYPT_SALT, 32);
};

// 缓存加密密钥（进程生命周期内不变）
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

    return { valid: true };
}
