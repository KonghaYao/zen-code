/**
 * Agents Router
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// Schema 定义 - base schema without refinements for partial()
const AgentInputBaseSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().min(1),
    system_prompt: z.string().min(1), // Prompt ID - must be non-empty
    model: z.string().min(1), // Model ID - must be non-empty
    tools: z.record(z.string(), z.union([z.boolean(), z.any()])),
    middleware: z.record(z.string(), z.union([z.boolean(), z.any()])),
});

// Schema for create with refinements
export const AgentInputSchema = AgentInputBaseSchema.superRefine((data, ctx) => {
    // Validate that tools record has at least one key
    if (!data.tools || Object.keys(data.tools).length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Agent must have at least one tool',
            path: ['tools'],
        });
    }

    // Validate that middleware record has at least one key
    if (!data.middleware || Object.keys(data.middleware).length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Agent must have at least one middleware',
            path: ['middleware'],
        });
    }
});

// Schema for update using base schema (allows partial)
export const UpdateAgentSchema = AgentInputBaseSchema.partial()
    .extend({
        id: z.string(),
    })
    .refine(
        (data) => {
            // When updating, if tools/middleware are provided, they must not be empty
            if (data.tools && Object.keys(data.tools).length === 0) {
                return false;
            }
            if (data.middleware && Object.keys(data.middleware).length === 0) {
                return false;
            }
            return true;
        },
        {
            message: 'tools and middleware must have at least one entry when provided',
        },
    );

// ========================================
// Router
// ========================================

export const agentsRouter = router({
    // 列出所有 Agents（包含关联的 Tools 和 Middlewares）
    list: publicProcedure.query(async ({ ctx }) => {
        const agents = await ctx.agentPackage.storage.getAllAgents();

        // Transform database row format to frontend expected format
        // DB: system_prompt_id, model_id -> Frontend: system_prompt, model
        return agents.map((agent) => ({
            ...agent,
            system_prompt: agent.system_prompt_id,
            model: agent.model_id,
        }));
    }),

    // 获取单个 Agent（包含关联的 Tools 和 Middlewares）
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const agent = await ctx.agentPackage.storage.getAgent(input.id);
        if (!agent) {
            handleNotFound('Agent', input.id);
        }
        // Transform database row format to frontend expected format
        return {
            ...agent,
            system_prompt: agent.system_prompt_id,
            model: agent.model_id,
        };
    }),

    // 获取 Agent 及其依赖关系（包含 Model 和 System Prompt 详情）
    getWithDependencies: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const agentWithDeps = await ctx.agentPackage.storage.getAgentWithDependencies(input.id);
        if (!agentWithDeps) {
            handleNotFound('Agent', input.id);
        }

        // 获取完整的 tools 和 middlewares 配置
        const agentFull = await ctx.agentPackage.storage.getAgent(input.id);

        // Transform database row format to frontend expected format
        return {
            ...agentWithDeps.agent,
            system_prompt: agentWithDeps.agent.system_prompt_id,
            model: agentWithDeps.agent.model_id,
            modelInfo: agentWithDeps.model,
            promptInfo: agentWithDeps.systemPrompt,
            tools: agentFull!.tools,
            middlewares: agentFull!.middlewares,
        };
    }),

    // 创建 Agent
    create: publicProcedure.input(AgentInputSchema).mutation(async ({ ctx, input }) => {
        // 验证关联的 Model 和 Prompt 是否存在
        const model = await ctx.agentPackage.storage.getModel(input.model);
        if (!model) {
            handleNotFound('Model', input.model);
        }

        const prompt = await ctx.agentPackage.storage.getPrompt(input.system_prompt);
        if (!prompt) {
            handleNotFound('Prompt', input.system_prompt);
        }

        // 验证关联的 Tools 是否存在（跳过空键）
        for (const toolId of Object.keys(input.tools)) {
            if (toolId.trim() === '') continue; // Skip empty keys
            const tool = await ctx.agentPackage.storage.getTool(toolId);
            if (!tool) {
                handleNotFound('Tool', toolId);
            }
        }

        // 验证关联的 Middlewares 是否存在（跳过空键）
        for (const midId of Object.keys(input.middleware)) {
            if (midId.trim() === '') continue; // Skip empty keys
            const middleware = await ctx.agentPackage.storage.getMiddleware(midId);
            if (!middleware) {
                handleNotFound('Middleware', midId);
            }
        }

        await ctx.agentPackage.storage.insertAgent(input);
        return { id: input.id };
    }),

    // 更新 Agent
    update: publicProcedure.input(UpdateAgentSchema).mutation(async ({ ctx, input }) => {
        const existing = await ctx.agentPackage.storage.getAgent(input.id);
        if (!existing) {
            handleNotFound('Agent', input.id);
        }

        // 如果更新了 model，验证是否存在
        if (input.model) {
            const model = await ctx.agentPackage.storage.getModel(input.model);
            if (!model) {
                handleNotFound('Model', input.model);
            }
        }

        // 如果更新了 system_prompt，验证是否存在
        if (input.system_prompt) {
            const prompt = await ctx.agentPackage.storage.getPrompt(input.system_prompt);
            if (!prompt) {
                handleNotFound('Prompt', input.system_prompt);
            }
        }

        // 如果更新了 tools，验证它们是否存在（跳过空键）
        if (input.tools) {
            for (const toolId of Object.keys(input.tools)) {
                if (toolId.trim() === '') continue; // Skip empty keys
                const tool = await ctx.agentPackage.storage.getTool(toolId);
                if (!tool) {
                    handleNotFound('Tool', toolId);
                }
            }
        }

        // 如果更新了 middleware，验证它们是否存在（跳过空键）
        if (input.middleware) {
            for (const midId of Object.keys(input.middleware)) {
                if (midId.trim() === '') continue; // Skip empty keys
                const middleware = await ctx.agentPackage.storage.getMiddleware(midId);
                if (!middleware) {
                    handleNotFound('Middleware', midId);
                }
            }
        }

        const updateData = { ...existing, ...input } as any;
        await ctx.agentPackage.storage.updateAgent(updateData);
        return { id: input.id };
    }),

    // 删除 Agent
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        await ctx.agentPackage.storage.deleteAgent(input.id);
        return { id: input.id };
    }),

    // 批量创建 Agents
    createMany: publicProcedure.input(z.array(AgentInputSchema)).mutation(async ({ ctx, input }) => {
        await Promise.all(input.map((data) => ctx.agentPackage.storage.insertAgent(data)));
        return { count: input.length, ids: input.map((a) => a.id) };
    }),

    // 验证 Agent
    validate: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const validation = await ctx.agentPackage.validateAgent(input.id);
        return validation;
    }),

    // 验证所有 Agents
    validateAll: publicProcedure.query(async ({ ctx }) => {
        const validation = await ctx.agentPackage.validateAll();
        return validation;
    }),

    // 导出 Agent 配置为 JSON
    export: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const json = await ctx.agentPackage.toJSON();
        return json;
    }),

    // 导出所有 Agents 配置为 JSON
    exportAll: publicProcedure.query(async ({ ctx }) => {
        const json = await ctx.agentPackage.toJSON();
        return json;
    }),
});
