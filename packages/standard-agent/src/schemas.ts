import z from 'zod';

// ============ Provider Types ============
/**
 * Supported provider types
 */
export const ProviderTypeSchema = z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'moonshot', 'zhipu', 'custom']);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

// ============ Schemas ============
export const ModelSchema = z.object({
    id: z.string(),
    name: z.string().optional().describe('Display name for the model'),
    provider_id: z.string().describe('Foreign key reference to provider'),
    model_name: z.string().describe('Actual model ID to use (e.g., gpt-4o, claude-3-5-sonnet)'),
    stream_usage: z.boolean().default(false),
    enable_thinking: z.boolean().default(false),
    temperature: z.number().default(0.7),
    max_tokens: z.number().default(4096),
    top_p: z.number().default(1.0),
    frequency_penalty: z.number().default(0.0),
    presence_penalty: z.number().default(0.0),
});

export const PromptSchema = z.object({
    id: z.string(),
    name: z.string().describe('prompt name, must be unique'),
    // Note: content moved to PromptVersionSchema
});

export const PromptVersionSchema = z.object({
    id: z.string(),
    prompt_id: z.string().describe('reference to prompt'),
    version: z.number().int().positive().describe('version number, starts from 1'),
    content: z.string().describe('prompt content for this version'),
    metadata: z.any().optional().describe('version-specific metadata'),
    change_note: z.string().optional().describe('description of changes in this version'),
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
