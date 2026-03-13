/**
 * agents 路由 - 对应 useAgents
 * 从 AgentPackage 动态查询 agents，支持 CRUD 操作
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AgentSchema } from '@langgraph-js/standard-agent';
import { router, procedure } from '../trpc.js';

export const agentsRouter = router({
    list: procedure.query(async ({ ctx }) => {
        return await ctx.agentPackage.listAgents();
    }),

    get: procedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const agent = await ctx.agentPackage.getAgent(input.id);
        if (!agent) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Agent '${input.id}' not found` });
        }
        return agent;
    }),

    create: procedure.input(AgentSchema).mutation(async ({ ctx, input }) => {
        // insertAgent 会通过 MergedStorage 自动处理依赖迁移
        await ctx.agentPackage.addAgent(input);
        return { success: true };
    }),

    update: procedure.input(AgentSchema).mutation(async ({ ctx, input }) => {
        // MergedStorage.updateAgent 内部处理：DB 有则 update，无则 insert（覆盖内置）
        await ctx.mergedStorage.updateAgent(input);
        return { success: true };
    }),

    delete: procedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        // 内置 agent（DB 中无记录）禁止删除
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

    resetToDefault: procedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
        // 删除 DB 中的覆盖记录，使读操作 fallback 到内置默认值
        const hasOverride = await ctx.mergedStorage.hasDbOverride('agent', input.id);
        if (!hasOverride) {
            // 已经是内置状态，无需操作
            return { success: true, message: 'Already at default' };
        }
        await ctx.mergedStorage.deleteAgent(input.id);
        return { success: true };
    }),
});
