/**
 * Bun SQLite Storage Implementation
 *
 * A persistent storage backend using Bun's built-in SQLite database.
 * Data is persisted to disk and survives application restarts.
 *
 * @example
 * ```typescript
 * // Create storage with custom path
 * const storage = new BunSqliteStorage('./agents.db');
 * await storage.initialize();
 *
 * // Use default path (~/.zen-code/agents.db)
 * const storage = BunSqliteStorage.default();
 * await storage.initialize();
 * ```
 */

import Database from 'bun:sqlite';
import { z } from 'zod';
import {
    BaseStorage,
    ModelRow,
    PromptRow,
    PromptVersionRow,
    PromptWithVersion,
    ToolRow,
    MiddlewareRow,
    AgentToolRow,
    AgentMiddlewareRow,
    AgentWithRelations,
    AgentRow,
} from './abstract.js';
import { ModelSchema, PromptSchema, PromptVersionSchema, ToolSchema, MiddlewareSchema, AgentSchema } from '../index.js';
import { join } from 'path';

export class BunSqliteStorage extends BaseStorage {
    protected db: Database;
    private dbPath: string;

    constructor(dbPath?: string) {
        super();
        this.dbPath = dbPath || BunSqliteStorage.getDefaultPath();
        this.db = new Database(this.dbPath, { create: true });
        this.db.run('PRAGMA foreign_keys = ON');
    }

    /**
     * Get default database path
     */
    static getDefaultPath(): string {
        const home = process.env.HOME || process.env.USERPROFILE || '.';
        return join(home, '.zen-code', 'agents.db');
    }

    /**
     * Create storage with default path
     */
    static default(): BunSqliteStorage {
        return new BunSqliteStorage();
    }

    // ========================================
    // Lifecycle
    // ========================================
    async initialize(): Promise<void> {
        this.createTables();
        this.createIndexes();
    }

    private createTables(): void {
        this.db.run(`
            -- Models table
            CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY,
                model_name TEXT NOT NULL,
                model_provider TEXT NOT NULL,
                stream_usage INTEGER NOT NULL DEFAULT 0,
                enable_thinking INTEGER NOT NULL DEFAULT 0,
                temperature REAL NOT NULL DEFAULT 0.7,
                max_tokens INTEGER NOT NULL DEFAULT 4096,
                top_p REAL NOT NULL DEFAULT 1.0,
                frequency_penalty REAL NOT NULL DEFAULT 0.0,
                presence_penalty REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Prompts table (main table)
            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                current_version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Prompt versions table (content storage)
            CREATE TABLE IF NOT EXISTS prompt_versions (
                id TEXT PRIMARY KEY,
                prompt_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                change_note TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
                UNIQUE(prompt_id, version)
            );

            -- Tools table
            CREATE TABLE IF NOT EXISTS tools (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                parameters TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Middlewares table
            CREATE TABLE IF NOT EXISTS middlewares (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                parameters TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Agents table
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                system_prompt_id TEXT NOT NULL,
                model_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (system_prompt_id) REFERENCES prompts(id),
                FOREIGN KEY (model_id) REFERENCES models(id)
            );

            -- Agent-Tools junction table
            CREATE TABLE IF NOT EXISTS agent_tools (
                agent_id TEXT NOT NULL,
                tool_id TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                custom_params TEXT,
                PRIMARY KEY (agent_id, tool_id),
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
            );

            -- Agent-Middlewares junction table
            CREATE TABLE IF NOT EXISTS agent_middlewares (
                agent_id TEXT NOT NULL,
                middleware_id TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                custom_params TEXT,
                PRIMARY KEY (agent_id, middleware_id),
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                FOREIGN KEY (middleware_id) REFERENCES middlewares(id) ON DELETE CASCADE
            );
        `);
    }

