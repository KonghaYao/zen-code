/**
 * Provider 存储层
 * 使用 SQLite 存储提供商配置
 */

import Database from 'bun:sqlite';
import { encryptApiKey, decryptApiKey, maskApiKey } from './encryption.js';

// ========================================
// Types
// ========================================

export type ProviderType = 'openai' | 'anthropic';

export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    apiKey: string; // 返回时脱敏
    baseUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProviderInput {
    name: string;
    type: ProviderType;
    apiKey: string;
    baseUrl: string;
    isActive?: boolean;
}

export interface ProviderUpdateInput {
    id: string;
    name?: string;
    type?: ProviderType;
    apiKey?: string;
    baseUrl?: string;
    isActive?: boolean;
}

interface ProviderRow {
    id: string;
    name: string;
    type: string;
    api_key_encrypted: string;
    api_key_iv: string;
    api_key_auth_tag: string;
    base_url: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}

// ========================================
// ProviderStorage Class
// ========================================

export class ProviderStorage {
    private db: Database;

    constructor(dbPath: string = './data/index.db') {
        this.db = new Database(dbPath, { create: true });
        this.db.run('PRAGMA foreign_keys = ON');
        this.db.run('PRAGMA journal_mode = WAL');
    }

    async initialize(): Promise<void> {
        this.createTables();
    }

    private createTables(): void {
        // 创建 providers 表
        this.db.run(`
            CREATE TABLE IF NOT EXISTS providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL CHECK(type IN ('openai', 'anthropic')),
                api_key_encrypted TEXT NOT NULL,
                api_key_iv TEXT NOT NULL,
                api_key_auth_tag TEXT NOT NULL,
                base_url TEXT NOT NULL,
                is_active INTEGER DEFAULT 0 CHECK(is_active IN (0, 1)),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 创建索引
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type);`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_providers_is_active ON providers(is_active);`);

        // 创建触发器：确保仅有一个活跃提供商（更新时）
        this.db.run(`
            CREATE TRIGGER IF NOT EXISTS ensure_single_active_provider_update
            AFTER UPDATE OF is_active ON providers
            WHEN NEW.is_active = 1
            BEGIN
                UPDATE providers SET is_active = 0 WHERE id != NEW.id AND is_active = 1;
            END;
        `);

        // 创建触发器：确保仅有一个活跃提供商（插入时）
        this.db.run(`
            CREATE TRIGGER IF NOT EXISTS ensure_single_active_provider_insert
            AFTER INSERT ON providers
            WHEN NEW.is_active = 1
            BEGIN
                UPDATE providers SET is_active = 0 WHERE id != NEW.id AND is_active = 1;
            END;
        `);
    }

    // ========================================
    // CRUD Operations
    // ========================================

    async getAll(): Promise<Provider[]> {
        const stmt = this.db.prepare('SELECT * FROM providers ORDER BY created_at DESC');
        const rows = stmt.all() as ProviderRow[];
        return rows.map((row) => this.rowToProvider(row));
    }

    async getById(id: string): Promise<Provider | null> {
        const stmt = this.db.prepare('SELECT * FROM providers WHERE id = ?');
        const row = stmt.get(id) as ProviderRow | null | undefined;
        return row ? this.rowToProvider(row) : null;
    }

    async getByName(name: string): Promise<Provider | null> {
        const stmt = this.db.prepare('SELECT * FROM providers WHERE name = ?');
        const row = stmt.get(name) as ProviderRow | null | undefined;
        return row ? this.rowToProvider(row) : null;
    }

    async getActive(): Promise<Provider | null> {
        const stmt = this.db.prepare('SELECT * FROM providers WHERE is_active = 1 LIMIT 1');
        const row = stmt.get() as ProviderRow | null | undefined;
        return row ? this.rowToProvider(row) : null;
    }

    async create(input: ProviderInput): Promise<Provider> {
        // 检查名称唯一性
        const existing = await this.getByName(input.name);
        if (existing) {
            throw new Error(`提供商名称 "${input.name}" 已存在`);
        }

        const id = crypto.randomUUID();
        const { encrypted, iv, authTag } = encryptApiKey(input.apiKey);
        const now = this.now();

        const stmt = this.db.prepare(`
            INSERT INTO providers (id, name, type, api_key_encrypted, api_key_iv, api_key_auth_tag, base_url, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            input.name,
            input.type,
            encrypted,
            iv,
            authTag,
            input.baseUrl,
            this.boolToInt(input.isActive ?? false),
            now,
            now,
        );

        const provider = await this.getById(id);
        if (!provider) {
            throw new Error('创建提供商失败');
        }
        return provider;
    }

    async update(input: ProviderUpdateInput): Promise<Provider> {
        const existing = await this.getById(input.id);
        if (!existing) {
            throw new Error(`提供商 "${input.id}" 不存在`);
        }

        // 如果更新名称，检查唯一性
        if (input.name && input.name !== existing.name) {
            const nameExists = await this.getByName(input.name);
            if (nameExists) {
                throw new Error(`提供商名称 "${input.name}" 已存在`);
            }
        }

        let apiKeyEncrypted: string;
        let apiKeyIv: string;
        let apiKeyAuthTag: string;

        if (input.apiKey) {
            const encrypted = encryptApiKey(input.apiKey);
            apiKeyEncrypted = encrypted.encrypted;
            apiKeyIv = encrypted.iv;
            apiKeyAuthTag = encrypted.authTag;
        } else {
            // 需要获取原始加密数据
            const stmt = this.db.prepare(
                'SELECT api_key_encrypted, api_key_iv, api_key_auth_tag FROM providers WHERE id = ?',
            );
            const row = stmt.get(input.id) as {
                api_key_encrypted: string;
                api_key_iv: string;
                api_key_auth_tag: string;
            } | null;
            if (!row) {
                throw new Error('获取原始数据失败');
            }
            apiKeyEncrypted = row.api_key_encrypted;
            apiKeyIv = row.api_key_iv;
            apiKeyAuthTag = row.api_key_auth_tag;
        }

        const stmt = this.db.prepare(`
            UPDATE providers
            SET name = ?, type = ?, api_key_encrypted = ?, api_key_iv = ?, api_key_auth_tag = ?, base_url = ?, is_active = ?, updated_at = ?
            WHERE id = ?
        `);

        stmt.run(
            input.name ?? existing.name,
            input.type ?? existing.type,
            apiKeyEncrypted,
            apiKeyIv,
            apiKeyAuthTag,
            input.baseUrl ?? existing.baseUrl,
            this.boolToInt(input.isActive ?? existing.isActive),
            this.now(),
            input.id,
        );

        const provider = await this.getById(input.id);
        if (!provider) {
            throw new Error('更新提供商失败');
        }
        return provider;
    }

    async delete(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM providers WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            throw new Error(`提供商 "${id}" 不存在`);
        }
    }

