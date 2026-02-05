/**
 * Memory Storage Implementation
 *
 * An in-memory storage backend for testing and development.
 * All data is lost when application exits.
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorage();
 * await storage.insertModel({ ... });
 * const model = await storage.getModel('model-id');
 * ```
 */

import { z } from 'zod';
import {
    BaseStorage,
    ModelRow,
    PromptRow,
    ToolRow,
    MiddlewareRow,
    AgentToolRow,
    AgentMiddlewareRow,
    AgentWithRelations,
    AgentRow,
} from './abstract.js';
import { ModelSchema, PromptSchema, ToolSchema, MiddlewareSchema, AgentSchema } from '../index.js';

export class MemoryStorage extends BaseStorage {
    initialize?(): Promise<void> | void {
        throw new Error('Method not implemented.');
    }
    private models: Map<string, ModelRow> = new Map();
    private prompts: Map<string, PromptRow> = new Map();
    private promptsByName: Map<string, PromptRow> = new Map();
    private tools: Map<string, ToolRow> = new Map();
    private middlewares: Map<string, MiddlewareRow> = new Map();
    private agents: Map<string, AgentRow> = new Map();
    private agentTools: Map<string, AgentToolRow[]> = new Map(); // agent_id -> tools
    private agentMiddlewares: Map<string, AgentMiddlewareRow[]> = new Map(); // agent_id -> middlewares

    constructor() {
        super();
    }

    // ========================================
    // Lifecycle
    // ========================================
    close(): Promise<void> {
        return Promise.resolve().then(() => {
            this.models.clear();
            this.prompts.clear();
            this.promptsByName.clear();
            this.tools.clear();
            this.middlewares.clear();
            this.agents.clear();
            this.agentTools.clear();
            this.agentMiddlewares.clear();
        });
    }

    // ========================================
    // Transactions
    // ========================================
    async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
        // Create snapshots before transaction
        const snapshots = {
            models: new Map(this.models),
            prompts: new Map(this.prompts),
            promptsByName: new Map(this.promptsByName),
            tools: new Map(this.tools),
            middlewares: new Map(this.middlewares),
            agents: new Map(this.agents),
            agentTools: new Map(this.agentTools),
            agentMiddlewares: new Map(this.agentMiddlewares),
        };

