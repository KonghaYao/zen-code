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
