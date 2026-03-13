/**
 * skills 路由 - 对应 useSkills
 * 读取 .claude/skills/ 和 ~/.claude/skills/
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';

export const skillsRouter = router({
    list: procedure.query(async ({ ctx }) => {
        return await ctx.configManager.listSkills();
    }),

    get: procedure.input(z.object({ name: z.string() })).query(async ({ ctx, input }) => {
        return await ctx.configManager.getSkill(input.name);
    }),

    save: procedure
        .input(
            z.object({
                name: z.string(),
                content: z.object({
                    frontmatter: z.record(z.string(), z.unknown()).optional(),
                    body: z.string(),
                }),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await ctx.configManager.saveSkill(input.name, input.content as any);
            return { success: true };
        }),

    delete: procedure.input(z.object({ name: z.string() })).mutation(async ({ ctx, input }) => {
        await ctx.configManager.deleteSkill(input.name);
        return { success: true };
    }),
});