    private createIndexes(): void {
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
            CREATE INDEX IF NOT EXISTS idx_prompt_versions ON prompt_versions(prompt_id, version DESC);
            CREATE INDEX IF NOT EXISTS idx_agents_model_id ON agents(model_id);
            CREATE INDEX IF NOT EXISTS idx_agents_system_prompt_id ON agents(system_prompt_id);
        `);
    }

    close(): Promise<void> {
        return Promise.resolve(this.db.close());
    }

    // ========================================
    // Transactions
    // ========================================
    async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
        const tx = this.db.transaction(fn);
        return tx();
    }

    // ========================================
    // Models
    // ========================================
    insertModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO models (id, model_name, model_provider, stream_usage, enable_thinking,
                              temperature, max_tokens, top_p, frequency_penalty, presence_penalty,
                              created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            data.id,
            data.model_name,
            data.model_provider,
            this.boolToInt(data.stream_usage),
            this.boolToInt(data.enable_thinking),
            data.temperature,
            data.max_tokens,
            data.top_p,
            data.frequency_penalty,
            data.presence_penalty,
            this.now(),
            this.now(),
        );

        return Promise.resolve();
    }

    getModel(id: string): Promise<ModelRow | undefined> {
        const stmt = this.db.prepare('SELECT * FROM models WHERE id = ?');
        const row = stmt.get(id) as ModelRow | undefined;
        return Promise.resolve(row);
    }

    getAllModels(): Promise<ModelRow[]> {
        const stmt = this.db.prepare('SELECT * FROM models ORDER BY created_at DESC');
        const rows = stmt.all() as ModelRow[];
        return Promise.resolve(rows);
    }

    updateModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE models
            SET model_name = ?, model_provider = ?, stream_usage = ?, enable_thinking = ?,
                temperature = ?, max_tokens = ?, top_p = ?, frequency_penalty = ?, presence_penalty = ?,
                updated_at = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            data.model_name,
            data.model_provider,
            this.boolToInt(data.stream_usage),
            this.boolToInt(data.enable_thinking),
            data.temperature,
            data.max_tokens,
            data.top_p,
            data.frequency_penalty,
            data.presence_penalty,
            this.now(),
            data.id,
        );

        if (result.changes === 0) {
            throw new Error(`Model with id ${data.id} not found`);
        }

        return Promise.resolve();
    }

    deleteModel(id: string): Promise<void> {
        return this.transaction(() => {
            const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM agents WHERE model_id = ?');
            const { count } = countStmt.get(id) as { count: number };

            if (count > 0) {
                throw new Error(`Cannot delete model ${id}: it is referenced by ${count} agent(s)`);
            }

            const stmt = this.db.prepare('DELETE FROM models WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes === 0) {
                throw new Error(`Model with id ${id} not found`);
            }
        });
    }

    // ========================================
    // Prompts
    // ========================================
    insertPrompt(data: z.infer<typeof PromptSchema>, content: string, changeNote?: string): Promise<void> {
        return this.transaction(() => {
            // Insert prompt main record
            const promptStmt = this.db.prepare(`
                INSERT INTO prompts (id, name, current_version, created_at, updated_at)
                VALUES (?, ?, 1, ?, ?)
            `);
            promptStmt.run(data.id, data.name, this.now(), this.now());

            // Insert initial version
            const versionStmt = this.db.prepare(`
                INSERT INTO prompt_versions (id, prompt_id, version, content, change_note, created_at)
                VALUES (?, ?, 1, ?, ?, ?)
            `);
            const versionId = `${data.id}-v1`;
            versionStmt.run(versionId, data.id, content, changeNote || null, this.now());
        });
    }

    getPrompt(id: string): Promise<PromptRow | undefined> {
        const stmt = this.db.prepare('SELECT * FROM prompts WHERE id = ?');
        const row = stmt.get(id) as PromptRow | undefined;
        return Promise.resolve(row);
    }

    getPromptByName(name: string): Promise<PromptRow | undefined> {
        const stmt = this.db.prepare('SELECT * FROM prompts WHERE name = ?');
        const row = stmt.get(name) as PromptRow | undefined;
        return Promise.resolve(row);
    }

    getPromptWithCurrentVersion(id: string): Promise<PromptWithVersion | undefined> {
        const stmt = this.db.prepare(`
            SELECT p.*, pv.content, pv.metadata, pv.change_note
            FROM prompts p
            JOIN prompt_versions pv ON p.id = pv.prompt_id AND p.current_version = pv.version
            WHERE p.id = ?
        `);
        const row = stmt.get(id) as PromptWithVersion | undefined;
        return Promise.resolve(row);
    }

    getPromptWithCurrentVersionByName(name: string): Promise<PromptWithVersion | undefined> {
        const stmt = this.db.prepare(`
            SELECT p.*, pv.content, pv.metadata, pv.change_note
            FROM prompts p
            JOIN prompt_versions pv ON p.id = pv.prompt_id AND p.current_version = pv.version
            WHERE p.name = ?
        `);
        const row = stmt.get(name) as PromptWithVersion | undefined;
        return Promise.resolve(row);
    }

    getAllPrompts(): Promise<PromptRow[]> {
        const stmt = this.db.prepare('SELECT * FROM prompts ORDER BY created_at DESC');
        const rows = stmt.all() as PromptRow[];
        return Promise.resolve(rows);
    }

    getAllPromptsWithCurrentVersion(): Promise<PromptWithVersion[]> {
        const stmt = this.db.prepare(`
            SELECT p.*, pv.content, pv.metadata, pv.change_note
            FROM prompts p
            JOIN prompt_versions pv ON p.id = pv.prompt_id AND p.current_version = pv.version
            ORDER BY p.created_at DESC
        `);
        const rows = stmt.all() as PromptWithVersion[];
        return Promise.resolve(rows);
    }

    updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE prompts SET name = ?, updated_at = ? WHERE id = ?
        `);
        const result = stmt.run(data.name, this.now(), data.id);

