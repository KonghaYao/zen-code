import { Elysia, t } from 'elysia';
import {
    searchSkills,
    getSkillByName,
    getSkillVersions,
    getSkillVersion,
    getUserSkills,
    recordDownload,
    getDownloadStats,
} from '../db/skills.js';
import { resolveVersion } from '../semver/index.js';
import { sql } from '../db/client.js';

export const skillRoutes = new Elysia({ prefix: '/api/skills' })
    // List / search skills
    .get(
        '/',
        async ({ query }) => {
            const skills = await searchSkills(query.q ?? '', Number(query.page ?? 1), 20);
            return { skills };
        },
        {
            query: t.Object({
                q: t.Optional(t.String()),
                page: t.Optional(t.String()),
            }),
        },
    )
    // Get skill metadata
    .get('/:name', async ({ params, set }) => {
        const skill = await getSkillByName(params.name);
        if (!skill) {
            set.status = 404;
            return { error: 'Skill not found' };
        }
        const versions = await getSkillVersions(skill.id);
        return { skill, versions };
    })
    // Download stats  (must come BEFORE /:name/:version to avoid being matched as a version)
    .get(
        '/:name/stats',
        async ({ params, query, set }) => {
            const skill = await getSkillByName(params.name);
            if (!skill) {
                set.status = 404;
                return { error: 'Skill not found' };
            }
            const period = (query.period as '7d' | '30d' | '365d') ?? '30d';
            const stats = await getDownloadStats(skill.id, period);
            return { skill: { name: skill.name, downloads_total: skill.downloads_total }, stats };
        },
        {
            query: t.Object({
                period: t.Optional(t.String()),
            }),
        },
    )
    // Get specific version metadata
    .get('/:name/:version', async ({ params, set }) => {
        const skill = await getSkillByName(params.name);
        if (!skill) {
            set.status = 404;
            return { error: 'Skill not found' };
        }

        // Resolve version (could be 'latest' or semver range)
        let resolvedVersion = params.version;
        if (params.version === 'latest' || params.version === 'stable') {
            const tagsRows = await sql<{ tag: string; version: string }[]>`
                SELECT tag, version FROM skill_tags WHERE skill_id = ${skill.id}
            `;
            const tags = Object.fromEntries(tagsRows.map((r) => [r.tag, r.version]));
            const versionsRows = await getSkillVersions(skill.id);
            const versionList = versionsRows.map((v) => v.version);
            const resolved = resolveVersion(params.version, versionList, tags);
            if (!resolved) {
                set.status = 404;
                return { error: 'Version not found' };
            }
            resolvedVersion = resolved;
        }

        const version = await getSkillVersion(skill.id, resolvedVersion);
        if (!version) {
            set.status = 404;
            return { error: 'Version not found' };
        }
        return { skill, version };
    })
    // Download tarball redirect (accessed as /:name/:version/download)
    .get('/:name/:version/download', async ({ params, set, headers }) => {
        const skill = await getSkillByName(params.name);
        if (!skill) {
            set.status = 404;
            return { error: 'Skill not found' };
        }

        const version = await getSkillVersion(skill.id, params.version);
        if (!version) {
            set.status = 404;
            return { error: 'Version not found' };
        }

        // Record download event asynchronously
        const ipRaw = headers['x-forwarded-for'] ?? '';
        const { createHash } = await import('crypto');
        const ipHash = createHash('sha256').update(ipRaw).digest('hex').slice(0, 16);
        recordDownload({
            skill_id: skill.id,
            version: version.version,
            ip_hash: ipHash,
            cli_version: headers['x-cli-version'] ?? undefined,
        }).catch(() => {});

        // Redirect to tarball URL
        set.status = 302;
        set.headers['Location'] = version.tarball_url;
        return null;
    });

// User skills route
export const userRoutes = new Elysia({ prefix: '/api/users' }).get('/:username/skills', async ({ params, set }) => {
    const { getUserByUsername } = await import('../db/users.js');
    const user = await getUserByUsername(params.username);
    if (!user) {
        set.status = 404;
        return { error: 'User not found' };
    }
    const skills = await getUserSkills(user.id);
    return { user: { id: user.id, username: user.username }, skills };
});
