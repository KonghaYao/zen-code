/**
 * providers 路由 - 对应 useProviders
 * 从 ConfigManager 读取 providers[]
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

export const providersRouter = router({
    list: procedure.query(async ({ ctx }) => {
        const config = await ctx.configManager.getConfig();
        return (config as any).providers || [];
    }),

    get: procedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
        const config = await ctx.configManager.getConfig();
        const providers = (config as any).providers || [];
        const provider = providers.find((p: any) => p.id === input.id);
        if (!provider) {
            throw new Error(`Provider '${input.id}' not found`);
        }
        return provider;
    }),
});
