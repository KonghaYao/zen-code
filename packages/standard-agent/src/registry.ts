import { z } from 'zod';
import { ToolSchema, MiddlewareSchema } from './schemas.js';
import type { ToolImplementation, MiddlewareImplementation } from './types.js';
import { AgentMiddleware } from 'langchain';

/**
 * Tool Registry - separates schema from implementation
 */
export class ToolRegistry {
    private _schemas: Map<string, z.infer<typeof ToolSchema>> = new Map();
    private _implementations: Map<string, ToolImplementation> = new Map();

    registerSchema(schema: z.infer<typeof ToolSchema>): void {
        const result = ToolSchema.safeParse(schema);
        if (!result.success) {
            throw new Error(`Invalid Tool schema: ${result.error.message}`);
        }
        this._schemas.set(result.data.id, result.data);
    }

    registerImplementation<Params, Result>(impl: ToolImplementation<Params, Result>): void {
        this._implementations.set(impl.id, impl);

        // Auto-register schema if not present
        if (!this._schemas.has(impl.id)) {
            this.registerSchema({
                id: impl.id,
                name: impl.name,
                description: impl.description,
            });
        }
    }

    getSchema(id: string): z.infer<typeof ToolSchema> | undefined {
        return this._schemas.get(id);
    }

    getImplementation<Params, Result>(id: string): ToolImplementation<Params, Result> | undefined {
        return this._implementations.get(id) as ToolImplementation<Params, Result> | undefined;
    }

    hasImplementation(id: string): boolean {
        return this._implementations.has(id);
    }

    listSchemas(): z.infer<typeof ToolSchema>[] {
        return Array.from(this._schemas.values());
    }

    listImplementations(): ToolImplementation[] {
        return Array.from(this._implementations.values());
    }

    async execute<Params, Result>(id: string, params: unknown, runtime?: unknown): Promise<Result> {
        const impl = this._implementations.get(id) as ToolImplementation<Params, Result> | undefined;
        if (!impl) {
            throw new Error(`Tool implementation not found: ${id}`);
        }

        // Validate params if schema is provided
        if (impl.paramsSchema) {
            const result = impl.paramsSchema.safeParse(params);
            if (!result.success) {
                throw new Error(`Invalid params for tool ${id}: ${result.error.message}`);
            }
            params = result.data as Params;
        }

        return await impl.execute(params as Params, runtime);
    }
}

/**
 * Middleware Registry - separates schema from implementation
 */
export class MiddlewareRegistry {
    private _schemas: Map<string, z.infer<typeof MiddlewareSchema>> = new Map();
    private _implementations: Map<string, MiddlewareImplementation> = new Map();

    registerSchema(schema: z.infer<typeof MiddlewareSchema>): void {
        const result = MiddlewareSchema.safeParse(schema);
        if (!result.success) {
            throw new Error(`Invalid Middleware schema: ${result.error.message}`);
        }
        this._schemas.set(result.data.id, result.data);
    }

    registerImplementation<Context>(impl: MiddlewareImplementation<Context>): void {
        this._implementations.set(impl.id, impl);

        // Auto-register schema if not present
        if (!this._schemas.has(impl.id)) {
            this.registerSchema({
                id: impl.id,
                name: impl.name,
                description: impl.description,
            });
        }
    }

    getSchema(id: string): z.infer<typeof MiddlewareSchema> | undefined {
        return this._schemas.get(id);
    }

    getImplementation<Context>(id: string): MiddlewareImplementation<Context> | undefined {
        return this._implementations.get(id) as MiddlewareImplementation<Context> | undefined;
    }

    hasImplementation(id: string): boolean {
        return this._implementations.has(id);
    }

    listSchemas(): z.infer<typeof MiddlewareSchema>[] {
        return Array.from(this._schemas.values());
    }

    listImplementations(): MiddlewareImplementation[] {
        return Array.from(this._implementations.values());
    }

    async execute<Context>(id: string, context: unknown): Promise<AgentMiddleware> {
        const impl = this._implementations.get(id) as MiddlewareImplementation<Context> | undefined;
        if (!impl) {
            throw new Error(`Middleware implementation not found: ${id}`);
        }

        // Validate context if schema is provided
        if (impl.paramsSchema) {
            const result = impl.paramsSchema.safeParse(context);
            if (!result.success) {
                throw new Error(`Invalid context for middleware ${id}: ${result.error.message}`);
            }
            context = result.data as Context;
        }

        return await impl.execute(context as Context);
    }
}
