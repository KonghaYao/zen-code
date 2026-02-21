/**
 * Skills Router
 */

import { z } from 'zod';
import { router, publicProcedure } from './trpc.js';
import { homedir } from 'os';
import { join } from 'path';

// 从 standard-agent 导入
import { listSkills } from '@langgraph-js/standard-agent';

// ========================================
// Router
// ========================================
// 使用 OS API 获取跨平台兼容的路径
const userSkillsDir = join(homedir(), '.claude/skills');
const projectSkillsDir = join(process.cwd(), '.claude/skills');

export const skillsRouter = router({
    // 列出所有 Skills
    list: publicProcedure.query(async ({ ctx }) => {
        const skills = listSkills(userSkillsDir, projectSkillsDir);
        return skills;
    }),

    // 获取单个 Skill
    get: publicProcedure.input(z.object({ name: z.string() })).query(async ({ ctx, input }) => {
        const skills = listSkills(userSkillsDir, projectSkillsDir);
        const skill = skills.find((s) => s.name === input.name);

        if (!skill) {
            throw new Error(`Skill '${input.name}' not found`);
        }

        return skill;
    }),
});
