/**
 * 远程仓库配置存储
 * 使用 SQLite 持久化 remote store 配置
 */

import Database from 'bun:sqlite';

// ========================================
// Types
// ========================================

export type RemoteStoreType = 'generic_http' | 'clawhub';

export interface RemoteStoreEntry {
    id: string;
    name: string;
    type: RemoteStoreType;
    base_url: string;
    api_key?: string;
    field_map?: string; // JSON
    paths?: string; // JSON
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface RemoteStoreInput {
    id: string;
    name: string;
    type?: RemoteStoreType;
    base_url: string;
    api_key?: string;
    field_map?: Record<string, string>;
    paths?: Record<string, string>;
    enabled?: boolean;
}

export interface RemoteStoreUpdateInput {
    id: string;
    name?: string;
    base_url?: string;
    api_key?: string;
    field_map?: Record<string, string>;
    paths?: Record<string, string>;
    enabled?: boolean;
}

// ========================================
// Storage
// ========================================

export class RemoteStoreStorage {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async initialize(): Promise<void> {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS remote_stores (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'generic_http',
                base_url TEXT NOT NULL,
                api_key TEXT,
                field_map TEXT,
                paths TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
    }

    list(): RemoteStoreEntry[] {
        return this.db.query('SELECT * FROM remote_stores ORDER BY created_at ASC').all() as RemoteStoreEntry[];
    }

    get(id: string): RemoteStoreEntry | null {
        return (this.db.query('SELECT * FROM remote_stores WHERE id = ?').get(id) as RemoteStoreEntry | null) ?? null;
    }

    insert(input: RemoteStoreInput): RemoteStoreEntry {
        const now = new Date().toISOString();
        this.db.run(
            `INSERT INTO remote_stores (id, name, type, base_url, api_key, field_map, paths, enabled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                input.id,
                input.name,
                input.type ?? 'generic_http',
                input.base_url,
                input.api_key ?? null,
                input.field_map ? JSON.stringify(input.field_map) : null,
                input.paths ? JSON.stringify(input.paths) : null,
                input.enabled !== false ? 1 : 0,
                now,
                now,
            ],
        );
        return this.get(input.id)!;
    }

    update(input: RemoteStoreUpdateInput): RemoteStoreEntry | null {
        const existing = this.get(input.id);
        if (!existing) return null;

        this.db.run(
            `UPDATE remote_stores SET
                name = ?,
                base_url = ?,
                api_key = ?,
                field_map = ?,
                paths = ?,
                enabled = ?,
                updated_at = ?
             WHERE id = ?`,
            [
                input.name ?? existing.name,
                input.base_url ?? existing.base_url,
                input.api_key !== undefined ? input.api_key : existing.api_key,
                input.field_map !== undefined ? JSON.stringify(input.field_map) : existing.field_map,
                input.paths !== undefined ? JSON.stringify(input.paths) : existing.paths,
                input.enabled !== undefined ? (input.enabled ? 1 : 0) : existing.enabled,
                new Date().toISOString(),
                input.id,
            ],
        );
        return this.get(input.id);
    }

    delete(id: string): boolean {
        const result = this.db.run('DELETE FROM remote_stores WHERE id = ?', [id]);
        return result.changes > 0;
    }
}
