import { AgentPackage } from '../index.js';
import { AgentStorage } from './dal.js';
import { MemoryStorage } from './memory.js';
import { IStorage, ModelRow, PromptRow, ToolRow, MiddlewareRow } from './abstract.js';
import { ToolImplementation, MiddlewareImplementation } from '../index.js';

// ========================================
// Schema Injection Types
// ========================================
export interface SchemaInjectionOptions {
    /** Storage implementation (defaults to SQLite at dbPath) */
    storage?: IStorage;
    /** dbPath is only used if storage is not provided */
    dbPath?: string;
    autoInitialize?: boolean;
}

/**
 * InjectedAgentPackage - Schema-driven AgentPackage
 *
 * Loads all schemas from SQLite (using bun:sqlite) instead of in-memory Maps.
 * Tools and Middleware implementations are still registered in-memory.
 *
 * @example
 * ```typescript
 * const pkg = createInjectedAgentPackage('./agents.db');
 * pkg.registerToolImplementation({ id: 'tool-id', ... });
 * pkg.persistTool({ id: 'tool-id', name: 'Tool', description: '...' });
 * ```
 */
export class InjectedAgentPackage extends AgentPackage {
    private storage: IStorage;

    constructor(options: SchemaInjectionOptions) {
        super({ models: [], prompts: [], agents: [] });
        this.storage = options.storage ?? new AgentStorage(options.dbPath ?? ':memory:');

        if (options.autoInitialize !== false) {
            this.loadAllSchemas();
        }
    }

    // ========================================
    // Schema Loading
    // ========================================
    private loadAllSchemas(): void {
        // Load Models
        for (const modelRow of this.storage.getAllModels()) {
            this.injectModel(modelRow);
        }

        // Load Prompts
        for (const promptRow of this.storage.getAllPrompts()) {
            this.injectPrompt(promptRow);
        }

        // Load Tools (schema only)
        for (const toolRow of this.storage.getAllTools()) {
            this.injectTool(toolRow);
        }

        // Load Middlewares (schema only)
        for (const middlewareRow of this.storage.getAllMiddlewares()) {
            this.injectMiddleware(middlewareRow);
        }

        // Load Agents
        for (const agentData of this.storage.getAllAgents()) {
            this.injectAgent(agentData);
        }
    }

    // ========================================
    // Schema Injection Methods
    // ========================================
    private injectModel(row: ModelRow): void {
        const data = {
            id: row.id,
            model_name: row.model_name,
            model_provider: row.model_provider,
            stream_usage: row.stream_usage === 1,
            enable_thinking: row.enable_thinking === 1,
            temperature: row.temperature,
            max_tokens: row.max_tokens,
            top_p: row.top_p,
            frequency_penalty: row.frequency_penalty,
            presence_penalty: row.presence_penalty,
        };
        // Access private _models Map via public addModel method
        super.addModel(data);
    }

    private injectPrompt(row: PromptRow): void {
        const data = {
            id: row.id,
            name: row.name,
            content: row.content,
            metadata: this.parseMetadata(row.metadata),
        };
        super.addPrompt(data);
    }

    /**
     * Safely parse metadata from either string or object
     */
    private parseMetadata(metadata: string | null | any): any {
        if (!metadata) return undefined;
        if (typeof metadata === 'string') {
            try {
                return JSON.parse(metadata);
            } catch {
                return metadata; // Return as-is if not valid JSON
            }
        }
        // Already an object
        return metadata;
    }

    private injectTool(row: ToolRow): void {
        const data = {
            id: row.id,
            name: row.name,
            description: row.description,
        };
        super.addTool(data);
    }

    private injectMiddleware(row: MiddlewareRow): void {
        const data = {
            id: row.id,
            name: row.name,
            description: row.description,
        };
        super.addMiddleware(data);
    }

    private injectAgent(row: any): void {
        const data = {
            id: row.id,
            name: row.name,
            description: row.description,
            system_prompt: row.system_prompt_id,
            model: row.model_id,
            tools: row.tools,
            middleware: row.middlewares,
        };
        super.addAgent(data);
    }

    // ========================================
    // Reload Schemas from Database
    // ========================================
    reloadSchemas(): void {
        // Clear existing schemas by creating a new instance
        // Access and clear internal maps via reflection
        (this as any)._models.clear();
        (this as any)._prompts.clear();
        (this as any)._tools.clear();
        (this as any)._middlewares.clear();
        (this as any)._agents.clear();

        this.loadAllSchemas();
    }

    // ========================================
    // Schema Persistence
    // ========================================
    persistModel(data: any): void {
        this.storage.insertModel(data);
        this.injectModel(data as any);
    }

    persistPrompt(data: any): void {
        this.storage.insertPrompt(data);
        this.injectPrompt(data as any);
    }

    persistTool(data: any): void {
        this.storage.insertTool(data);
        this.injectTool(data as any);
    }

