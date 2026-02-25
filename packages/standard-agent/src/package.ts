import { z } from 'zod';
import { ToolRegistry, MiddlewareRegistry } from './registry.js';
import { AgentRepository } from './repository.js';
import { AgentValidator } from './validator.js';
import { AgentSerializer } from './serializer.js';
import { AgentPackageSchema, ToolSchema, MiddlewareSchema, ModelSchema, AgentSchema } from './schemas.js';
import type { IStorage, ModelRow, ToolRow, MiddlewareRow } from './storage/abstract.js';

/**
 * Agent Package
 *
 * Coordinates repository, validator, serializer, and runtime registries
 */
export class AgentPackage {
    readonly storage: IStorage;
    readonly repository: AgentRepository;
    readonly validator: AgentValidator;
    readonly serializer: AgentSerializer;

    // Registries for runtime implementations (not persisted)
    readonly tools = new ToolRegistry();
    readonly middlewares = new MiddlewareRegistry();

    // Proxy methods (initialized in constructor)
    getModel!: AgentRepository['getModel'];
    getPrompt!: AgentRepository['getPrompt'];
    getPromptByName!: AgentRepository['getPromptByName'];
    getTool!: AgentRepository['getTool'];
    getMiddleware!: AgentRepository['getMiddleware'];
    getAgent!: AgentRepository['getAgent'];

    listModels!: AgentRepository['listModels'];
    listPrompts!: AgentRepository['listPrompts'];
    listTools!: AgentRepository['listTools'];
    listMiddlewares!: AgentRepository['listMiddlewares'];
    listAgents!: AgentRepository['listAgents'];

    validateAgent!: AgentValidator['validateAgent'];
    validateAll!: AgentValidator['validateAll'];

    toJSON!: AgentSerializer['toJSON'];

    constructor(storage: IStorage) {
        this.storage = storage;
        this.repository = new AgentRepository(storage);
        this.validator = new AgentValidator(storage);
        this.serializer = new AgentSerializer(storage);

        // Bind proxy methods after initialization
        this.getModel = this.repository.getModel.bind(this.repository);
        this.getPrompt = this.repository.getPrompt.bind(this.repository);
        this.getPromptByName = this.repository.getPromptByName.bind(this.repository);
        this.getTool = this.repository.getTool.bind(this.repository);
        this.getMiddleware = this.repository.getMiddleware.bind(this.repository);
        this.getAgent = this.repository.getAgent.bind(this.repository);

        this.listModels = this.repository.listModels.bind(this.repository);
        this.listPrompts = this.repository.listPrompts.bind(this.repository);
        this.listTools = this.repository.listTools.bind(this.repository);
        this.listMiddlewares = this.repository.listMiddlewares.bind(this.repository);
        this.listAgents = this.repository.listAgents.bind(this.repository);

        this.validateAgent = this.validator.validateAgent.bind(this.validator);
        this.validateAll = this.validator.validateAll.bind(this.validator);

        this.toJSON = this.serializer.toJSON.bind(this.serializer);
    }

    // ========================================
    // Delegated CRUD Operations
    // ========================================

    async addModel(data: z.infer<typeof ModelSchema>): Promise<void> {
        await this.repository.addModel(data);
        // Register in tool registry for runtime discovery
        this.tools.registerSchema({
            id: data.id,
            name: data.model_name,
            description: `Model: ${data.model_provider}/${data.model_name}`,
        });
    }

    async addPrompt(
        data: z.infer<typeof import('./index.js').PromptSchema>,
        content: string,
        changeNote?: string,
    ): Promise<void> {
        await this.repository.addPrompt(data, content, changeNote);
    }

    async addTool(data: z.infer<typeof ToolSchema>): Promise<void> {
        await this.repository.addTool(data);
        // Register in registry for runtime discovery
        this.tools.registerSchema(data);
    }

    async addMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void> {
        await this.repository.addMiddleware(data);
        // Register in registry for runtime discovery
        this.middlewares.registerSchema(data);
    }

    async addAgent(data: z.infer<typeof AgentSchema>): Promise<void> {
        await this.repository.addAgent(data);
    }

    // ========================================
    // Factory Methods
    // ========================================

    /**
     * Create AgentPackage from storage and load runtime registries
     */
    static async fromStorage(storage: IStorage): Promise<AgentPackage> {
        const pkg = new AgentPackage(storage);

        // Load and register tools (for runtime discovery)
        const tools = await storage.getAllTools();
        tools.forEach((t: ToolRow) => {
            pkg.tools.registerSchema({
                id: t.id,
                name: t.name,
                description: t.description,
            });
        });

        // Load and register middlewares (for runtime discovery)
        const middlewares = await storage.getAllMiddlewares();
        middlewares.forEach((m: MiddlewareRow) => {
            pkg.middlewares.registerSchema({
                id: m.id,
                name: m.name,
                description: m.description,
            });
        });

        // Load and register models (for runtime discovery)
        const models = await storage.getAllModels();
        models.forEach((m: ModelRow) => {
            pkg.tools.registerSchema({
                id: m.id,
                name: m.model_name,
                description: `Model: ${m.model_provider}/${m.model_name}`,
            });
        });

        return pkg;
    }

    /**
     * Load data from JSON into storage
     */
    static async loadFromJSON(storage: IStorage, data: z.infer<typeof AgentPackageSchema>): Promise<AgentPackage> {
        const pkg = new AgentPackage(storage);
        await pkg.serializer.fromJSON(data);
        return pkg;
    }
}
