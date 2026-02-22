import { AgentMiddleware } from 'langchain';
import { z } from 'zod';

// ============ Implementation Interfaces ============
/**
 * Tool implementation interface
 * Pure schema + execution logic
 */
export interface ToolImplementation<Params = unknown, Result = unknown> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    /** Optional Zod schema for parameter validation */
    readonly paramsSchema?: z.ZodType<Params>;
    /** Execute the tool with parameters */
    execute(params: Params, runtime: any): Promise<Result> | Result;
}

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
