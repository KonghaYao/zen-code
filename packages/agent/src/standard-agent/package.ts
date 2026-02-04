import { z } from 'zod';
import { Model, Prompt, Tool, Middleware } from './entity.js';
import { ToolRegistry, MiddlewareRegistry } from './registry.js';
import { Agent } from './agent.js';
import { AgentPackageSchema, AgentSchema, MiddlewareSchema, ModelSchema, PromptSchema, ToolSchema } from './index.js';

// ============ Agent Package ============
export interface AgentPackageOptions {
    models?: Array<z.infer<typeof AgentPackageSchema.shape.models.element>>;
    prompts?: Array<z.infer<typeof AgentPackageSchema.shape.prompts.element>>;
    tools?: Array<z.infer<typeof ToolSchema>>;
    middlewares?: Array<z.infer<typeof MiddlewareSchema>>;
    agents?: Array<z.infer<typeof AgentPackageSchema.shape.agents.element>>;
}

export class AgentPackage {
    private _models: Map<string, Model> = new Map();
    private _prompts: Map<string, Prompt> = new Map();
    private _tools: Map<string, Tool> = new Map();
    private _middlewares: Map<string, Middleware> = new Map();
    private _agents: Map<string, Agent> = new Map();
    // Registries for implementations
    readonly tools = new ToolRegistry();
    readonly middlewares = new MiddlewareRegistry();

    constructor(options?: AgentPackageOptions) {
        if (options?.models) options.models.forEach((m) => this._models.set(m.id, new Model(m)));
        if (options?.prompts) options.prompts.forEach((p) => this._prompts.set(p.id, new Prompt(p)));
        if (options?.tools) options.tools.forEach((t) => this._tools.set(t.id, new Tool(t)));
        if (options?.middlewares) options.middlewares.forEach((m) => this._middlewares.set(m.id, new Middleware(m)));
        if (options?.agents) options.agents.forEach((a) => this._agents.set(a.id, new Agent(a)));
    }

    // Resource Management
    addModel(data: z.infer<typeof ModelSchema>): void {
        this._models.set(data.id, new Model(data));
    }

    addPrompt(data: z.infer<typeof PromptSchema>): void {
        this._prompts.set(data.id, new Prompt(data));
    }

    addTool(data: z.infer<typeof ToolSchema>): void {
        const tool = new Tool(data);
        this._tools.set(data.id, tool);
        // Register schema in registry
        this.tools.registerSchema(data);
    }

    addMiddleware(data: z.infer<typeof MiddlewareSchema>): void {
        const middleware = new Middleware(data);
        this._middlewares.set(data.id, middleware);
        // Register schema in registry
        this.middlewares.registerSchema(data);
    }

    addAgent(data: z.infer<typeof AgentSchema>): void {
        this._agents.set(data.id, new Agent(data));
    }

    // Resource Access
    getModel(id: string): Model | undefined {
        return this._models.get(id);
    }

    getPrompt(id: string): Prompt | undefined {
        return this._prompts.get(id);
    }

    getTool(id: string): Tool | undefined {
        return this._tools.get(id);
    }

    getMiddleware(id: string): Middleware | undefined {
        return this._middlewares.get(id);
    }

    getAgent(id: string): Agent | undefined {
        return this._agents.get(id);
    }

    // List Resources
    listModels(): Model[] {
        return Array.from(this._models.values());
    }

    listPrompts(): Prompt[] {
        return Array.from(this._prompts.values());
    }

    listTools(): Tool[] {
        return Array.from(this._tools.values());
    }

    listMiddlewares(): Middleware[] {
        return Array.from(this._middlewares.values());
    }

    listAgents(): Agent[] {
        return Array.from(this._agents.values());
    }

    // Validation
    validateAgent(agentId: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const agent = this._agents.get(agentId);

        if (!agent) {
            errors.push(`Agent ${agentId} not found`);
            return { valid: false, errors };
        }

        // Check model reference
        if (!this._models.has(agent.modelId)) {
            errors.push(`Model ${agent.modelId} not found`);
        }

        // Check system prompt reference
        if (!this._prompts.has(agent.systemPromptId)) {
            errors.push(`Prompt ${agent.systemPromptId} not found`);
        }

        // Check tool references
        for (const toolId of Object.keys(agent.tools)) {
            if (!this._tools.has(toolId)) {
                errors.push(`Tool ${toolId} not found`);
            }
        }

        // Check middleware references
        for (const midId of Object.keys(agent.middleware)) {
            if (!this._middlewares.has(midId)) {
                errors.push(`Middleware ${midId} not found`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    validateAll(): Map<string, { valid: boolean; errors: string[] }> {
        const results = new Map<string, { valid: boolean; errors: string[] }>();
        for (const agentId of this._agents.keys()) {
            results.set(agentId, this.validateAgent(agentId));
        }
        return results;
    }

    // Serialization
    toJSON(): z.infer<typeof AgentPackageSchema> {
        return {
            models: Array.from(this._models.values()).map((m) => m.toJSON()),
            prompts: Array.from(this._prompts.values()).map((p) => p.toJSON()),
            agents: Array.from(this._agents.values()).map((a) => a.toJSON()),
        };
    }

    static fromJSON(data: z.infer<typeof AgentPackageSchema>): AgentPackage {
        const result = AgentPackageSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid AgentPackage data: ${result.error.message}`);
        }

        const pkg = new AgentPackage();

        // Add resources in dependency order
        result.data.models.forEach((m) => pkg.addModel(m));
        result.data.prompts.forEach((p) => pkg.addPrompt(p));

        // Agents can reference tools and middleware, need to add them if present
        // Note: Tool and Middleware are not directly in AgentPackageSchema
        // but they may be loaded from elsewhere
        result.data.agents.forEach((a) => pkg.addAgent(a));

        return pkg;
    }
}
