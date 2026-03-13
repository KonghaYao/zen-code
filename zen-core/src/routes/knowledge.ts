/**
 * knowledge 路由 - 对应 useKnowledge
 * 聚合 memories + skills
 */

import { z } from 'zod';
import { router, procedure } from '../trpc.js';
import { listMemories, listSkills } from '@langgraph-js/standard-agent';
import { join } from 'path';
import { homedir } from 'os';

export const knowledgeRouter = router({
    list: procedure
        .input(
            z.object({
                type: z.enum(['memories', 'skills']),
                cwd: z.string().optional(),
            }),
        )
        .query(async ({ input }) => {
            const cwd = input.cwd || process.cwd();
            const projectDir = join(cwd, '.claude', input.type);
            const userDir = join(homedir(), '.claude', input.type);

            try {
                if (input.type === 'memories') {
                    const memories = listMemories(userDir, projectDir);
                    return memories.map((m) => ({ ...m, type: 'memory' as const }));
                } else {
                    const skills = listSkills(userDir, projectDir);
                    return skills.map((s) => ({ ...s, type: 'skill' as const }));
                }
            } catch (error) {
                console.warn(`Failed to load ${input.type}:`, error);
                return [];
            }
        }),
});
