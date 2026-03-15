/**
 * Agents Router
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AgentSchema } from '@langgraph-js/standard-agent';
import { router, publicProcedure, handleNotFound } from './trpc.js';

// Schema 定义 - base schema without refinements for partial()
const AgentInputBaseSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().min(1),
    system_prompt: z.string().min(1),
    model: z.string().min(1),
    middlewares: z.record(z.string(), z.union([z.boolean(), z.any()])),
});

// Schema for create with refinements
export const AgentInputSchema = AgentInputBaseSchema.superRefine((data, ctx) => {
    if (!data.middlewares || Object.keys(data.middlewares).length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Agent must have at least one middleware',
            path: ['middlewares'],
        });
    }
});

// Schema for update
export const UpdateAgentSchema = AgentInputBaseSchema.partial()
    .extend({ id: z.string() })
    .refine(
        (data) => {
            if (data.middlewares && Object.keys(data.middlewares).length === 0) return false;
            return true;
        },
        { message: 'middlewares must have at least one entry when provided' },
    );

// ========================================
// Router
// ========================================

export const agentsRouter = router({
    // 列出所有 Agents
    list: publicProcedure.query(async ({ ctx }) => {
        return await ctx.agentPackage.listAgents();
    }),

    // 获取单个 Agent
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const agent = await ctx.agentPackage.getAgent(input.id);
        if (!agent) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Agent '${input.id}' not found` });
        }
        return agent;
    }),

    // 获取 Agent 及其依赖关系
    getWithDependencies: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const agentWithDeps = await ctx.mergedStorage.getAgentWithDependencies(input.id);
        if (!agentWithDeps) {
            throw handleNotFound('Agent', input.id);
        }
        const agentFull = await ctx.mergedStorage.getAgent(input.id);
        return {
            ...agentWithDeps.agent,
            system_prompt: agentWithDeps.agent.system_prompt_id,
            model: agentWithDeps.agent.model_id,
            modelInfo: agentWithDeps.model,
            promptInfo: agentWithDeps.systemPrompt,
            middlewares: agentFull!.middlewares,
        };
    }),

    // 创建 Agent
    create: publicProcedure.input(AgentSchema).mutation(async ({ ctx, input }) => {
        await ctx.agentPackage.addAgent(input);
        return { success: true };
    }),

    // 更新 Agent（DB 有则 update，无则 insert 覆盖内置）
    update: publicProcedure.input(AgentSchema).mutation(async ({ ctx, input }) => {
        await ctx.mergedStorage.updateAgent(input);
        return { success: true };
    }),

    // 删除 Agent（内置 agent 禁止删除）
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const isBuiltin = await ctx.mergedStorage.isBuiltin(input.id);
        if (isBuiltin) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: `Cannot delete built-in agent '${input.id}'. Use resetToDefault to restore defaults.`,
            });
        }
        await ctx.mergedStorage.deleteAgent(input.id);
        return { success: true };
    }),

    // 重置 Agent 到内置默认值
    resetToDefault: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        const hasOverride = await ctx.mergedStorage.hasDbOverride('agent', input.id);
        if (!hasOverride) {
            return { success: true, message: 'Already at default' };
        }
        await ctx.mergedStorage.deleteAgent(input.id);
        return { success: true };
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

    // 导出所有 Agents 配置
    exportAll: publicProcedure.query(async ({ ctx }) => {
        const json = await ctx.agentPackage.toJSON();
        return json;
    }),
});
