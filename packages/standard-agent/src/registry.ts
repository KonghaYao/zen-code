import { z } from 'zod';
import { MiddlewareSchema } from './schemas.js';
import type { MiddlewareImplementation } from './types.js';
import { AgentMiddleware } from 'langchain';

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
