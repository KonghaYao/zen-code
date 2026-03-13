/**
 * config 路由 - 对应 useConfig / useUpdateConfig
 * 直接调用 ConfigManager
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

export const configRouter = router({
    get: procedure.query(async ({ ctx }) => {
        return await ctx.configManager.getConfig();
    }),

    update: procedure.input(z.record(z.string(), z.unknown())).mutation(async ({ ctx, input }) => {
        await ctx.configManager.updateConfig(input as any);
        return await ctx.configManager.getConfig();
    }),
});