    persistMiddleware(data: any): void {
        this.storage.insertMiddleware(data);
        this.injectMiddleware(data as any);
    }

    persistAgent(data: any): void {
        this.storage.insertAgent(data);
        // Re-fetch from database to get the correct format for injection
        const agentRow = this.storage.getAgent(data.id);
        if (agentRow) {
            this.injectAgent(agentRow);
        }
    }

    // ========================================
    // Schema Update
    // ========================================
    updateModel(data: any): void {
        this.storage.updateModel(data);
        this.reloadSchemas();
    }

    updatePrompt(data: any): void {
        this.storage.updatePrompt(data);
        this.reloadSchemas();
    }

    updateTool(data: any): void {
        this.storage.updateTool(data);
        this.reloadSchemas();
    }

    updateMiddleware(data: any): void {
        this.storage.updateMiddleware(data);
        this.reloadSchemas();
    }

    updateAgent(data: any): void {
        this.storage.updateAgent(data);
        this.reloadSchemas();
    }

    // ========================================
    // Schema Deletion
    // ========================================
    deleteModel(id: string): void {
        this.storage.deleteModel(id);
        this.reloadSchemas();
    }

    deletePrompt(id: string): void {
        this.storage.deletePrompt(id);
        this.reloadSchemas();
    }

    deleteTool(id: string): void {
        this.storage.deleteTool(id);
        this.reloadSchemas();
    }

    deleteMiddleware(id: string): void {
        this.storage.deleteMiddleware(id);
        this.reloadSchemas();
    }

    deleteAgent(id: string): void {
        this.storage.deleteAgent(id);
        this.reloadSchemas();
    }

    // ========================================
    // Implementation Registration
    // ========================================
    /**
     * Register tool implementation (in-memory only)
     */
    registerToolImplementation<Params = unknown, Result = unknown>(impl: ToolImplementation<Params, Result>): void {
        this.tools.registerImplementation(impl);
    }

    /**
     * Register middleware implementation (in-memory only)
     */
    registerMiddlewareImplementation<Context = unknown, Result = unknown>(
        impl: MiddlewareImplementation<Context, Result>,
    ): void {
        this.middlewares.registerImplementation(impl);
    }

    // ========================================
    // Batch Schema Import
    // ========================================
    /**
     * Import an AgentPackage to SQLite
     */
    importAgentPackage(pkg: AgentPackage): void {
        this.storage.transaction(() => {
            // Import models
            for (const model of pkg.listModels()) {
                try {
                    this.storage.insertModel(model.toJSON());
                } catch (e) {
                    // Skip if already exists
                    if ((e as any).message && !(e as any).message.includes('UNIQUE constraint')) {
                        throw e;
                    }
                }
            }

            // Import prompts
            for (const prompt of pkg.listPrompts()) {
                try {
                    this.storage.insertPrompt(prompt.toJSON());
                } catch (e) {
                    if ((e as any).message && !(e as any).message.includes('UNIQUE constraint')) {
                        throw e;
                    }
                }
            }

            // Import tools
            for (const tool of pkg.listTools()) {
                try {
                    this.storage.insertTool(tool.toJSON());
                } catch (e) {
                    if ((e as any).message && !(e as any).message.includes('UNIQUE constraint')) {
                        throw e;
                    }
                }
            }

            // Import middlewares
            for (const middleware of pkg.listMiddlewares()) {
                try {
                    this.storage.insertMiddleware(middleware.toJSON());
                } catch (e) {
                    if ((e as any).message && !(e as any).message.includes('UNIQUE constraint')) {
                        throw e;
                    }
                }
            }

            // Import agents
            for (const agent of pkg.listAgents()) {
                const agentData = agent.toJSON();
                try {
                    this.storage.insertAgent(agentData);
                } catch (e) {
                    if ((e as any).message && !(e as any).message.includes('UNIQUE constraint')) {
                        throw e;
                    }
                }
            }
        });

        // Reload schemas after import
        this.reloadSchemas();
    }

    /**
     * Export to AgentPackage (in-memory)
     */
    exportToAgentPackage(): AgentPackage {
        return new AgentPackage(this.toJSON());
    }

    // ========================================
    // Storage Access
    // ========================================
    getStorage(): IStorage {
        return this.storage;
    }

    // ========================================
    // Cleanup
    // ========================================
    close(): void {
        this.storage.close();
    }
}

// ========================================
// Factory Functions
// ========================================
export function createInjectedAgentPackage(dbPath: string, autoInitialize = true): InjectedAgentPackage {
    return new InjectedAgentPackage({ dbPath, autoInitialize });
}

export function createInjectedAgentPackageFromMemory(pkg: AgentPackage, dbPath: string): InjectedAgentPackage {
    const injected = new InjectedAgentPackage({ dbPath, autoInitialize: false });
    injected.importAgentPackage(pkg);
    return injected;
}
