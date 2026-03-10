import { Elysia, t } from 'elysia';
import { searchSkills } from '../db/skills.js';

export const searchRoutes = new Elysia({ prefix: '/api/search' }).get(
    '/',
    async ({ query }) => {
        const q = query.q ?? '';
        const page = Number(query.page ?? 1);
        const limit = Math.min(Number(query.limit ?? 20), 50);
        const skills = await searchSkills(q, page, limit);
        return {
            query: q,
            page,
            limit,
            results: skills,
            total: skills.length,
        };
    },
    {
        query: t.Object({
            q: t.Optional(t.String()),
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
        }),
    },
);
