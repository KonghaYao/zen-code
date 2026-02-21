import { z } from 'zod';
import {
    ModelSchema,
    PromptSchema,
    PromptVersionSchema,
    ToolSchema,
    MiddlewareSchema,
    AgentSchema,
} from './schemas.js';
import { StandardAgent } from './agent.js';
import type { IStorage, ModelRow, PromptRow, PromptVersionRow, PromptWithVersion } from './storage/abstract.js';

/**
 * Prompt with version info returned from repository
 */
export interface PromptWithVersionData {
    id: string;
    name: string;
    current_version: number;
    content: string;
    change_note: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Agent Repository
 *
 * Simplified CRUD interface over storage layer
 * Returns plain data types instead of Entity wrappers
 */
export class AgentRepository {
    constructor(private storage: IStorage) {}

    // ========================================
    // Models
    // ========================================

    async addModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        await this.storage.insertModel(data);
    }

    async getModel(id: string): Promise<z.infer<typeof ModelSchema> | undefined> {
        const row = await this.storage.getModel(id);
        if (!row) return undefined;
        return this.rowToModel(row);
    }

    async listModels(): Promise<z.infer<typeof ModelSchema>[]> {
        const rows = await this.storage.getAllModels();
        return rows.map((r) => this.rowToModel(r));
    }