        try {
            return await fn();
        } catch (error) {
            // Rollback: restore from snapshots
            this.models = snapshots.models;
            this.prompts = snapshots.prompts;
            this.promptsByName = snapshots.promptsByName;
            this.tools = snapshots.tools;
            this.middlewares = snapshots.middlewares;
            this.agents = snapshots.agents;
            this.agentTools = snapshots.agentTools;
            this.agentMiddlewares = snapshots.agentMiddlewares;
            throw error;
        }
    }

    // ========================================
    // Models
    // ========================================
    insertModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            if (this.models.has(data.id)) {
                throw new Error(`Model with id ${data.id} already exists`);
            }

            const row: ModelRow = {
                id: data.id,
                model_name: data.model_name,
                model_provider: data.model_provider,
                stream_usage: this.boolToInt(data.stream_usage),
                enable_thinking: this.boolToInt(data.enable_thinking),
                temperature: data.temperature,
                max_tokens: data.max_tokens,
                top_p: data.top_p,
                frequency_penalty: data.frequency_penalty,
                presence_penalty: data.presence_penalty,
                created_at: this.now(),
                updated_at: this.now(),
            };

            this.models.set(data.id, row);
        });
    }

    getModel(id: string): Promise<ModelRow | undefined> {
        return Promise.resolve(this.models.get(id));
    }

    getAllModels(): Promise<ModelRow[]> {
        return Promise.resolve(Array.from(this.models.values()));
    }

    updateModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            const existing = this.models.get(data.id);
            if (!existing) {
                throw new Error(`Model with id ${data.id} not found`);
            }

            const row: ModelRow = {
                ...existing,
                model_name: data.model_name,
                model_provider: data.model_provider,
                stream_usage: this.boolToInt(data.stream_usage),
                enable_thinking: this.boolToInt(data.enable_thinking),
                temperature: data.temperature,
                max_tokens: data.max_tokens,
                top_p: data.top_p,
                frequency_penalty: data.frequency_penalty,
                presence_penalty: data.presence_penalty,
                updated_at: this.now(),
            };

            this.models.set(data.id, row);
        });
    }

    deleteModel(id: string): Promise<void> {
        return Promise.resolve().then(() => {
            // Check if any agents reference this model
            for (const agent of this.agents.values()) {
                if (agent.model_id === id) {
                    throw new Error(`Cannot delete model ${id}: it is referenced by agent ${agent.id}`);
                }
            }
            this.models.delete(id);
        });
    }

    // ========================================
    // Prompts
    // ========================================
    insertPrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            if (this.prompts.has(data.id)) {
                throw new Error(`Prompt with id ${data.id} already exists`);
            }
            if (this.promptsByName.has(data.name)) {
                throw new Error(`Prompt with name ${data.name} already exists`);
            }

            const row: PromptRow = {
                id: data.id,
                name: data.name,
                content: data.content,
                metadata: this.safeStringify(data.metadata),
                created_at: this.now(),
                updated_at: this.now(),
            };

            this.prompts.set(data.id, row);
            this.promptsByName.set(data.name, row);
        });
    }

    getPrompt(id: string): Promise<PromptRow | undefined> {
        return Promise.resolve(this.prompts.get(id));
    }

    getPromptByName(name: string): Promise<PromptRow | undefined> {
        return Promise.resolve(this.promptsByName.get(name));
    }

    getAllPrompts(): Promise<PromptRow[]> {
        return Promise.resolve(Array.from(this.prompts.values()));
    }

    updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            const existing = this.prompts.get(data.id);
            if (!existing) {
                throw new Error(`Prompt with id ${data.id} not found`);
            }

            const row: PromptRow = {
                ...existing,
                name: data.name,
                content: data.content,
                metadata: this.safeStringify(data.metadata),
                updated_at: this.now(),
            };

            this.prompts.set(data.id, row);

            // Update name index - remove old name if it changed
            if (existing.name !== data.name) {
                this.promptsByName.delete(existing.name);
            }
            this.promptsByName.set(data.name, row);
        });
    }

    deletePrompt(id: string): Promise<void> {
        return Promise.resolve().then(() => {
            const existing = this.prompts.get(id);
            if (!existing) {
                throw new Error(`Prompt with id ${id} not found`);
            }

            // Check if any agents reference this prompt
            for (const agent of this.agents.values()) {
                if (agent.system_prompt_id === id) {
                    throw new Error(`Cannot delete prompt ${id}: it is referenced by agent ${agent.id}`);
                }
            }

            this.prompts.delete(id);
            this.promptsByName.delete(existing.name);
        });
    }

    // ========================================
    // Tools
    // ========================================
    insertTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            if (this.tools.has(data.id)) {
                throw new Error(`Tool with id ${data.id} already exists`);
            }

            const row: ToolRow = {
                id: data.id,
                name: data.name,
                description: data.description,
                created_at: this.now(),
                updated_at: this.now(),
            };

            this.tools.set(data.id, row);
        });
    }

    getTool(id: string): Promise<ToolRow | undefined> {
        return Promise.resolve(this.tools.get(id));
    }

    getAllTools(): Promise<ToolRow[]> {
        return Promise.resolve(Array.from(this.tools.values()));
    }

    updateTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            const existing = this.tools.get(data.id);
            if (!existing) {
                throw new Error(`Tool with id ${data.id} not found`);
            }

            const row: ToolRow = {
                ...existing,
                name: data.name,
                description: data.description,
                updated_at: this.now(),
            };

            this.tools.set(data.id, row);
        });
    }

    deleteTool(id: string): Promise<void> {
        return Promise.resolve().then(() => {
            // Remove from agent_tools references
            for (const tools of this.agentTools.values()) {
                const index = tools.findIndex((t) => t.tool_id === id);
                if (index !== -1) {
                    tools.splice(index, 1);
                }
            }
            this.tools.delete(id);
        });
    }

    // ========================================
    // Middlewares
    // ========================================
    insertMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            if (this.middlewares.has(data.id)) {
                throw new Error(`Middleware with id ${data.id} already exists`);
            }

            const row: MiddlewareRow = {
                id: data.id,
                name: data.name,
                description: data.description,
                created_at: this.now(),
                updated_at: this.now(),
            };

            this.middlewares.set(data.id, row);
        });
    }

    getMiddleware(id: string): Promise<MiddlewareRow | undefined> {
        return Promise.resolve(this.middlewares.get(id));
    }

    getAllMiddlewares(): Promise<MiddlewareRow[]> {
        return Promise.resolve(Array.from(this.middlewares.values()));
    }

    updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            const existing = this.middlewares.get(data.id);
            if (!existing) {
                throw new Error(`Middleware with id ${data.id} not found`);
            }

            const row: MiddlewareRow = {
                ...existing,
                name: data.name,
                description: data.description,
                updated_at: this.now(),
            };

            this.middlewares.set(data.id, row);
        });
    }

    deleteMiddleware(id: string): Promise<void> {
        return Promise.resolve().then(() => {
            // Remove from agent_middlewares references
            for (const mids of this.agentMiddlewares.values()) {
                const index = mids.findIndex((m) => m.middleware_id === id);
                if (index !== -1) {
                    mids.splice(index, 1);
                }
            }
            this.middlewares.delete(id);
        });
    }

    // ========================================
    // Agents
    // ========================================
    insertAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            if (this.agents.has(data.id)) {
                throw new Error(`Agent with id ${data.id} already exists`);
            }

            // Validate references
            if (!this.models.has(data.model)) {
                throw new Error(`Model ${data.model} not found`);
            }
            if (!this.prompts.has(data.system_prompt)) {
                throw new Error(`Prompt ${data.system_prompt} not found`);
            }

            const row: AgentRow = {
                id: data.id,
                name: data.name,
                description: data.description,
                system_prompt_id: data.system_prompt,
                model_id: data.model,
                created_at: this.now(),
                updated_at: this.now(),
            };

            this.agents.set(data.id, row);

            // Insert tools
            const tools: AgentToolRow[] = [];
            for (const [toolId, value] of Object.entries(data.tools)) {
                if (!this.tools.has(toolId)) {
                    throw new Error(`Tool ${toolId} not found`);
                }
                tools.push({
                    agent_id: data.id,
                    tool_id: toolId,
                    enabled: typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    custom_params: typeof value === 'boolean' ? null : this.safeStringify(value),
                });
            }
            this.agentTools.set(data.id, tools);

            // Insert middlewares
            const middlewares: AgentMiddlewareRow[] = [];
            for (const [midId, value] of Object.entries(data.middleware)) {
                if (!this.middlewares.has(midId)) {
                    throw new Error(`Middleware ${midId} not found`);
                }
                middlewares.push({
                    agent_id: data.id,
                    middleware_id: midId,
                    enabled: typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    custom_params: typeof value === 'boolean' ? null : this.safeStringify(value),
                });
            }
            this.agentMiddlewares.set(data.id, middlewares);
        });
    }

    async getAgent(id: string): Promise<
        | (AgentRow & {
              tools: Record<string, boolean | any>;
              middlewares: Record<string, boolean | any>;
          })
        | undefined
    > {
        const agent = this.agents.get(id);
        if (!agent) return undefined;

        const tools: Record<string, boolean | any> = {};
        const toolRows = this.agentTools.get(id) || [];
        for (const row of toolRows) {
            if (row.custom_params) {
                tools[row.tool_id] = this.safeParse(row.custom_params);
            } else {
                tools[row.tool_id] = this.intToBool(row.enabled);
            }
        }

        const middlewares: Record<string, boolean | any> = {};
        const middlewareRows = this.agentMiddlewares.get(id) || [];
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
        (AgentRow & {
            tools: Record<string, boolean | any>;
            middlewares: Record<string, boolean | any>;
        })[]
    > {
        const result: (AgentRow & {
            tools: Record<string, boolean | any>;
            middlewares: Record<string, boolean | any>;
        })[] = [];

        for (const agent of this.agents.values()) {
            const tools: Record<string, boolean | any> = {};
            const toolRows = this.agentTools.get(agent.id) || [];
            for (const row of toolRows) {
                if (row.custom_params) {
                    tools[row.tool_id] = this.safeParse(row.custom_params);
                } else {
                    tools[row.tool_id] = this.intToBool(row.enabled);
                }
            }

            const middlewares: Record<string, boolean | any> = {};
            const middlewareRows = this.agentMiddlewares.get(agent.id) || [];
            for (const row of middlewareRows) {
                if (row.custom_params) {
                    middlewares[row.middleware_id] = this.safeParse(row.custom_params);
                } else {
                    middlewares[row.middleware_id] = this.intToBool(row.enabled);
                }
            }

            result.push({ ...agent, tools, middlewares });
        }

        return result;
    }

    updateAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        return Promise.resolve().then(() => {
            const existing = this.agents.get(data.id);
            if (!existing) {
                throw new Error(`Agent with id ${data.id} not found`);
            }

            // Validate references
            if (!this.models.has(data.model)) {
                throw new Error(`Model ${data.model} not found`);
            }
            if (!this.prompts.has(data.system_prompt)) {
                throw new Error(`Prompt ${data.system_prompt} not found`);
            }

            // Update agent row
            const row: AgentRow = {
                ...existing,
                name: data.name,
                description: data.description,
                system_prompt_id: data.system_prompt,
                model_id: data.model,
                updated_at: this.now(),
            };
            this.agents.set(data.id, row);

            // Update tools
            const tools: AgentToolRow[] = [];
            for (const [toolId, value] of Object.entries(data.tools)) {
                if (!this.tools.has(toolId)) {
                    throw new Error(`Tool ${toolId} not found`);
                }
                tools.push({
                    agent_id: data.id,
                    tool_id: toolId,
                    enabled: typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    custom_params: typeof value === 'boolean' ? null : this.safeStringify(value),
                });
            }
            this.agentTools.set(data.id, tools);

            // Update middlewares
            const middlewares: AgentMiddlewareRow[] = [];
            for (const [midId, value] of Object.entries(data.middleware)) {
                if (!this.middlewares.has(midId)) {
                    throw new Error(`Middleware ${midId} not found`);
                }
                middlewares.push({
                    agent_id: data.id,
                    middleware_id: midId,
                    enabled: typeof value === 'boolean' ? this.boolToInt(value) : 1,
                    custom_params: typeof value === 'boolean' ? null : this.safeStringify(value),
                });
            }
            this.agentMiddlewares.set(data.id, middlewares);
        });
    }

    deleteAgent(id: string): Promise<void> {
        return Promise.resolve().then(() => {
            this.agents.delete(id);
            this.agentTools.delete(id);
            this.agentMiddlewares.delete(id);
        });
    }

    // ========================================
    // Query Helpers
    // ========================================
    async getAgentWithDependencies(id: string): Promise<AgentWithRelations | undefined> {
        const agent = this.agents.get(id);
        if (!agent) return undefined;

        const model = this.models.get(agent.model_id);
        if (!model) throw new Error(`Model ${agent.model_id} not found`);

        const systemPrompt = this.prompts.get(agent.system_prompt_id);
        if (!systemPrompt) throw new Error(`Prompt ${agent.system_prompt_id} not found`);

        const toolRows = this.agentTools.get(id) || [];
        const tools: (ToolRow & { enabled: boolean; customParams: any })[] = toolRows.map((row) => {
            const tool = this.tools.get(row.tool_id);
            if (!tool) throw new Error(`Tool ${row.tool_id} not found`);
            return {
                ...tool,
                enabled: this.intToBool(row.enabled),
                customParams: row.custom_params ? this.safeParse(row.custom_params) : undefined,
            };
        });

        const middlewareRows = this.agentMiddlewares.get(id) || [];
        const middlewares: (MiddlewareRow & { enabled: boolean; customParams: any })[] = middlewareRows.map((row) => {
            const middleware = this.middlewares.get(row.middleware_id);
            if (!middleware) throw new Error(`Middleware ${row.middleware_id} not found`);
            return {
                ...middleware,
                enabled: this.intToBool(row.enabled),
                customParams: row.custom_params ? this.safeParse(row.custom_params) : undefined,
            };
        });

        return { agent, model, systemPrompt, tools, middlewares };
    }
}
