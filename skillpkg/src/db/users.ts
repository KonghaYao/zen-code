import { sql } from './client.js';

export interface User {
    id: string;
    username: string;
    email: string;
    password_hash: string | null;
    github_id: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface ApiToken {
    id: string;
    user_id: string;
    token_hash: string;
    name: string;
    last_used_at: Date | null;
    created_at: Date;
    expires_at: Date | null;
}

export async function getUserById(id: string): Promise<User | null> {
    const rows = await sql<User[]>`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const rows = await sql<User[]>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0] ?? null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const rows = await sql<User[]>`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
    return rows[0] ?? null;
}

export async function getUserByGithubId(githubId: string): Promise<User | null> {
    const rows = await sql<User[]>`SELECT * FROM users WHERE github_id = ${githubId} LIMIT 1`;
    return rows[0] ?? null;
}

export async function createUser(data: {
    username: string;
    email: string;
    password_hash?: string;
    github_id?: string;
    avatar_url?: string;
}): Promise<User> {
    const rows = await sql<User[]>`
        INSERT INTO users (username, email, password_hash, github_id, avatar_url)
        VALUES (${data.username}, ${data.email}, ${data.password_hash ?? null}, ${data.github_id ?? null}, ${data.avatar_url ?? null})
        RETURNING *
    `;
    return rows[0];
}

export async function createApiToken(data: {
    user_id: string;
    token_hash: string;
    name: string;
    expires_at?: Date;
}): Promise<ApiToken> {
    const rows = await sql<ApiToken[]>`
        INSERT INTO api_tokens (user_id, token_hash, name, expires_at)
        VALUES (${data.user_id}, ${data.token_hash}, ${data.name}, ${data.expires_at ?? null})
        RETURNING *
    `;
    return rows[0];
}

export async function getApiTokenByHash(hash: string): Promise<ApiToken | null> {
    const rows = await sql<ApiToken[]>`
        SELECT * FROM api_tokens WHERE token_hash = ${hash}
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
    `;
    if (rows[0]) {
        // Update last_used_at
        await sql`UPDATE api_tokens SET last_used_at = NOW() WHERE id = ${rows[0].id}`;
    }
    return rows[0] ?? null;
}

export async function getUserApiTokens(userId: string): Promise<Omit<ApiToken, 'token_hash'>[]> {
    return sql<Omit<ApiToken, 'token_hash'>[]>`
        SELECT id, user_id, name, last_used_at, created_at, expires_at
        FROM api_tokens
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
    `;
}

export async function deleteApiToken(id: string, userId: string): Promise<void> {
    await sql`DELETE FROM api_tokens WHERE id = ${id} AND user_id = ${userId}`;
}
