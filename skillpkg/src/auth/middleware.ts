import type { Context } from 'elysia';
import { verifyJwt, extractBearerToken, hashApiToken } from './jwt.js';
import { getApiTokenByHash, getUserById } from '../db/users.js';
import type { JwtPayload } from './jwt.js';

export interface AuthContext {
    user: JwtPayload | null;
    userId: string | null;
}

/**
 * Verify JWT or API token from Authorization header.
 * Returns user payload or null if unauthenticated.
 */
export async function verifyAuth(authHeader: string | null): Promise<JwtPayload | null> {
    const token = extractBearerToken(authHeader);
    if (!token) return null;

    // Try JWT first
    const jwtPayload = verifyJwt(token);
    if (jwtPayload) return jwtPayload;

    // Try API token (starts with skp_)
    if (token.startsWith('skp_')) {
        const hash = hashApiToken(token);
        const apiToken = await getApiTokenByHash(hash);
        if (!apiToken) return null;

        const user = await getUserById(apiToken.user_id);
        if (!user) return null;

        return {
            userId: user.id,
            username: user.username,
            email: user.email,
        };
    }

    return null;
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(authHeader: string | null): Promise<JwtPayload> {
    const user = await verifyAuth(authHeader);
    if (!user) {
        throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }
    return user;
}