    async setActive(id: string): Promise<Provider> {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`提供商 "${id}" 不存在`);
        }

        // 使用事务确保原子性
        const transaction = this.db.transaction(() => {
            // 取消所有活跃状态
            this.db.run('UPDATE providers SET is_active = 0');
            // 设置新的活跃状态
            this.db.run('UPDATE providers SET is_active = 1, updated_at = ? WHERE id = ?', [this.now(), id]);
        });

        transaction();

        const provider = await this.getById(id);
        if (!provider) {
            throw new Error('设置活跃状态失败');
        }
        return provider;
    }

    // ========================================
    // Decrypted API Key (用于运行时)
    // ========================================

    async getDecryptedApiKey(id: string): Promise<string | null> {
        const stmt = this.db.prepare(
            'SELECT api_key_encrypted, api_key_iv, api_key_auth_tag FROM providers WHERE id = ?',
        );
        const row = stmt.get(id) as { api_key_encrypted: string; api_key_iv: string; api_key_auth_tag: string } | null;

        if (!row) {
            return null;
        }

        return decryptApiKey(row.api_key_encrypted, row.api_key_iv, row.api_key_auth_tag);
    }

    async getActiveDecryptedApiKey(): Promise<{ type: ProviderType; apiKey: string; baseUrl: string } | null> {
        const stmt = this.db.prepare(
            'SELECT id, type, api_key_encrypted, api_key_iv, api_key_auth_tag, base_url FROM providers WHERE is_active = 1 LIMIT 1',
        );
        const row = stmt.get() as {
            id: string;
            type: string;
            api_key_encrypted: string;
            api_key_iv: string;
            api_key_auth_tag: string;
            base_url: string;
        } | null;

        if (!row) {
            return null;
        }

        const apiKey = decryptApiKey(row.api_key_encrypted, row.api_key_iv, row.api_key_auth_tag);
        return {
            type: row.type as ProviderType,
            apiKey,
            baseUrl: row.base_url,
        };
    }

    // ========================================
    // Migration
    // ========================================

    async migrateFromEnvVars(): Promise<number> {
        const existingCount = (this.db.prepare('SELECT COUNT(*) as count FROM providers').get() as { count: number })
            .count;
        if (existingCount > 0) {
            return 0; // 已有数据，跳过迁移
        }

        const providers: ProviderInput[] = [];

        if (process.env.OPENAI_API_KEY) {
            providers.push({
                name: 'OpenAI (从环境变量迁移)',
                type: 'openai',
                apiKey: process.env.OPENAI_API_KEY,
                baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
                isActive: !process.env.ANTHROPIC_API_KEY,
            });
        }

        if (process.env.ANTHROPIC_API_KEY) {
            providers.push({
                name: 'Anthropic (从环境变量迁移)',
                type: 'anthropic',
                apiKey: process.env.ANTHROPIC_API_KEY,
                baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
                isActive: true,
            });
        }

        for (const provider of providers) {
            await this.create(provider);
        }

        return providers.length;
    }

    // ========================================
    // Utility Methods
    // ========================================

    private rowToProvider(row: ProviderRow): Provider {
        // 解密 API Key 后脱敏显示
        const decryptedApiKey = decryptApiKey(row.api_key_encrypted, row.api_key_iv, row.api_key_auth_tag);
        const maskedApiKey = maskApiKey(decryptedApiKey);

        return {
            id: row.id,
            name: row.name,
            type: row.type as ProviderType,
            apiKey: maskedApiKey,
            baseUrl: row.base_url,
            isActive: row.is_active === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private now(): string {
        return new Date().toISOString();
    }

    private boolToInt(value: boolean): number {
        return value ? 1 : 0;
    }

    close(): void {
        this.db.close();
    }
}
