/**
 * Postman Storage
 * SQLite-based persistence for collections, requests, environments, history
 */

import Database from 'bun:sqlite';
import type {
    Collection,
    CollectionInput,
    CollectionRow,
    SavedRequest,
    SavedRequestInput,
    SavedRequestRow,
    UpdateSavedRequestInput,
    Environment,
    EnvironmentInput,
    EnvironmentRow,
    UpdateEnvironmentInput,
    HistoryEntry,
    HistoryEntryInput,
    HistoryRow,
    KeyValuePair,
    AuthConfig,
    RequestBody,
} from './types.js';

export class PostmanStorage {
    private db: Database;
    private _ownsDb: boolean;

    constructor(db: Database | string = './data/index.db') {
        if (typeof db === 'string') {
            this.db = new Database(db, { create: true });
            this.db.run('PRAGMA foreign_keys = ON');
            this.db.run('PRAGMA journal_mode = WAL');
            this._ownsDb = true;
        } else {
            this.db = db;
            this._ownsDb = false;
        }
    }

    async initialize(): Promise<void> {
        this.createTables();
    }

    private createTables(): void {
        // Collections
        this.db.run(`
            CREATE TABLE IF NOT EXISTS postman_collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Saved Requests
        this.db.run(`
            CREATE TABLE IF NOT EXISTS postman_requests (
                id TEXT PRIMARY KEY,
                collection_id TEXT NOT NULL,
                name TEXT NOT NULL,
                method TEXT NOT NULL DEFAULT 'GET',
                url TEXT NOT NULL DEFAULT '',
                headers TEXT NOT NULL DEFAULT '[]',
                query_params TEXT NOT NULL DEFAULT '[]',
                auth TEXT NOT NULL DEFAULT '{"type":"none"}',
                body TEXT NOT NULL DEFAULT '{"type":"none","content":""}',
                description TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (collection_id) REFERENCES postman_collections(id) ON DELETE CASCADE
            )
        `);

        // Environments
        this.db.run(`
            CREATE TABLE IF NOT EXISTS postman_environments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                variables TEXT NOT NULL DEFAULT '[]',
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // History
        this.db.run(`
            CREATE TABLE IF NOT EXISTS postman_history (
                id TEXT PRIMARY KEY,
                request_id TEXT,
                collection_id TEXT,
                name TEXT,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                headers TEXT NOT NULL DEFAULT '[]',
                query_params TEXT NOT NULL DEFAULT '[]',
                auth TEXT NOT NULL DEFAULT '{"type":"none"}',
                body TEXT NOT NULL DEFAULT '{"type":"none","content":""}',
                response_status INTEGER,
                response_status_text TEXT,
                response_headers TEXT,
                response_body TEXT,
                response_time_ms INTEGER,
                response_size_bytes INTEGER,
                error TEXT,
                executed_at TEXT NOT NULL
            )
        `);

        // Indexes
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_postman_requests_collection ON postman_requests(collection_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_postman_history_executed ON postman_history(executed_at DESC)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_postman_history_request ON postman_history(request_id)`);
    }

    // ========================================
    // Collections
    // ========================================

    async getAllCollections(): Promise<Collection[]> {
        const rows = this.db
            .prepare('SELECT * FROM postman_collections ORDER BY created_at ASC')
            .all() as CollectionRow[];
        return rows.map(this.rowToCollection);
    }

    async getCollection(id: string): Promise<Collection | null> {
        const row = this.db.prepare('SELECT * FROM postman_collections WHERE id = ?').get(id) as CollectionRow | null;
        return row ? this.rowToCollection(row) : null;
    }

    async createCollection(input: CollectionInput): Promise<Collection> {
        const now = this.now();
        this.db
            .prepare(
                `
            INSERT INTO postman_collections (id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `,
            )
            .run(input.id, input.name, input.description ?? null, now, now);
        return (await this.getCollection(input.id))!;
    }

    async updateCollection(id: string, updates: Partial<Omit<CollectionInput, 'id'>>): Promise<Collection> {
        const existing = await this.getCollection(id);
        if (!existing) throw new Error(`Collection ${id} not found`);
        this.db
            .prepare(
                `
            UPDATE postman_collections SET name = ?, description = ?, updated_at = ? WHERE id = ?
        `,
            )
            .run(
                updates.name ?? existing.name,
                updates.description !== undefined ? (updates.description ?? null) : (existing.description ?? null),
                this.now(),
                id,
            );
        return (await this.getCollection(id))!;
    }

    async deleteCollection(id: string): Promise<void> {
        const result = this.db.prepare('DELETE FROM postman_collections WHERE id = ?').run(id);
        if (result.changes === 0) throw new Error(`Collection ${id} not found`);
    }

    // ========================================
    // Saved Requests
    // ========================================

    async getRequestsByCollection(collectionId: string): Promise<SavedRequest[]> {
        const rows = this.db
            .prepare('SELECT * FROM postman_requests WHERE collection_id = ? ORDER BY sort_order ASC, created_at ASC')
            .all(collectionId) as SavedRequestRow[];
        return rows.map(this.rowToRequest);
    }

    async getRequest(id: string): Promise<SavedRequest | null> {
        const row = this.db.prepare('SELECT * FROM postman_requests WHERE id = ?').get(id) as SavedRequestRow | null;
        return row ? this.rowToRequest(row) : null;
    }

    async createRequest(input: SavedRequestInput): Promise<SavedRequest> {
        const now = this.now();
        this.db
            .prepare(
                `
            INSERT INTO postman_requests (id, collection_id, name, method, url, headers, query_params, auth, body, description, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            )
            .run(
                input.id,
                input.collection_id,
                input.name,
                input.method,
                input.url,
                JSON.stringify(input.headers ?? []),
                JSON.stringify(input.query_params ?? []),
                JSON.stringify(input.auth ?? { type: 'none' }),
                JSON.stringify(input.body ?? { type: 'none', content: '' }),
                input.description ?? null,
                input.sort_order ?? 0,
                now,
                now,
            );
        return (await this.getRequest(input.id))!;
    }

    async updateRequest(input: UpdateSavedRequestInput): Promise<SavedRequest> {
        const existing = await this.getRequest(input.id);
        if (!existing) throw new Error(`Request ${input.id} not found`);
        this.db
            .prepare(
                `
            UPDATE postman_requests
            SET name = ?, method = ?, url = ?, headers = ?, query_params = ?, auth = ?, body = ?, description = ?, sort_order = ?, updated_at = ?
            WHERE id = ?
        `,
            )
            .run(
                input.name ?? existing.name,
                input.method ?? existing.method,
                input.url ?? existing.url,
                JSON.stringify(input.headers ?? existing.headers),
                JSON.stringify(input.query_params ?? existing.query_params),
                JSON.stringify(input.auth ?? existing.auth),
                JSON.stringify(input.body ?? existing.body),
                input.description !== undefined ? (input.description ?? null) : (existing.description ?? null),
                input.sort_order ?? existing.sort_order,
                this.now(),
                input.id,
            );
        return (await this.getRequest(input.id))!;
    }

    async deleteRequest(id: string): Promise<void> {
        const result = this.db.prepare('DELETE FROM postman_requests WHERE id = ?').run(id);
        if (result.changes === 0) throw new Error(`Request ${id} not found`);
    }

    // ========================================
    // Environments
    // ========================================

    async getAllEnvironments(): Promise<Environment[]> {
        const rows = this.db
            .prepare('SELECT * FROM postman_environments ORDER BY created_at ASC')
            .all() as EnvironmentRow[];
        return rows.map(this.rowToEnvironment);
    }

    async getEnvironment(id: string): Promise<Environment | null> {
        const row = this.db.prepare('SELECT * FROM postman_environments WHERE id = ?').get(id) as EnvironmentRow | null;
        return row ? this.rowToEnvironment(row) : null;
    }

    async getActiveEnvironment(): Promise<Environment | null> {
        const row = this.db
            .prepare('SELECT * FROM postman_environments WHERE is_active = 1 LIMIT 1')
            .get() as EnvironmentRow | null;
        return row ? this.rowToEnvironment(row) : null;
    }

    async createEnvironment(input: EnvironmentInput): Promise<Environment> {
        const now = this.now();
        this.db
            .prepare(
                `
            INSERT INTO postman_environments (id, name, variables, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
            )
            .run(input.id, input.name, JSON.stringify(input.variables ?? []), input.is_active ? 1 : 0, now, now);
        return (await this.getEnvironment(input.id))!;
    }

    async updateEnvironment(input: UpdateEnvironmentInput): Promise<Environment> {
        const existing = await this.getEnvironment(input.id);
        if (!existing) throw new Error(`Environment ${input.id} not found`);
        this.db
            .prepare(
                `
            UPDATE postman_environments SET name = ?, variables = ?, is_active = ?, updated_at = ? WHERE id = ?
        `,
            )
            .run(
                input.name ?? existing.name,
                JSON.stringify(input.variables ?? existing.variables),
                input.is_active !== undefined ? (input.is_active ? 1 : 0) : existing.is_active ? 1 : 0,
                this.now(),
                input.id,
            );
        return (await this.getEnvironment(input.id))!;
    }

    async setActiveEnvironment(id: string): Promise<void> {
        // Deactivate all
        this.db.prepare('UPDATE postman_environments SET is_active = 0').run();
        // Activate the selected one
        this.db
            .prepare('UPDATE postman_environments SET is_active = 1, updated_at = ? WHERE id = ?')
            .run(this.now(), id);
    }

    async deleteEnvironment(id: string): Promise<void> {
        const result = this.db.prepare('DELETE FROM postman_environments WHERE id = ?').run(id);
        if (result.changes === 0) throw new Error(`Environment ${id} not found`);
    }

    // ========================================
    // History
    // ========================================

    async getHistory(limit: number = 50, offset: number = 0): Promise<HistoryEntry[]> {
        const rows = this.db
            .prepare('SELECT * FROM postman_history ORDER BY executed_at DESC LIMIT ? OFFSET ?')
            .all(limit, offset) as HistoryRow[];
        return rows.map(this.rowToHistory);
    }

    async getHistoryEntry(id: string): Promise<HistoryEntry | null> {
        const row = this.db.prepare('SELECT * FROM postman_history WHERE id = ?').get(id) as HistoryRow | null;
        return row ? this.rowToHistory(row) : null;
    }

    async addHistory(input: HistoryEntryInput): Promise<HistoryEntry> {
        this.db
            .prepare(
                `
            INSERT INTO postman_history (id, request_id, collection_id, name, method, url, headers, query_params, auth, body, response_status, response_status_text, response_headers, response_body, response_time_ms, response_size_bytes, error, executed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            )
            .run(
                input.id,
                input.request_id ?? null,
                input.collection_id ?? null,
                input.name ?? null,
                input.method,
                input.url,
                JSON.stringify(input.headers ?? []),
                JSON.stringify(input.query_params ?? []),
                JSON.stringify(input.auth ?? { type: 'none' }),
                JSON.stringify(input.body ?? { type: 'none', content: '' }),
                input.response_status ?? null,
                input.response_status_text ?? null,
                input.response_headers ? JSON.stringify(input.response_headers) : null,
                input.response_body ?? null,
                input.response_time_ms ?? null,
                input.response_size_bytes ?? null,
                input.error ?? null,
                input.executed_at,
            );
        return (await this.getHistoryEntry(input.id))!;
    }

    async clearHistory(before?: string): Promise<number> {
        let result;
        if (before) {
            result = this.db.prepare('DELETE FROM postman_history WHERE executed_at < ?').run(before);
        } else {
            result = this.db.prepare('DELETE FROM postman_history').run();
        }
        return result.changes;
    }

    async deleteHistoryEntry(id: string): Promise<void> {
        this.db.prepare('DELETE FROM postman_history WHERE id = ?').run(id);
    }

    // ========================================
    // Row Converters
    // ========================================

    private rowToCollection(row: CollectionRow): Collection {
        return {
            id: row.id,
            name: row.name,
            description: row.description ?? undefined,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private rowToRequest(row: SavedRequestRow): SavedRequest {
        return {
            id: row.id,
            collection_id: row.collection_id,
            name: row.name,
            method: row.method as SavedRequest['method'],
            url: row.url,
            headers: JSON.parse(row.headers || '[]') as KeyValuePair[],
            query_params: JSON.parse(row.query_params || '[]') as KeyValuePair[],
            auth: JSON.parse(row.auth || '{"type":"none"}') as AuthConfig,
            body: JSON.parse(row.body || '{"type":"none","content":""}') as RequestBody,
            description: row.description ?? undefined,
            sort_order: row.sort_order,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private rowToEnvironment(row: EnvironmentRow): Environment {
        return {
            id: row.id,
            name: row.name,
            variables: JSON.parse(row.variables || '[]') as KeyValuePair[],
            is_active: row.is_active === 1,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private rowToHistory(row: HistoryRow): HistoryEntry {
        return {
            id: row.id,
            request_id: row.request_id ?? undefined,
            collection_id: row.collection_id ?? undefined,
            name: row.name ?? undefined,
            method: row.method as HistoryEntry['method'],
            url: row.url,
            headers: JSON.parse(row.headers || '[]') as KeyValuePair[],
            query_params: JSON.parse(row.query_params || '[]') as KeyValuePair[],
            auth: JSON.parse(row.auth || '{"type":"none"}') as AuthConfig,
            body: JSON.parse(row.body || '{"type":"none","content":""}') as RequestBody,
            response_status: row.response_status ?? undefined,
            response_status_text: row.response_status_text ?? undefined,
            response_headers: row.response_headers ? JSON.parse(row.response_headers) : undefined,
            response_body: row.response_body ?? undefined,
            response_time_ms: row.response_time_ms ?? undefined,
            response_size_bytes: row.response_size_bytes ?? undefined,
            error: row.error ?? undefined,
            executed_at: row.executed_at,
        };
    }

    private now(): string {
        return new Date().toISOString();
    }

    close(): void {
        if (this._ownsDb) {
            this.db.close();
        }
    }
}
