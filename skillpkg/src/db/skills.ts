import { JSONValue } from 'postgres';
import { sql } from './client.js';

export interface Skill {
    id: string;
    name: string;
    scope: string | null;
    owner_id: string | null;
    description: string | null;
    keywords: string[];
    is_private: boolean;
    latest_version: string | null;
    downloads_total: number;
    created_at: Date;
    updated_at: Date;
}

export interface SkillVersion {
    id: string;
    skill_id: string;
    version: string;
    tarball_url: string;
    integrity: string;
    skill_json: Record<string, unknown>;
    readme: string | null;
    published_by: string | null;
    published_at: Date;
    deprecated: boolean;
    deprecation_message: string | null;
}

export async function searchSkills(query: string, page = 1, limit = 20): Promise<Skill[]> {
    const offset = (page - 1) * limit;
    if (query) {
        return sql<Skill[]>`
            SELECT id, name, scope, owner_id, description, keywords, is_private,
                   latest_version, downloads_total, created_at, updated_at
            FROM skills
            WHERE is_private = FALSE
              AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
                  @@ plainto_tsquery('english', ${query})
            ORDER BY downloads_total DESC, created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
    }
    return sql<Skill[]>`
        SELECT id, name, scope, owner_id, description, keywords, is_private,
               latest_version, downloads_total, created_at, updated_at
        FROM skills
        WHERE is_private = FALSE
        ORDER BY downloads_total DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `;
}

export async function getSkillByName(name: string): Promise<Skill | null> {
    const rows = await sql<Skill[]>`
        SELECT * FROM skills WHERE name = ${name} LIMIT 1
    `;
    return rows[0] ?? null;
}

export async function getSkillVersions(skillId: string): Promise<SkillVersion[]> {
    return sql<SkillVersion[]>`
        SELECT * FROM skill_versions
        WHERE skill_id = ${skillId}
        ORDER BY published_at DESC
    `;
}

export async function getSkillVersion(skillId: string, version: string): Promise<SkillVersion | null> {
    const rows = await sql<SkillVersion[]>`
        SELECT * FROM skill_versions
        WHERE skill_id = ${skillId} AND version = ${version}
        LIMIT 1
    `;
    return rows[0] ?? null;
}

export async function createSkill(data: {
    name: string;
    scope?: string;
    owner_id: string;
    description?: string;
    keywords?: string[];
    is_private?: boolean;
}): Promise<Skill> {
    const rows = await sql<Skill[]>`
        INSERT INTO skills (name, scope, owner_id, description, keywords, is_private)
        VALUES (
            ${data.name},
            ${data.scope ?? null},
            ${data.owner_id},
            ${data.description ?? null},
            ${sql.array(data.keywords ?? [])},
            ${data.is_private ?? false}
        )
        RETURNING *
    `;
    return rows[0];
}

export async function createSkillVersion(data: {
    skill_id: string;
    version: string;
    tarball_url: string;
    integrity: string;
    skill_json: Record<string, unknown>;
    readme?: string;
    published_by: string;
}): Promise<SkillVersion> {
    const rows = await sql<SkillVersion[]>`
        INSERT INTO skill_versions (skill_id, version, tarball_url, integrity, skill_json, readme, published_by)
        VALUES (
            ${data.skill_id},
            ${data.version},
            ${data.tarball_url},
            ${data.integrity},
            ${sql.json(data.skill_json as JSONValue)},
            ${data.readme ?? null},
            ${data.published_by}
        )
        RETURNING *
    `;
    // Update latest_version on parent skill
    await sql`
        UPDATE skills
        SET latest_version = ${data.version}, updated_at = NOW()
        WHERE id = ${data.skill_id}
    `;
    return rows[0];
}

export async function upsertSkillTag(skillId: string, tag: string, version: string): Promise<void> {
    await sql`
        INSERT INTO skill_tags (skill_id, tag, version)
        VALUES (${skillId}, ${tag}, ${version})
        ON CONFLICT (skill_id, tag) DO UPDATE SET version = EXCLUDED.version, updated_at = NOW()
    `;
}

export async function getSkillTag(skillId: string, tag: string): Promise<string | null> {
    const rows = await sql<{ version: string }[]>`
        SELECT version FROM skill_tags WHERE skill_id = ${skillId} AND tag = ${tag}
    `;
    return rows[0]?.version ?? null;
}

export async function getUserSkills(userId: string): Promise<Skill[]> {
    return sql<Skill[]>`
        SELECT * FROM skills WHERE owner_id = ${userId}
        ORDER BY updated_at DESC
    `;
}

export async function recordDownload(data: {
    skill_id: string;
    version: string;
    user_id?: string;
    ip_hash?: string;
    cli_version?: string;
}): Promise<void> {
    await sql`
        INSERT INTO download_events (time, skill_id, version, user_id, ip_hash, cli_version)
        VALUES (NOW(), ${data.skill_id}, ${data.version}, ${data.user_id ?? null}, ${data.ip_hash ?? null}, ${data.cli_version ?? null})
    `;
    await sql`
        UPDATE skills SET downloads_total = downloads_total + 1 WHERE id = ${data.skill_id}
    `;
}

export async function getDownloadStats(
    skillId: string,
    period: '7d' | '30d' | '365d' = '30d',
): Promise<{ bucket: Date; count: number }[]> {
    const interval = period === '7d' ? '1 day' : period === '30d' ? '1 day' : '1 month';
    return sql<{ bucket: Date; count: number }[]>`
        SELECT time_bucket(${interval}::INTERVAL, time) AS bucket, COUNT(*)::int AS count
        FROM download_events
        WHERE skill_id = ${skillId}
          AND time > NOW() - ${period}::INTERVAL
        GROUP BY bucket
        ORDER BY bucket ASC
    `;
}
