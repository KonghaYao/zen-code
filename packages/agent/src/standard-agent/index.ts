import z from 'zod';

// ============ Schemas ============
export const ModelSchema = z.object({
    id: z.string(),
    model_name: z.string(),
    model_provider: z.string(),
    stream_usage: z.boolean(),
    enable_thinking: z.boolean(),
    temperature: z.number(),
    max_tokens: z.number(),
    top_p: z.number(),
    frequency_penalty: z.number(),
    presence_penalty: z.number(),
});

export const PromptSchema = z.object({
    id: z.string(),
    name: z.string().describe('prompt name, must be unique'),
    content: z.string().describe('prompt content'),
    metadata: z.any().optional().describe('prompt metadata'),
});

export const ToolSchema = z.object({
    id: z.string().describe('tool id, must be unique, folder/tool/subtool_name'),
    name: z.string(),
    description: z.string(),
});

export const ToolCustomParamsSchema = z.any().describe('tool custom params, must be a valid JSON object');
export const MiddlewareCustomParamsSchema = z.any().describe('middleware custom params, must be a valid JSON object');

export const MiddlewareSchema = z.object({
    id: z.string().describe('middleware id, must be unique, folder/middleware/middleware_name'),
    name: z.string(),
    description: z.string(),
});

export const AgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    system_prompt: PromptSchema.shape.id,
    tools: z.record(ToolSchema.shape.id, z.union([z.boolean(), ToolCustomParamsSchema])),
    middleware: z.record(MiddlewareSchema.shape.id, z.union([z.boolean(), MiddlewareCustomParamsSchema])),
    model: ModelSchema.shape.id,
});

export const AgentPackageSchema = z.object({
    agents: z.array(AgentSchema),
    prompts: z.array(PromptSchema),
    models: z.array(ModelSchema),
});

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
    execute(params: Params): Promise<Result> | Result;
}

/**
 * Middleware implementation interface
 * Pure schema + execution logic
 */
export interface MiddlewareImplementation<Context = unknown, Result = unknown> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    /** Optional Zod schema for parameter validation */
    readonly paramsSchema?: z.ZodType<Context>;
    /** Execute the middleware with context */
    execute(context: Context): Promise<Result> | Result;
}

// ============ Re-exports ============
export * from './entity.js';
export * from './registry.js';
export * from './agent.js';
export * from './package.js';
export * from './storage/dal.js';
export * from './storage/persistence.js';
export * from './storage/abstract.js';
export * from './storage/memory.js';
export * from './storage/postgres-example.js';