        if (result.changes === 0) {
            throw new Error(`Prompt with id ${data.id} not found`);
        }

        return Promise.resolve();
    }

    deletePrompt(id: string): Promise<void> {
        return this.transaction(() => {
            const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM agents WHERE system_prompt_id = ?');
            const { count } = countStmt.get(id) as { count: number };

            if (count > 0) {
                throw new Error(`Cannot delete prompt ${id}: it is referenced by ${count} agent(s)`);
            }

            const stmt = this.db.prepare('DELETE FROM prompts WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes === 0) {
                throw new Error(`Prompt with id ${id} not found`);
            }
        });
    }

    // ========================================
    // Prompt Versions
    // ========================================
    createPromptVersion(promptId: string, content: string, changeNote?: string): Promise<PromptVersionRow> {
        return this.transaction(() => {
            // Get current prompt
            const prompt = this.db.prepare('SELECT * FROM prompts WHERE id = ?').get(promptId) as PromptRow | undefined;
            if (!prompt) {
                throw new Error(`Prompt with id ${promptId} not found`);
            }

            const newVersion = prompt.current_version + 1;
            const versionId = `${promptId}-v${newVersion}`;
            const now = this.now();

            // Insert new version
            const versionStmt = this.db.prepare(`
                INSERT INTO prompt_versions (id, prompt_id, version, content, change_note, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            versionStmt.run(versionId, promptId, newVersion, content, changeNote || null, now);

            // Update prompt's current_version
            const updateStmt = this.db.prepare(`
                UPDATE prompts SET current_version = ?, updated_at = ? WHERE id = ?
            `);
            updateStmt.run(newVersion, now, promptId);

            return {
                id: versionId,
                prompt_id: promptId,
                version: newVersion,
                content,
                metadata: null,
                change_note: changeNote || null,
                created_at: now,
            };
        });
    }

    getPromptVersion(promptId: string, version: number): Promise<PromptVersionRow | undefined> {
        const stmt = this.db.prepare(`
            SELECT * FROM prompt_versions WHERE prompt_id = ? AND version = ?
        `);
        const row = stmt.get(promptId, version) as PromptVersionRow | undefined;
        return Promise.resolve(row);
    }

    getPromptVersions(promptId: string): Promise<PromptVersionRow[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version DESC
        `);
        const rows = stmt.all(promptId) as PromptVersionRow[];
        return Promise.resolve(rows);
    }

    rollbackPromptVersion(promptId: string, targetVersion: number): Promise<void> {
        return this.transaction(() => {
            // Check if target version exists
            const version = this.db
                .prepare(
                    `
                SELECT * FROM prompt_versions WHERE prompt_id = ? AND version = ?
            `,
                )
                .get(promptId, targetVersion) as PromptVersionRow | undefined;

            if (!version) {
                throw new Error(`Version ${targetVersion} not found for prompt ${promptId}`);
            }

            // Update current_version
            const stmt = this.db.prepare(`
                UPDATE prompts SET current_version = ?, updated_at = ? WHERE id = ?
            `);
            const result = stmt.run(targetVersion, this.now(), promptId);

            if (result.changes === 0) {
                throw new Error(`Prompt with id ${promptId} not found`);
            }
        });
    }

    // ========================================
    // Tools
    // ========================================
    insertTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO tools (id, name, description, parameters, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(data.id, data.name, data.description, null, this.now(), this.now());

        return Promise.resolve();
    }

    getTool(id: string): Promise<ToolRow | undefined> {
        const stmt = this.db.prepare('SELECT * FROM tools WHERE id = ?');
        const row = stmt.get(id) as ToolRow | undefined;
        return Promise.resolve(row);
    }

    getAllTools(): Promise<ToolRow[]> {
        const stmt = this.db.prepare('SELECT * FROM tools ORDER BY created_at DESC');
        const rows = stmt.all() as ToolRow[];
        return Promise.resolve(rows);
    }

    updateTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE tools
            SET name = ?, description = ?, updated_at = ?
            WHERE id = ?
        `);

        const result = stmt.run(data.name, data.description, this.now(), data.id);

        if (result.changes === 0) {
            throw new Error(`Tool with id ${data.id} not found`);
        }

        return Promise.resolve();
    }

    deleteTool(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM tools WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            throw new Error(`Tool with id ${id} not found`);
        }

        return Promise.resolve();
    }

    // ========================================
    // Middlewares
    // ========================================
    insertMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO middlewares (id, name, description, parameters, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(data.id, data.name, data.description, null, this.now(), this.now());

        return Promise.resolve();
    }

    getMiddleware(id: string): Promise<MiddlewareRow | undefined> {
        const stmt = this.db.prepare('SELECT * FROM middlewares WHERE id = ?');
        const row = stmt.get(id) as MiddlewareRow | undefined;
        return Promise.resolve(row);
    }

    getAllMiddlewares(): Promise<MiddlewareRow[]> {
        const stmt = this.db.prepare('SELECT * FROM middlewares ORDER BY created_at DESC');
        const rows = stmt.all() as MiddlewareRow[];
        return Promise.resolve(rows);
    }

    updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE middlewares
            SET name = ?, description = ?, updated_at = ?
            WHERE id = ?
        `);

        const result = stmt.run(data.name, data.description, this.now(), data.id);

        if (result.changes === 0) {
            throw new Error(`Middleware with id ${data.id} not found`);
        }

        return Promise.resolve();
    }

    deleteMiddleware(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM middlewares WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            throw new Error(`Middleware with id ${id} not found`);
        }

        return Promise.resolve();
    }

    // ========================================
    // Agents
    // ========================================
    insertAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        return this.transaction(() => {
            const stmt = this.db.prepare(`
                INSERT INTO agents (id, name, description, system_prompt_id, model_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(data.id, data.name, data.description, data.system_prompt, data.model, this.now(), this.now());

            // Insert tools
            const toolStmt = this.db.prepare(`
                INSERT OR REPLACE INTO agent_tools (agent_id, tool_id, enabled, custom_params)
                VALUES (?, ?, ?, ?)
            `);

            for (const [toolId, value] of Object.entries(data.tools)) {
                toolStmt.run(
                    data.id,
                    toolId,
                    typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    typeof value === 'boolean' ? null : this.safeStringify(value),
                );
            }

            // Insert middlewares
            const middlewareStmt = this.db.prepare(`
                INSERT OR REPLACE INTO agent_middlewares (agent_id, middleware_id, enabled, custom_params)
                VALUES (?, ?, ?, ?)
            `);

            for (const [midId, value] of Object.entries(data.middleware)) {
                middlewareStmt.run(
                    data.id,
                    midId,
                    typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    typeof value === 'boolean' ? null : this.safeStringify(value),
                );
            }
        });
    }

    async getAgent(id: string): Promise<
        | (AgentRow & {
              tools: Record<string, boolean | any>;
              middlewares: Record<string, boolean | any>;
          })
        | undefined
    > {
        const agentStmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
        const agent = agentStmt.get(id) as AgentRow | undefined;

        if (!agent) return undefined;

        // Get tools
        const toolStmt = this.db.prepare('SELECT * FROM agent_tools WHERE agent_id = ?');
        const toolRows = toolStmt.all(id) as AgentToolRow[];

        const tools: Record<string, boolean | any> = {};
        for (const row of toolRows) {
            if (row.custom_params) {
                tools[row.tool_id] = this.safeParse(row.custom_params);
            } else {
                tools[row.tool_id] = this.intToBool(row.enabled);
            }
        }

        // Get middlewares
        const middlewareStmt = this.db.prepare('SELECT * FROM agent_middlewares WHERE agent_id = ?');
        const middlewareRows = middlewareStmt.all(id) as AgentMiddlewareRow[];

        const middlewares: Record<string, boolean | any> = {};
        for (const row of middlewareRows) {
            if (row.custom_params) {
                middlewares[row.middleware_id] = this.safeParse(row.custom_params);
            } else {
                middlewares[row.middleware_id] = this.intToBool(row.enabled);
            }
        }

        return { ...agent, tools, middlewares };
    }

    async getAllAgents(): Promise<
        (AgentRow & { tools: Record<string, boolean | any>; middlewares: Record<string, boolean | any> })[]
    > {
        const agentStmt = this.db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
        const agents = agentStmt.all() as AgentRow[];

        const result: (AgentRow & {
            tools: Record<string, boolean | any>;
            middlewares: Record<string, boolean | any>;
        })[] = [];

        for (const agent of agents) {
            const agentData = await this.getAgent(agent.id);
            if (agentData) {
                result.push(agentData);
            }
        }

        return result;
    }

    updateAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        return this.transaction(() => {
            const stmt = this.db.prepare(`
                UPDATE agents
                SET name = ?, description = ?, system_prompt_id = ?, model_id = ?, updated_at = ?
                WHERE id = ?
            `);

            const result = stmt.run(data.name, data.description, data.system_prompt, data.model, this.now(), data.id);

            if (result.changes === 0) {
                throw new Error(`Agent with id ${data.id} not found`);
            }

            // Update tools
            const deleteToolsStmt = this.db.prepare('DELETE FROM agent_tools WHERE agent_id = ?');
            deleteToolsStmt.run(data.id);

            const toolStmt = this.db.prepare(`
                INSERT INTO agent_tools (agent_id, tool_id, enabled, custom_params)
                VALUES (?, ?, ?, ?)
            `);

            for (const [toolId, value] of Object.entries(data.tools)) {
                toolStmt.run(
                    data.id,
                    toolId,
                    typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    typeof value === 'boolean' ? null : this.safeStringify(value),
                );
            }

            // Update middlewares
            const deleteMiddlewaresStmt = this.db.prepare('DELETE FROM agent_middlewares WHERE agent_id = ?');
            deleteMiddlewaresStmt.run(data.id);

            const middlewareStmt = this.db.prepare(`
                INSERT INTO agent_middlewares (agent_id, middleware_id, enabled, custom_params)
                VALUES (?, ?, ?, ?)
            `);

            for (const [midId, value] of Object.entries(data.middleware)) {
                middlewareStmt.run(
                    data.id,
                    midId,
                    typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    typeof value === 'boolean' ? null : this.safeStringify(value),
                );
            }
        });
    }

    deleteAgent(id: string): Promise<void> {
        return this.transaction(() => {
            const stmt = this.db.prepare('DELETE FROM agents WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes === 0) {
                throw new Error(`Agent with id ${id} not found`);
            }
        });
    }

    // ========================================
    // Query Helpers
    // ========================================
    async getAgentWithDependencies(id: string): Promise<AgentWithRelations | undefined> {
        const agent = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRow | undefined;

        if (!agent) return undefined;

        const model = this.db.prepare('SELECT * FROM models WHERE id = ?').get(agent.model_id) as ModelRow;
        if (!model) throw new Error(`Model ${agent.model_id} not found`);

        const systemPrompt = this.db
            .prepare(
                `
            SELECT p.*, pv.content, pv.metadata, pv.change_note
            FROM prompts p
            JOIN prompt_versions pv ON p.id = pv.prompt_id AND p.current_version = pv.version
            WHERE p.id = ?
        `,
            )
            .get(agent.system_prompt_id) as PromptWithVersion;
        if (!systemPrompt) throw new Error(`Prompt ${agent.system_prompt_id} not found`);

        return { agent, model, systemPrompt };
    }
}
