/**
 * Workspace Storage
 *
 * SQLite 存储层，管理 Workspace 数据
 */

import Database from 'bun:sqlite';

// ========================================
// Types
// ========================================

export interface WorkspaceRow {
    id: string;
    name: string;
    root_path: string;
    description: string | null;
    created_at: string;
    last_accessed_at: string | null;
    updated_at: string;
}

export interface Workspace {
    id: string;
    name: string;
    rootPath: string;
    description?: string;
    createdAt: string;
    lastAccessedAt?: string;
    updatedAt: string;
}

export interface CreateWorkspaceInput {
    id?: string;
    name: string;
    rootPath: string;
    description?: string;
}

export interface UpdateWorkspaceInput {
    id: string;
    name?: string;
    description?: string;
}

// ========================================
// Storage Class
// ========================================

export class WorkspaceStorage {
    private db: Database;

    constructor(dbPath: string = './data/index.db') {
        this.db = new Database(dbPath, { create: true });
        this.db.run('PRAGMA foreign_keys = ON');
    }

    async initialize(): Promise<void> {
        this.createWorkspaceTable();
        this.createWorkspaceIndexes();
    }

    private createWorkspaceTable(): void {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                root_path TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                last_accessed_at TEXT,
                updated_at TEXT NOT NULL
            );
        `);
    }

    private createWorkspaceIndexes(): void {
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);
        `);
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_workspaces_last_accessed ON workspaces(last_accessed_at DESC);
        `);
    }

    // ========================================
    // CRUD Operations
    // ========================================

    async getAllWorkspaces(): Promise<Workspace[]> {
        // 按创建时间排序，顺序固定，不会因为访问而改变
        const stmt = this.db.prepare(`
            SELECT * FROM workspaces
            ORDER BY created_at DESC
        `);
        const rows = stmt.all() as WorkspaceRow[];
        return rows.map((row) => this.rowToWorkspace(row));
    }

    async getWorkspaceById(id: string): Promise<Workspace | null> {
        const stmt = this.db.prepare('SELECT * FROM workspaces WHERE id = ?');
        const row = stmt.get(id) as WorkspaceRow | null | undefined;
        return row ? this.rowToWorkspace(row) : null;
    }

    async getWorkspaceByName(name: string): Promise<Workspace | null> {
        const stmt = this.db.prepare('SELECT * FROM workspaces WHERE name = ?');
        const row = stmt.get(name) as WorkspaceRow | null | undefined;
        return row ? this.rowToWorkspace(row) : null;
    }

    async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
        // Check if name already exists
        const existing = await this.getWorkspaceByName(input.name);
        if (existing) {
            throw new Error(`Workspace with name "${input.name}" already exists`);
        }

        // Validate path exists
        const fs = await import('fs/promises');
        try {
            const stat = await fs.stat(input.rootPath);
            if (!stat.isDirectory()) {
                throw new Error(`Path "${input.rootPath}" is not a directory`);
            }
        } catch (error) {
            throw new Error(`Path "${input.rootPath}" does not exist or is not accessible`);
        }

        const id = input.id || crypto.randomUUID();
        const now = this.now();

        const stmt = this.db.prepare(`
            INSERT INTO workspaces (id, name, root_path, description, created_at, last_accessed_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            input.name,
            input.rootPath,
            input.description ?? null,
            now,
            null, // last_accessed_at is no longer used
            now,
        );

        const created = await this.getWorkspaceById(id);
        if (!created) {
            throw new Error('Failed to create workspace');
        }

        return created;
    }

    async updateWorkspace(input: UpdateWorkspaceInput): Promise<Workspace> {
        const existing = await this.getWorkspaceById(input.id);
        if (!existing) {
            throw new Error(`Workspace with id "${input.id}" not found`);
        }

        // Check if new name already exists for a different workspace
        if (input.name && input.name !== existing.name) {
            const nameConflict = await this.getWorkspaceByName(input.name);
            if (nameConflict) {
                throw new Error(`Workspace with name "${input.name}" already exists`);
            }
        }

        const stmt = this.db.prepare(`
            UPDATE workspaces
            SET name = ?, description = ?, updated_at = ?
            WHERE id = ?
        `);

        stmt.run(input.name ?? existing.name, input.description ?? existing.description ?? null, this.now(), input.id);

        const updated = await this.getWorkspaceById(input.id);
        if (!updated) {
            throw new Error('Failed to update workspace');
        }

        return updated;
    }

    async deleteWorkspace(id: string): Promise<void> {
        const existing = await this.getWorkspaceById(id);
        if (!existing) {
            throw new Error(`Workspace with id "${id}" not found`);
        }

        const stmt = this.db.prepare('DELETE FROM workspaces WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            throw new Error(`Failed to delete workspace with id "${id}"`);
        }
    }

    async validatePath(path: string): Promise<{ valid: boolean; error?: string }> {
        console.log('[validatePath] Checking path:', path);
        const fs = await import('fs/promises');
        try {
            const stat = await fs.stat(path);
            console.log('[validatePath] Path stats:', { isDirectory: stat.isDirectory(), isFile: stat.isFile() });

            if (!stat.isDirectory()) {
                return { valid: false, error: 'Path is not a directory' };
            }
            console.log('[validatePath] Path is valid directory');
            return { valid: true };
        } catch (error: any) {
            console.error('[validatePath] Error:', error);
            return { valid: false, error: 'Path does not exist or is not accessible' };
        }
    }

    // ========================================
    // Utility Methods
    // ========================================

    private rowToWorkspace(row: WorkspaceRow): Workspace {
        return {
            id: row.id,
            name: row.name,
            rootPath: row.root_path,
            description: row.description ?? undefined,
            createdAt: row.created_at,
            lastAccessedAt: row.last_accessed_at ?? undefined,
            updatedAt: row.updated_at,
        };
    }

    private now(): string {
        return new Date().toISOString();
    }

    close(): void {
        this.db.close();
    }
}
