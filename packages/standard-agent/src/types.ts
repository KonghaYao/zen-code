import { AgentMiddleware } from 'langchain';
import { z } from 'zod';

// ============ Implementation Interfaces ============

/**
 * Middleware implementation interface
 * Pure schema + execution logic
 */
export interface MiddlewareImplementation<Context = unknown> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    /** Optional Zod schema for parameter validation */
    readonly paramsSchema?: z.ZodType<Context>;
    /** Execute the middleware with context */
    execute(context: Context): Promise<AgentMiddleware> | AgentMiddleware;
}
