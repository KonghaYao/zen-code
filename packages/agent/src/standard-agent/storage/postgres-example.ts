/**
 * PostgreSQL Storage Implementation Example
 *
 * This demonstrates how to implement a PostgreSQL backend for the agent system.
 * It follows the IStorage interface and uses the BaseStorage helper class.
 *
 * To use this, you need to install:
 *   npm install pg
 *
 * @example
 * ```typescript
 * import { PostgresStorage } from './storage/postgres-example';
 *
 * const storage = new PostgresStorage({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'agents',
 *   user: 'postgres',
 *   password: 'password',
 * });
 *
 * storage.initialize();
 * storage.insertModel({ ... });
 * ```
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { z } from 'zod';
import { BaseStorage, IStorage } from './abstract.js';
import { ModelSchema, PromptSchema, ToolSchema, MiddlewareSchema, AgentSchema } from '../index.js';

export interface PostgresStorageOptions {
    host?: string;
    port?: number;
    database: string;
    user: string;
    password: string;
    max?: number;
}

export class PostgresStorage extends BaseStorage implements IStorage {
    private pool: Pool;
    private initialized = false;

    constructor(options: PostgresStorageOptions) {
        super();
        this.pool = new Pool({
            host: options.host || 'localhost',
            port: options.port || 5432,
            database: options.database,
            user: options.user,
            password: options.password,
            max: options.max || 10,
        });
    }

    // ========================================
    // Lifecycle
    // ========================================

    async initialize(): Promise<void> {
        const client = await this.pool.connect();
        try {
            // Create tables
            await client.query(`
                CREATE TABLE IF NOT EXISTS models (
                    id TEXT PRIMARY KEY NOT NULL,
                    model_name TEXT NOT NULL,
                    model_provider TEXT NOT NULL,
                    stream_usage BOOLEAN NOT NULL DEFAULT FALSE,
                    enable_thinking BOOLEAN NOT NULL DEFAULT FALSE,
                    temperature REAL NOT NULL DEFAULT 0.7,
                    max_tokens INTEGER NOT NULL DEFAULT 4096,
                    top_p REAL NOT NULL DEFAULT 1.0,
                    frequency_penalty REAL NOT NULL DEFAULT 0.0,
                    presence_penalty REAL NOT NULL DEFAULT 0.0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_models_provider ON models(model_provider);

                CREATE TABLE IF NOT EXISTS prompts (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL UNIQUE,
                    content TEXT NOT NULL,
                    metadata JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS tools (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS middlewares (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS agents (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    system_prompt_id TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT fk_prompt FOREIGN KEY (system_prompt_id) REFERENCES prompts(id) ON DELETE RESTRICT,
                    CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT
                );

                CREATE TABLE IF NOT EXISTS agent_tools (
                    agent_id TEXT NOT NULL,
                    tool_id TEXT NOT NULL,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    custom_params JSONB,
                    PRIMARY KEY (agent_id, tool_id),
                    CONSTRAINT fk_agent_tools FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                    CONSTRAINT fk_tools FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS agent_middlewares (
                    agent_id TEXT NOT NULL,
                    middleware_id TEXT NOT NULL,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    custom_params JSONB,
                    PRIMARY KEY (agent_id, middleware_id),
                    CONSTRAINT fk_agent_mid FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                    CONSTRAINT fk_mid FOREIGN KEY (middleware_id) REFERENCES middlewares(id) ON DELETE CASCADE
                );

                -- Create trigger function for updating updated_at
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                -- Create triggers
                DROP TRIGGER IF EXISTS update_models_timestamp ON models;
                CREATE TRIGGER update_models_timestamp
                    BEFORE UPDATE ON models
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

                DROP TRIGGER IF EXISTS update_prompts_timestamp ON prompts;
                CREATE TRIGGER update_prompts_timestamp
                    BEFORE UPDATE ON prompts
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

                DROP TRIGGER IF EXISTS update_tools_timestamp ON tools;
                CREATE TRIGGER update_tools_timestamp
                    BEFORE UPDATE ON tools
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

                DROP TRIGGER IF EXISTS update_middlewares_timestamp ON middlewares;
                CREATE TRIGGER update_middlewares_timestamp
                    BEFORE UPDATE ON middlewares
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

                DROP TRIGGER IF EXISTS update_agents_timestamp ON agents;
                CREATE TRIGGER update_agents_timestamp
                    BEFORE UPDATE ON agents
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            `);

            this.initialized = true;
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    // ========================================
    // Transactions
    // ========================================

    async transaction<T>(fn: () => T): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn();
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ========================================
    // Helper Methods
    // ========================================

    private async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        return this.pool.query<T>(text, params);
    }

    private async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
        const result = await this.query<T>(text, params);
        return result.rows[0] || null;
    }

    // ========================================
    // Models
    // ========================================

    async insertModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        await this.query(`
            INSERT INTO models (
                id, model_name, model_provider, stream_usage, enable_thinking,
                temperature, max_tokens, top_p, frequency_penalty, presence_penalty
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            data.id,
            data.model_name,
            data.model_provider,
            data.stream_usage,
            data.enable_thinking,
            data.temperature,
            data.max_tokens,
            data.top_p,
            data.frequency_penalty,
            data.presence_penalty,
        ]);
    }

    async getModel(id: string): Promise<any | undefined> {
        const row = await this.queryOne(`SELECT * FROM models WHERE id = $1`, [id]);
        return row || undefined;
    }

    async getAllModels(): Promise<any[]> {
        const result = await this.query(`SELECT * FROM models`);
        return result.rows;
    }

    async updateModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        await this.query(`
            UPDATE models SET
                model_name = $1, model_provider = $2, stream_usage = $3, enable_thinking = $4,
                temperature = $5, max_tokens = $6, top_p = $7, frequency_penalty = $8, presence_penalty = $9
            WHERE id = $10
        `, [
            data.model_name,
            data.model_provider,
            data.stream_usage,
            data.enable_thinking,
            data.temperature,
            data.max_tokens,
            data.top_p,
            data.frequency_penalty,
            data.presence_penalty,
            data.id,
        ]);
    }

    async deleteModel(id: string): Promise<void> {
        await this.query(`DELETE FROM models WHERE id = $1`, [id]);
    }

    // ========================================
    // Prompts
    // ========================================

    async insertPrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
        await this.query(`
            INSERT INTO prompts (id, name, content, metadata)
            VALUES ($1, $2, $3, $4)
        `, [data.id, data.name, data.content, data.metadata ? JSON.stringify(data.metadata) : null]);
    }

    async getPrompt(id: string): Promise<any | undefined> {
        const row = await this.queryOne(`SELECT * FROM prompts WHERE id = $1`, [id]);
        return row || undefined;
    }

    async getPromptByName(name: string): Promise<any | undefined> {
        const row = await this.queryOne(`SELECT * FROM prompts WHERE name = $1`, [name]);
        return row || undefined;
    }

    async getAllPrompts(): Promise<any[]> {
        const result = await this.query(`SELECT * FROM prompts`);
        return result.rows;
    }

    async updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
        await this.query(`
            UPDATE prompts SET name = $1, content = $2, metadata = $3
            WHERE id = $4
        `, [data.name, data.content, data.metadata ? JSON.stringify(data.metadata) : null, data.id]);
    }

    async deletePrompt(id: string): Promise<void> {
        await this.query(`DELETE FROM prompts WHERE id = $1`, [id]);
    }

    // ========================================
    // Tools
    // ========================================

    async insertTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        await this.query(`
            INSERT INTO tools (id, name, description)
            VALUES ($1, $2, $3)
        `, [data.id, data.name, data.description]);
    }

    async getTool(id: string): Promise<any | undefined> {
        const row = await this.queryOne(`SELECT * FROM tools WHERE id = $1`, [id]);
        return row || undefined;
    }

    async getAllTools(): Promise<any[]> {
        const result = await this.query(`SELECT * FROM tools`);
        return result.rows;
    }

    async updateTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        await this.query(`
            UPDATE tools SET name = $1, description = $2
            WHERE id = $3
        `, [data.name, data.description, data.id]);
    }

    async deleteTool(id: string): Promise<void> {
        await this.query(`DELETE FROM tools WHERE id = $1`, [id]);
    }

    // ========================================
    // Middlewares
    // ========================================

    async insertMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        await this.query(`
            INSERT INTO middlewares (id, name, description)
            VALUES ($1, $2, $3)
        `, [data.id, data.name, data.description]);
    }

    async getMiddleware(id: string): Promise<any | undefined> {
        const row = await this.queryOne(`SELECT * FROM middlewares WHERE id = $1`, [id]);
        return row || undefined;
    }

    async getAllMiddlewares(): Promise<any[]> {
        const result = await this.query(`SELECT * FROM middlewares`);
        return result.rows;
    }

    async updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        await this.query(`
            UPDATE middlewares SET name = $1, description = $2
            WHERE id = $3
        `, [data.name, data.description, data.id]);
    }

    async deleteMiddleware(id: string): Promise<void> {
        await this.query(`DELETE FROM middlewares WHERE id = $1`, [id]);
    }

    // ========================================
    // Agents
    // ========================================

    async insertAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(`
                INSERT INTO agents (id, name, description, system_prompt_id, model_id)
                VALUES ($1, $2, $3, $4, $5)
            `, [data.id, data.name, data.description, data.system_prompt, data.model]);

            // Insert tools
            for (const [toolId, value] of Object.entries(data.tools)) {
                await client.query(`
                    INSERT INTO agent_tools (agent_id, tool_id, enabled, custom_params)
                    VALUES ($1, $2, $3, $4)
                `, [
                    data.id,
                    toolId,
                    typeof value === 'boolean' ? value : true,
                    typeof value === 'boolean' ? null : JSON.stringify(value),
                ]);
            }

            // Insert middlewares
            for (const [midId, value] of Object.entries(data.middleware)) {
                await client.query(`
                    INSERT INTO agent_middlewares (agent_id, middleware_id, enabled, custom_params)
                    VALUES ($1, $2, $3, $4)
                `, [
                    data.id,
                    midId,
                    typeof value === 'boolean' ? value : true,
                    typeof value === 'boolean' ? null : JSON.stringify(value),
                ]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getAgent(id: string): Promise<any | undefined> {
        const agentRow = await this.queryOne(`SELECT * FROM agents WHERE id = $1`, [id]);
        if (!agentRow) return undefined;

        const tools: Record<string, any> = {};
        const toolRows = await this.query(`
            SELECT * FROM agent_tools WHERE agent_id = $1
        `, [id]);
        for (const row of toolRows.rows) {
            if (row.custom_params) {
                tools[row.tool_id] = JSON.parse(row.custom_params);
            } else {
                tools[row.tool_id] = row.enabled;
            }
        }

        const middlewares: Record<string, any> = {};
        const middlewareRows = await this.query(`
            SELECT * FROM agent_middlewares WHERE agent_id = $1
        `, [id]);
        for (const row of middlewareRows.rows) {
            if (row.custom_params) {
                middlewares[row.middleware_id] = JSON.parse(row.custom_params);
            } else {
                middlewares[row.middleware_id] = row.enabled;
            }
        }

        return { ...agentRow, tools, middlewares };
    }

    async getAllAgents(): Promise<any[]> {
        const agentRows = await this.query(`SELECT * FROM agents`);

        const result = [];
        for (const row of agentRows.rows) {
            const tools: Record<string, any> = {};
            const toolRows = await this.query(`SELECT * FROM agent_tools WHERE agent_id = $1`, [row.id]);
            for (const t of toolRows.rows) {
                if (t.custom_params) {
                    tools[t.tool_id] = JSON.parse(t.custom_params);
                } else {
                    tools[t.tool_id] = t.enabled;
                }
            }

            const middlewares: Record<string, any> = {};
            const middlewareRows = await this.query(`SELECT * FROM agent_middlewares WHERE agent_id = $1`, [row.id]);
            for (const m of middlewareRows.rows) {
                if (m.custom_params) {
                    middlewares[m.middleware_id] = JSON.parse(m.custom_params);
                } else {
                    middlewares[m.middleware_id] = m.enabled;
                }
            }

            result.push({ ...row, tools, middlewares });
        }

        return result;
    }

    async updateAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(`
                UPDATE agents SET name = $1, description = $2, system_prompt_id = $3, model_id = $4
                WHERE id = $5
            `, [data.name, data.description, data.system_prompt, data.model, data.id]);

            // Delete and reinsert tools
            await client.query(`DELETE FROM agent_tools WHERE agent_id = $1`, [data.id]);
            for (const [toolId, value] of Object.entries(data.tools)) {
                await client.query(`
                    INSERT INTO agent_tools (agent_id, tool_id, enabled, custom_params)
                    VALUES ($1, $2, $3, $4)
                `, [
                    data.id,
                    toolId,
                    typeof value === 'boolean' ? value : true,
                    typeof value === 'boolean' ? null : JSON.stringify(value),
                ]);
            }

            // Delete and reinsert middlewares
            await client.query(`DELETE FROM agent_middlewares WHERE agent_id = $1`, [data.id]);
            for (const [midId, value] of Object.entries(data.middleware)) {
                await client.query(`
                    INSERT INTO agent_middlewares (agent_id, middleware_id, enabled, custom_params)
                    VALUES ($1, $2, $3, $4)
                `, [
                    data.id,
                    midId,
                    typeof value === 'boolean' ? value : true,
                    typeof value === 'boolean' ? null : JSON.stringify(value),
                ]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteAgent(id: string): Promise<void> {
        await this.query(`DELETE FROM agents WHERE id = $1`, [id]);
    }

    // ========================================
    // Query Helpers
    // ========================================

    async getAgentWithDependencies(id: string): Promise<any | undefined> {
        const agent = await this.queryOne(`SELECT * FROM agents WHERE id = $1`, [id]);
        if (!agent) return undefined;

        const model = await this.queryOne(`SELECT * FROM models WHERE id = $1`, [agent.model_id]);
        if (!model) throw new Error(`Model ${agent.model_id} not found`);

        const systemPrompt = await this.queryOne(`SELECT * FROM prompts WHERE id = $1`, [agent.system_prompt_id]);
        if (!systemPrompt) throw new Error(`Prompt ${agent.system_prompt_id} not found`);

        const tools: any[] = [];
        const toolRows = await this.query(`
            SELECT t.*, at.enabled, at.custom_params
            FROM agent_tools at
            JOIN tools t ON at.tool_id = t.id
            WHERE at.agent_id = $1
        `, [id]);
        for (const row of toolRows.rows) {
            tools.push({
                ...row,
                enabled: row.enabled,
                customParams: row.custom_params ? JSON.parse(row.custom_params) : undefined,
            });
        }

        const middlewares: any[] = [];
        const middlewareRows = await this.query(`
            SELECT m.*, am.enabled, am.custom_params
            FROM agent_middlewares am
            JOIN middlewares m ON am.middleware_id = m.id
            WHERE am.agent_id = $1
        `, [id]);
        for (const row of middlewareRows.rows) {
            middlewares.push({
                ...row,
                enabled: row.enabled,
                customParams: row.custom_params ? JSON.parse(row.custom_params) : undefined,
            });
        }

        return { agent, model, systemPrompt, tools, middlewares };
    }
}
