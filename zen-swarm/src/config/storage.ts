/**
 * Zen Swarm MCP Storage
 *
 * Standalone SQLite storage for MCP config management
 */

import Database from 'bun:sqlite';

// MCP 配置行类型
export interface McpConfigRow {
    id: string;
    name: string;
    config: string; // JSON string
    enabled: number;
    created_at: string;
    updated_at: string;
}

// MCP 配置类型
export interface McpConfigData {
    id: string;
    name: string;
    config: Record<string, any>; // MCP server configuration
    enabled: boolean;
}

/**
 * Zen Swarm MCP Storage
 *
 * Standalone storage for MCP configuration management
 */
export class ZenSwarmMcpStorage {
    private db: Database;

    constructor(dbPath: string = './data/index.db') {
        this.db = new Database(dbPath, { create: true });
        this.db.run('PRAGMA foreign_keys = ON');
    }

    async initialize(): Promise<void> {
        this.createMcpConfigTable();
        this.createMcpConfigIndexes();
    }

    private createMcpConfigTable(): void {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS mcp_config (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                config TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);
    }

    private createMcpConfigIndexes(): void {
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_mcp_config_name ON mcp_config(name);
            CREATE INDEX IF NOT EXISTS idx_mcp_config_enabled ON mcp_config(enabled);
        `);
    }

    insertMcpConfig(data: McpConfigData): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO mcp_config (id, name, config, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(data.id, data.name, JSON.stringify(data.config), this.boolToInt(data.enabled), this.now(), this.now());

        return Promise.resolve();
    }

    getMcpConfig(id: string): Promise<McpConfigRow | null> {
        const stmt = this.db.prepare('SELECT * FROM mcp_config WHERE id = ?');
        const row = stmt.get(id) as McpConfigRow | null | undefined;
        return Promise.resolve(row ?? null);
    }

    getMcpConfigByName(name: string): Promise<McpConfigRow | null> {
        const stmt = this.db.prepare('SELECT * FROM mcp_config WHERE name = ?');
        const row = stmt.get(name) as McpConfigRow | null | undefined;
        return Promise.resolve(row ?? null);
    }

    getAllMcpConfigs(): Promise<McpConfigRow[]> {
        const stmt = this.db.prepare('SELECT * FROM mcp_config ORDER BY created_at DESC');
        const rows = stmt.all() as McpConfigRow[];
        return Promise.resolve(rows);
    }

    getEnabledMcpConfigs(): Promise<McpConfigRow[]> {
        const stmt = this.db.prepare('SELECT * FROM mcp_config WHERE enabled = 1 ORDER BY created_at DESC');
        const rows = stmt.all() as McpConfigRow[];
        return Promise.resolve(rows);
    }

    updateMcpConfig(data: McpConfigData): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE mcp_config
            SET name = ?, config = ?, enabled = ?, updated_at = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            data.name,
            JSON.stringify(data.config),
            this.boolToInt(data.enabled),
            this.now(),
            data.id,
        );

        if (result.changes === 0) {
            throw new Error(`MCP config with id ${data.id} not found`);
        }

        return Promise.resolve();
    }

    deleteMcpConfig(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM mcp_config WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            throw new Error(`MCP config with id ${id} not found`);
        }

        return Promise.resolve();
    }

    async getMcpConfigAsObject(): Promise<Record<string, any>> {
        const configs = await this.getEnabledMcpConfigs();
        const result: Record<string, any> = {};

        for (const row of configs) {
            try {
                const config = JSON.parse(row.config);
                result[row.name] = config;
            } catch (error) {
                console.warn(`Failed to parse MCP config ${row.name}:`, error);
            }
        }

        return result;
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