    async updateModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        await this.storage.updateModel(data);
    }

    async deleteModel(id: string): Promise<void> {
        await this.storage.deleteModel(id);
    }

    // ========================================
    // Prompts
    // ========================================

    /**
     * Create a new prompt with initial content
     */
    async addPrompt(data: z.infer<typeof PromptSchema>, content: string, changeNote?: string): Promise<void> {
        await this.storage.insertPrompt(data, content, changeNote);
    }

    /**
     * Get prompt by id (without content)
     */
    async getPrompt(id: string): Promise<z.infer<typeof PromptSchema> | undefined> {
        const row = await this.storage.getPrompt(id);
        if (!row) return undefined;
        return { id: row.id, name: row.name };
    }

    /**
     * Get prompt with current version content
     */
    async getPromptWithContent(id: string): Promise<PromptWithVersionData | undefined> {
        const row = await this.storage.getPromptWithCurrentVersion(id);
        if (!row) return undefined;
        return {
            id: row.id,
            name: row.name,
            current_version: row.current_version,
            content: row.content,
            change_note: row.change_note,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    /**
     * Get prompt by name (without content)
     */
    async getPromptByName(name: string): Promise<z.infer<typeof PromptSchema> | undefined> {
        const row = await this.storage.getPromptByName(name);
        if (!row) return undefined;
        return { id: row.id, name: row.name };
    }

    /**
     * Get prompt by name with current version content
     */
    async getPromptByNameWithContent(name: string): Promise<PromptWithVersionData | undefined> {
        const row = await this.storage.getPromptWithCurrentVersionByName(name);
        if (!row) return undefined;
        return {
            id: row.id,
            name: row.name,
            current_version: row.current_version,
            content: row.content,
            change_note: row.change_note,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    /**
     * List all prompts (without content)
     */
    async listPrompts(): Promise<z.infer<typeof PromptSchema>[]> {
        const rows = await this.storage.getAllPrompts();
        return rows.map((r) => ({ id: r.id, name: r.name }));
    }

    /**
     * List all prompts with current version content
     */
    async listPromptsWithContent(): Promise<PromptWithVersionData[]> {
        const rows = await this.storage.getAllPromptsWithCurrentVersion();
        return rows.map((r) => ({
            id: r.id,
            name: r.name,
            current_version: r.current_version,
            content: r.content,
            change_note: r.change_note,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }));
    }

    /**
     * Update prompt metadata (name only)
     */
    async updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
        await this.storage.updatePrompt(data);
    }

    /**
     * Delete prompt and all its versions
     */
    async deletePrompt(id: string): Promise<void> {
        await this.storage.deletePrompt(id);
    }

    // ========================================
    // Prompt Versions
    // ========================================

    /**
     * Create a new version for existing prompt
     */
    async createPromptVersion(promptId: string, content: string, changeNote?: string): Promise<PromptVersionRow> {
        return this.storage.createPromptVersion(promptId, content, changeNote);
    }

    /**
     * Get specific version of a prompt
     */
    async getPromptVersion(promptId: string, version: number): Promise<PromptVersionRow | undefined> {
        return this.storage.getPromptVersion(promptId, version);
    }

    /**
     * Get all versions of a prompt
     */
    async getPromptVersions(promptId: string): Promise<PromptVersionRow[]> {
        return this.storage.getPromptVersions(promptId);
    }

    /**
     * Rollback prompt to a specific version
     */
    async rollbackPromptVersion(promptId: string, targetVersion: number): Promise<void> {
        return this.storage.rollbackPromptVersion(promptId, targetVersion);
    }

    // ========================================
    // Tools
    // ========================================

    async addTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        await this.storage.insertTool(data);
    }

    async getTool(id: string): Promise<z.infer<typeof ToolSchema> | undefined> {
        const row = await this.storage.getTool(id);
        if (!row) return undefined;
        return { id: row.id, name: row.name, description: row.description };
    }

    async listTools(): Promise<z.infer<typeof ToolSchema>[]> {
        const rows = await this.storage.getAllTools();
        return rows.map((r) => ({ id: r.id, name: r.name, description: r.description }));
    }

    async updateTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        await this.storage.updateTool(data);
    }

    async deleteTool(id: string): Promise<void> {
        await this.storage.deleteTool(id);
    }

    // ========================================
    // Middlewares
    // ========================================

    async addMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        await this.storage.insertMiddleware(data);
    }

    async getMiddleware(id: string): Promise<z.infer<typeof MiddlewareSchema> | undefined> {
        const row = await this.storage.getMiddleware(id);
        if (!row) return undefined;
        return { id: row.id, name: row.name, description: row.description };
    }

    async listMiddlewares(): Promise<z.infer<typeof MiddlewareSchema>[]> {
        const rows = await this.storage.getAllMiddlewares();
        return rows.map((r) => ({ id: r.id, name: r.name, description: r.description }));
    }

    async updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        await this.storage.updateMiddleware(data);
    }

    async deleteMiddleware(id: string): Promise<void> {
        await this.storage.deleteMiddleware(id);
    }

    // ========================================
    // Agents
    // ========================================

    async addAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        await this.storage.insertAgent(data);
    }

    async getAgent(id: string): Promise<StandardAgent | undefined> {
        const row = await this.storage.getAgent(id);
        if (!row) return undefined;
        return new StandardAgent({
            id: row.id,
            name: row.name,
            description: row.description,
            system_prompt: row.system_prompt_id,
            model: row.model_id,
            tools: row.tools,
            middleware: row.middlewares,
        });
    }

    async listAgents(): Promise<StandardAgent[]> {
        const rows = await this.storage.getAllAgents();
        return rows.map(
            (r) =>
                new StandardAgent({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    system_prompt: r.system_prompt_id,
                    model: r.model_id,
                    tools: r.tools,
                    middleware: r.middlewares,
                }),
        );
    }

    async updateAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        await this.storage.updateAgent(data);
    }

    async deleteAgent(id: string): Promise<void> {
        await this.storage.deleteAgent(id);
    }

    async getAgentWithDependencies(id: string) {
        return this.storage.getAgentWithDependencies(id);
    }

    // ========================================
    // Row to Schema Converters
    // ========================================

    private rowToModel(row: ModelRow): z.infer<typeof ModelSchema> {
        return {
            id: row.id,
            model_name: row.model_name,
            model_provider: row.model_provider,
            stream_usage: Boolean(row.stream_usage),
            enable_thinking: Boolean(row.enable_thinking),
            temperature: row.temperature,
            max_tokens: row.max_tokens,
            top_p: row.top_p,
            frequency_penalty: row.frequency_penalty,
            presence_penalty: row.presence_penalty,
        };
    }
}
