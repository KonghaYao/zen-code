import { Database } from 'bun:sqlite';
import { ModelSchema, PromptSchema, ToolSchema, MiddlewareSchema, AgentSchema } from '../index.js';
import { z } from 'zod';
import {
    BaseStorage,
    IStorage,
    ModelRow,
    PromptRow,
    ToolRow,
    MiddlewareRow,
    AgentToolRow,
    AgentMiddlewareRow,
    AgentWithRelations,
} from './abstract.js';

/**
 * Data Access Layer for Agent Storage
 *
 * Uses Bun's built-in SQLite module for efficient database operations.
 * All schemas (models, prompts, tools, middlewares, agents) are persisted
 * to SQLite, while implementations remain in-memory.
 *
 * @example
 * ```typescript
 * const storage = new AgentStorage('./agents.db');
 * storage.insertModel({ ... });
 * const model = storage.getModel('model-id');
 * storage.close();
 * ```
 */

// ========================================
// SQLite Storage Implementation
// ========================================
export class AgentStorage extends BaseStorage {
    id: string;
    model_name: string;
    model_provider: string;
    stream_usage: number;
    enable_thinking: number;
    temperature: number;
    max_tokens: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    created_at: string;
    updated_at: string;
}

export interface PromptRow {
    id: string;
    name: string;
    content: string;
    metadata: string | null;
    created_at: string;
    updated_at: string;
}

export interface ToolRow {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface MiddlewareRow {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

// Re-export types from abstract.ts for backward compatibility
export type {
    ModelRow,
    PromptRow,
    ToolRow,
    MiddlewareRow,
    AgentToolRow,
    AgentMiddlewareRow,
    AgentWithRelations,
};

// ========================================
// SQLite Storage Implementation
// ========================================
export class AgentStorage extends BaseStorage {
    private db: Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath, { create: true });
        this.db.exec('PRAGMA journal_mode = WAL');
        this.db.exec('PRAGMA foreign_keys = ON');
        this.initializeSchema();
    }

    // ========================================
    // Schema Initialization
    // ========================================
    private initializeSchema(): void {
        const schema = `
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY NOT NULL,
                model_name TEXT NOT NULL,
                model_provider TEXT NOT NULL,
                stream_usage INTEGER NOT NULL DEFAULT 0,
                enable_thinking INTEGER NOT NULL DEFAULT 0,
                temperature REAL NOT NULL DEFAULT 0.7,
                max_tokens INTEGER NOT NULL DEFAULT 4096,
                top_p REAL NOT NULL DEFAULT 1.0,
                frequency_penalty REAL NOT NULL DEFAULT 0.0,
                presence_penalty REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tools (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS middlewares (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                system_prompt_id TEXT NOT NULL,
                model_id TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (system_prompt_id) REFERENCES prompts(id) ON DELETE RESTRICT,
                FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS agent_tools (
                agent_id TEXT NOT NULL,
                tool_id TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                custom_params TEXT,
                PRIMARY KEY (agent_id, tool_id),
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agent_middlewares (
                agent_id TEXT NOT NULL,
                middleware_id TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                custom_params TEXT,
                PRIMARY KEY (agent_id, middleware_id),
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                FOREIGN KEY (middleware_id) REFERENCES middlewares(id) ON DELETE CASCADE
            );

            CREATE TRIGGER IF NOT EXISTS update_models_timestamp
            AFTER UPDATE ON models
            BEGIN
                UPDATE models SET updated_at = datetime('now') WHERE id = NEW.id;
            END;

            CREATE TRIGGER IF NOT EXISTS update_prompts_timestamp
            AFTER UPDATE ON prompts
            BEGIN
                UPDATE prompts SET updated_at = datetime('now') WHERE id = NEW.id;
            END;

            CREATE TRIGGER IF NOT EXISTS update_tools_timestamp
            AFTER UPDATE ON tools
            BEGIN
                UPDATE tools SET updated_at = datetime('now') WHERE id = NEW.id;
            END;

            CREATE TRIGGER IF NOT EXISTS update_middlewares_timestamp
            AFTER UPDATE ON middlewares
            BEGIN
                UPDATE middlewares SET updated_at = datetime('now') WHERE id = NEW.id;
            END;

            CREATE TRIGGER IF NOT EXISTS update_agents_timestamp
            AFTER UPDATE ON agents
            BEGIN
                UPDATE agents SET updated_at = datetime('now') WHERE id = NEW.id;
            END;
        `;

        this.db.exec(schema);
    }

