/**
 * agents 路由 - 对应 useAgents
 * 从 AgentPackage 动态查询 agents
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

export const agentsRouter = router({
    list: procedure.query(async ({ ctx }) => {
        const agents = await ctx.agentPackage.storage.getAllAgents();
        return agents.map((agent) => ({
            ...agent,
            system_prompt: agent.system_prompt_id,
            model: agent.model_id,
        }));
    }),

    get: procedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const agent = await ctx.agentPackage.storage.getAgent(input.id);
        if (!agent) {
            throw new Error(`Agent '${input.id}' not found`);
        }
        return {
            ...agent,
            system_prompt: agent.system_prompt_id,
            model: agent.model_id,
        };
    }),
});
