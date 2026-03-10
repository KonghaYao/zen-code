import { Elysia, t } from 'elysia';
import { requireAuth } from '../auth/middleware.js';
import { getSkillByName, createSkill, createSkillVersion, upsertSkillTag, getSkillVersion } from '../db/skills.js';
import { uploadTarball, uploadMeta } from '../storage/s3.js';
import { isValidVersion } from '../semver/index.js';

export const publishRoutes = new Elysia({ prefix: '/api' })
    .post(
        '/publish',
        async ({ body, headers, set }) => {
            // Authenticate
            const user = await requireAuth(headers.authorization ?? null).catch(() => null);
            if (!user) {
                set.status = 401;
                return { error: 'Unauthorized. Provide Bearer token or API key.' };
            }

            const { name, version, description, keywords, tag = 'latest', tarball, readme, skill_json } = body;

            // Validate version
            if (!isValidVersion(version)) {
                set.status = 400;
                return { error: `Invalid version: "${version}". Must be valid semver.` };
            }

            // Validate name (only lowercase, numbers, hyphens; optional @scope/name)
            const nameRegex = /^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
            if (!nameRegex.test(name)) {
                set.status = 400;
                return { error: `Invalid skill name: "${name}". Use lowercase letters, numbers, hyphens.` };
            }

            // Get or create skill record
            let skill = await getSkillByName(name);
            if (!skill) {
                // Extract scope from name if present
                const scope = name.startsWith('@') ? name.split('/')[0] : undefined;
                skill = await createSkill({
                    name,
                    scope,
                    owner_id: user.userId,
                    description,
                    keywords: keywords ?? [],
                });
            } else {
                // Check ownership
                if (skill.owner_id !== user.userId) {
                    set.status = 403;
                    return { error: 'You do not have permission to publish to this skill.' };
                }
            }

            // Check if version already exists (immutable)
            const existing = await getSkillVersion(skill.id, version);
            if (existing) {
                set.status = 409;
                return { error: `Version ${version} already published. Versions are immutable.` };
            }

            // Decode base64 tarball
            const tarballBuffer = Buffer.from(tarball, 'base64');
            if (tarballBuffer.length === 0) {
                set.status = 400;
                return { error: 'Tarball is empty' };
            }

            // Upload to S3
            const { url: tarballUrl, integrity } = await uploadTarball(name, version, tarballBuffer);

            // Prepare skill.json snapshot
            const skillJsonParsed = typeof skill_json === 'string' ? JSON.parse(skill_json) : skill_json;
            await uploadMeta(name, version, skillJsonParsed);

            // Create version record
            const versionRecord = await createSkillVersion({
                skill_id: skill.id,
                version,
                tarball_url: tarballUrl,
                integrity,
                skill_json: skillJsonParsed,
                readme,
                published_by: user.userId,
            });

            // Update tag
            await upsertSkillTag(skill.id, tag, version);

            return {
                success: true,
                name,
                version,
                tarball_url: tarballUrl,
                integrity,
                published_at: versionRecord.published_at,
            };
        },
        {
            body: t.Object({
                name: t.String(),
                version: t.String(),
                description: t.Optional(t.String()),
                keywords: t.Optional(t.Array(t.String())),
                tag: t.Optional(t.String()),
                tarball: t.String(), // base64 encoded .tar.gz
                readme: t.Optional(t.String()),
                skill_json: t.Union([t.String(), t.Object({}, { additionalProperties: true })]),
            }),
        },
    )
    // Deprecate a version
    .delete('/skills/:name/:version', async ({ params, headers, set }) => {
        const user = await requireAuth(headers.authorization ?? null).catch(() => null);
        if (!user) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }

        const skill = await getSkillByName(params.name);
        if (!skill) {
            set.status = 404;
            return { error: 'Skill not found' };
        }

        if (skill.owner_id !== user.userId) {
            set.status = 403;
            return { error: 'Forbidden' };
        }

        const { sql } = await import('../db/client.js');
        await sql`
            UPDATE skill_versions
            SET deprecated = TRUE, deprecation_message = 'Deprecated by publisher'
            WHERE skill_id = ${skill.id} AND version = ${params.version}
        `;

        return { success: true, message: `${params.name}@${params.version} deprecated` };
    });