    // ========================================
    // Transaction Management
    // ========================================
    transaction<T>(fn: () => T): T {
        this.db.exec('BEGIN TRANSACTION');
        try {
            const result = fn();
            this.db.exec('COMMIT');
            return result;
        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }

    // ========================================
    // Models
    // ========================================
    insertModel(data: z.infer<typeof ModelSchema>): void {
        const stmt = this.db.query(`
            INSERT INTO models (
                id, model_name, model_provider, stream_usage, enable_thinking,
                temperature, max_tokens, top_p, frequency_penalty, presence_penalty
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        `);
        stmt.run(
            data.id,
            data.model_name,
            data.model_provider,
            data.stream_usage ? 1 : 0,
            data.enable_thinking ? 1 : 0,
            data.temperature,
            data.max_tokens,
            data.top_p,
            data.frequency_penalty,
            data.presence_penalty,
        );
    }

    getModel(id: string): ModelRow | undefined {
        const stmt = this.db.query('SELECT * FROM models WHERE id = ?1');
        const result = stmt.get(id) as ModelRow | null;
        return result ?? undefined;
    }

    getAllModels(): ModelRow[] {
        const stmt = this.db.query('SELECT * FROM models');
        return stmt.all() as ModelRow[];
    }

    updateModel(data: z.infer<typeof ModelSchema>): void {
        const stmt = this.db.query(`
            UPDATE models SET
                model_name = ?1, model_provider = ?2, stream_usage = ?3, enable_thinking = ?4,
                temperature = ?5, max_tokens = ?6, top_p = ?7, frequency_penalty = ?8, presence_penalty = ?9
            WHERE id = ?10
        `);
        stmt.run(
            data.model_name,
            data.model_provider,
            data.stream_usage ? 1 : 0,
            data.enable_thinking ? 1 : 0,
            data.temperature,
            data.max_tokens,
            data.top_p,
            data.frequency_penalty,
            data.presence_penalty,
            data.id,
        );
    }

    deleteModel(id: string): void {
        const stmt = this.db.query('DELETE FROM models WHERE id = ?1');
        stmt.run(id);
    }

    // ========================================
    // Prompts
    // ========================================
    insertPrompt(data: z.infer<typeof PromptSchema>): void {
        const stmt = this.db.query(`
            INSERT INTO prompts (id, name, content, metadata)
            VALUES (?1, ?2, ?3, ?4)
        `);
        stmt.run(data.id, data.name, data.content, data.metadata ? JSON.stringify(data.metadata) : null);
    }

    getPrompt(id: string): PromptRow | undefined {
        const stmt = this.db.query('SELECT * FROM prompts WHERE id = ?1');
        const result = stmt.get(id) as PromptRow | null;
        return result ?? undefined;
    }

    getPromptByName(name: string): PromptRow | undefined {
        const stmt = this.db.query('SELECT * FROM prompts WHERE name = ?1');
        const result = stmt.get(name) as PromptRow | null;
        return result ?? undefined;
    }

    getAllPrompts(): PromptRow[] {
        const stmt = this.db.query('SELECT * FROM prompts');
        return stmt.all() as PromptRow[];
    }

    updatePrompt(data: z.infer<typeof PromptSchema>): void {
        const stmt = this.db.query(`
            UPDATE prompts SET name = ?1, content = ?2, metadata = ?3
            WHERE id = ?4
        `);
        stmt.run(data.name, data.content, data.metadata ? JSON.stringify(data.metadata) : null, data.id);
    }

    deletePrompt(id: string): void {
        const stmt = this.db.query('DELETE FROM prompts WHERE id = ?1');
        stmt.run(id);
    }

    // ========================================
    // Tools
    // ========================================
    insertTool(data: z.infer<typeof ToolSchema>): void {
        const stmt = this.db.query(`
            INSERT INTO tools (id, name, description)
            VALUES (?1, ?2, ?3)
        `);
        stmt.run(data.id, data.name, data.description);
    }

    getTool(id: string): ToolRow | undefined {
        const stmt = this.db.query('SELECT * FROM tools WHERE id = ?1');
        const result = stmt.get(id) as ToolRow | null;
        return result ?? undefined;
    }

    getAllTools(): ToolRow[] {
        const stmt = this.db.query('SELECT * FROM tools');
        return stmt.all() as ToolRow[];
    }

    updateTool(data: z.infer<typeof ToolSchema>): void {
        const stmt = this.db.query(`
            UPDATE tools SET name = ?1, description = ?2
            WHERE id = ?3
        `);
        stmt.run(data.name, data.description, data.id);
    }

    deleteTool(id: string): void {
        const stmt = this.db.query('DELETE FROM tools WHERE id = ?1');
        stmt.run(id);
    }

    // ========================================
    // Middlewares
    // ========================================
    insertMiddleware(data: z.infer<typeof MiddlewareSchema>): void {
        const stmt = this.db.query(`
            INSERT INTO middlewares (id, name, description)
            VALUES (?1, ?2, ?3)
        `);
        stmt.run(data.id, data.name, data.description);
    }

    getMiddleware(id: string): MiddlewareRow | undefined {
        const stmt = this.db.query('SELECT * FROM middlewares WHERE id = ?1');
        const result = stmt.get(id) as MiddlewareRow | null;
        return result ?? undefined;
    }

    getAllMiddlewares(): MiddlewareRow[] {
        const stmt = this.db.query('SELECT * FROM middlewares');
        return stmt.all() as MiddlewareRow[];
    }

    updateMiddleware(data: z.infer<typeof MiddlewareSchema>): void {
        const stmt = this.db.query(`
            UPDATE middlewares SET name = ?1, description = ?2
            WHERE id = ?3
        `);
        stmt.run(data.name, data.description, data.id);
    }

    deleteMiddleware(id: string): void {
        const stmt = this.db.query('DELETE FROM middlewares WHERE id = ?1');
        stmt.run(id);
    }

    // ========================================
    // Agents
    // ========================================
    insertAgent(data: z.infer<typeof AgentSchema>): void {
        const insertAgent = this.db.query(`
            INSERT INTO agents (id, name, description, system_prompt_id, model_id)
            VALUES (?1, ?2, ?3, ?4, ?5)
        `);
        insertAgent.run(data.id, data.name, data.description, data.system_prompt, data.model);

        // Insert tools (from data.tools)
        const insertTool = this.db.query(`
            INSERT INTO agent_tools (agent_id, tool_id, enabled, custom_params)
            VALUES (?1, ?2, ?3, ?4)
        `);
        for (const [toolId, value] of Object.entries(data.tools)) {
            if (typeof value === 'boolean') {
                // Simple boolean: store as enabled flag, no custom params
                insertTool.run(data.id, toolId, value ? 1 : 0, null);
            } else {
                // Object: store entire object in custom_params, set enabled to 1
                insertTool.run(data.id, toolId, 1, JSON.stringify(value));
            }
        }

        // Insert middlewares (from data.middleware)
        const insertMiddleware = this.db.query(`
            INSERT INTO agent_middlewares (agent_id, middleware_id, enabled, custom_params)
            VALUES (?1, ?2, ?3, ?4)
        `);
        for (const [midId, value] of Object.entries(data.middleware)) {
            if (typeof value === 'boolean') {
                // Simple boolean: store as enabled flag, no custom params
                insertMiddleware.run(data.id, midId, value ? 1 : 0, null);
            } else {
                // Object: store entire object in custom_params, set enabled to 1
                insertMiddleware.run(data.id, midId, 1, JSON.stringify(value));
            }
        }
    }

    getAgent(
        id: string,
    ): (AgentRow & { tools: Record<string, boolean | any>; middlewares: Record<string, boolean | any> }) | undefined {
        const agentRow = this.db.query('SELECT * FROM agents WHERE id = ?1').get(id) as AgentRow | null;
        if (!agentRow) return undefined;

        const tools: Record<string, boolean | any> = {};
        const toolRows = this.db.query('SELECT * FROM agent_tools WHERE agent_id = ?1').all(id) as AgentToolRow[];
        for (const row of toolRows) {
            if (row.custom_params && typeof row.custom_params === 'string') {
                // custom_params contains the full config
                tools[row.tool_id] = JSON.parse(row.custom_params);
            } else {
                // Just boolean enabled
                tools[row.tool_id] = row.enabled === 1;
            }
        }

        const middlewares: Record<string, boolean | any> = {};
        const middlewareRows = this.db
            .query('SELECT * FROM agent_middlewares WHERE agent_id = ?1')
            .all(id) as AgentMiddlewareRow[];
        for (const row of middlewareRows) {
            if (row.custom_params && typeof row.custom_params === 'string') {
                // custom_params contains the full config
                middlewares[row.middleware_id] = JSON.parse(row.custom_params);
            } else {
                // Just boolean enabled
                middlewares[row.middleware_id] = row.enabled === 1;
            }
        }

        return { ...agentRow, tools, middlewares };
    }

    getAllAgents(): (AgentRow & {
        tools: Record<string, boolean | any>;
        middlewares: Record<string, boolean | any>;
    })[] {
        const agentRows = this.db.query('SELECT * FROM agents').all() as AgentRow[];
        return agentRows.map((row) => {
            const tools: Record<string, boolean | any> = {};
            const toolRows = this.db
                .query('SELECT * FROM agent_tools WHERE agent_id = ?1')
                .all(row.id) as AgentToolRow[];
            for (const t of toolRows) {
                if (t.custom_params && typeof t.custom_params === 'string') {
                    tools[t.tool_id] = JSON.parse(t.custom_params);
                } else {
                    tools[t.tool_id] = t.enabled === 1;
                }
            }

            const middlewares: Record<string, boolean | any> = {};
            const middlewareRows = this.db
                .query('SELECT * FROM agent_middlewares WHERE agent_id = ?1')
                .all(row.id) as AgentMiddlewareRow[];
            for (const m of middlewareRows) {
                if (m.custom_params && typeof m.custom_params === 'string') {
                    middlewares[m.middleware_id] = JSON.parse(m.custom_params);
                } else {
                    middlewares[m.middleware_id] = m.enabled === 1;
                }
            }

            return { ...row, tools, middlewares };
        });
    }

    updateAgent(data: z.infer<typeof AgentSchema>): void {
        const updateAgent = this.db.query(`
            UPDATE agents SET name = ?1, description = ?2, system_prompt_id = ?3, model_id = ?4
            WHERE id = ?5
        `);
        updateAgent.run(data.name, data.description, data.system_prompt, data.model, data.id);

        // Delete and reinsert tools (from data.tools)
        this.db.query('DELETE FROM agent_tools WHERE agent_id = ?1').run(data.id);
        const insertTool = this.db.query(`
            INSERT INTO agent_tools (agent_id, tool_id, enabled, custom_params)
            VALUES (?1, ?2, ?3, ?4)
        `);
        for (const [toolId, value] of Object.entries(data.tools)) {
            if (typeof value === 'boolean') {
                // Simple boolean: store as enabled flag, no custom params
                insertTool.run(data.id, toolId, value ? 1 : 0, null);
            } else {
                // Object: store entire object in custom_params, set enabled to 1
                insertTool.run(data.id, toolId, 1, JSON.stringify(value));
            }
        }

        // Delete and reinsert middlewares (from data.middleware)
        this.db.query('DELETE FROM agent_middlewares WHERE agent_id = ?1').run(data.id);
        const insertMiddleware = this.db.query(`
            INSERT INTO agent_middlewares (agent_id, middleware_id, enabled, custom_params)
            VALUES (?1, ?2, ?3, ?4)
        `);
        for (const [midId, value] of Object.entries(data.middleware)) {
            if (typeof value === 'boolean') {
                // Simple boolean: store as enabled flag, no custom params
                insertMiddleware.run(data.id, midId, value ? 1 : 0, null);
            } else {
                // Object: store entire object in custom_params, set enabled to 1
                insertMiddleware.run(data.id, midId, 1, JSON.stringify(value));
            }
        }
    }

    deleteAgent(id: string): void {
        const stmt = this.db.query('DELETE FROM agents WHERE id = ?1');
        stmt.run(id);
    }

    // ========================================
    // Query Helpers
    // ========================================
    getAgentWithDependencies(id: string):
        | {
              agent: AgentRow;
              model: ModelRow;
              systemPrompt: PromptRow;
              tools: (ToolRow & { enabled: boolean; customParams: any })[];
              middlewares: (MiddlewareRow & { enabled: boolean; customParams: any })[];
          }
        | undefined {
        const agent = this.db.query('SELECT * FROM agents WHERE id = ?1').get(id) as AgentRow | undefined;
        if (!agent) return undefined;

        const model = this.getModel(agent.model_id);
        if (!model) throw new Error(`Model ${agent.model_id} not found`);

        const systemPrompt = this.getPrompt(agent.system_prompt_id);
        if (!systemPrompt) throw new Error(`Prompt ${agent.system_prompt_id} not found`);

        const tools: (ToolRow & { enabled: boolean; customParams: any })[] = [];
        const toolRows = this.db
            .query(
                'SELECT t.*, at.enabled, at.custom_params FROM agent_tools at JOIN tools t ON at.tool_id = t.id WHERE at.agent_id = ?1',
            )
            .all(id) as any[];
        for (const row of toolRows) {
            tools.push({
                id: row.id,
                name: row.name,
                description: row.description,
                created_at: row.created_at,
                updated_at: row.updated_at,
                enabled: row.enabled === 1,
                customParams: row.custom_params ? JSON.parse(row.custom_params) : undefined,
            });
        }

        const middlewares: (MiddlewareRow & { enabled: boolean; customParams: any })[] = [];
        const middlewareRows = this.db
            .query(
                'SELECT m.*, am.enabled, am.custom_params FROM agent_middlewares am JOIN middlewares m ON am.middleware_id = m.id WHERE am.agent_id = ?1',
            )
            .all(id) as any[];
        for (const row of middlewareRows) {
            middlewares.push({
                id: row.id,
                name: row.name,
                description: row.description,
                created_at: row.created_at,
                updated_at: row.updated_at,
                enabled: row.enabled === 1,
                customParams: row.custom_params ? JSON.parse(row.custom_params) : undefined,
            });
        }

        return { agent, model, systemPrompt, tools, middlewares };
    }

    // ========================================
    // Cleanup
    // ========================================
    close(): void {
        this.db.close();
    }

    getDb(): Database {
        return this.db;
    }
}
