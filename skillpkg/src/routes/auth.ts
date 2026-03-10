import { Elysia, t } from 'elysia';
import { hashPassword, verifyPassword, signJwt, generateApiToken, hashApiToken } from '../auth/jwt.js';
import {
    createUser,
    getUserByEmail,
    getUserByUsername,
    createApiToken,
    getUserApiTokens,
    deleteApiToken,
} from '../db/users.js';
import { requireAuth } from '../auth/middleware.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .post(
        '/register',
        async ({ body, set }) => {
            const { username, email, password } = body;

            // Check duplicates
            const existingEmail = await getUserByEmail(email);
            if (existingEmail) {
                set.status = 409;
                return { error: 'Email already registered' };
            }
            const existingUsername = await getUserByUsername(username);
            if (existingUsername) {
                set.status = 409;
                return { error: 'Username already taken' };
            }

            const password_hash = await hashPassword(password);
            const user = await createUser({ username, email, password_hash });

            const token = signJwt({
                userId: user.id,
                username: user.username,
                email: user.email,
            });

            return {
                token,
                user: { id: user.id, username: user.username, email: user.email },
            };
        },
        {
            body: t.Object({
                username: t.String({ minLength: 3, maxLength: 40 }),
                email: t.String({ format: 'email' }),
                password: t.String({ minLength: 8 }),
            }),
        },
    )
    .post(
        '/login',
        async ({ body, set }) => {
            const { email, password } = body;

            const user = await getUserByEmail(email);
            if (!user || !user.password_hash) {
                set.status = 401;
                return { error: 'Invalid credentials' };
            }

            const valid = await verifyPassword(password, user.password_hash);
            if (!valid) {
                set.status = 401;
                return { error: 'Invalid credentials' };
            }

            const token = signJwt({
                userId: user.id,
                username: user.username,
                email: user.email,
            });

            return {
                token,
                user: { id: user.id, username: user.username, email: user.email },
            };
        },
        {
            body: t.Object({
                email: t.String(),
                password: t.String(),
            }),
        },
    )
    .post(
        '/token',
        async ({ body, headers, set }) => {
            const user = await requireAuth(headers.authorization ?? null).catch(() => null);
            if (!user) {
                set.status = 401;
                return { error: 'Unauthorized' };
            }

            const rawToken = generateApiToken();
            const tokenHash = hashApiToken(rawToken);
            const tokenRecord = await createApiToken({
                user_id: user.userId,
                token_hash: tokenHash,
                name: body.name,
                expires_at: body.expires_at ? new Date(body.expires_at) : undefined,
            });

            return {
                token: rawToken, // Only returned once!
                id: tokenRecord.id,
                name: tokenRecord.name,
                created_at: tokenRecord.created_at,
            };
        },
        {
            body: t.Object({
                name: t.String({ minLength: 1 }),
                expires_at: t.Optional(t.String()),
            }),
        },
    )
    .get('/tokens', async ({ headers, set }) => {
        const user = await requireAuth(headers.authorization ?? null).catch(() => null);
        if (!user) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }
        return getUserApiTokens(user.userId);
    })
    .delete('/token/:id', async ({ params, headers, set }) => {
        const user = await requireAuth(headers.authorization ?? null).catch(() => null);
        if (!user) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }
        await deleteApiToken(params.id, user.userId);
        return { success: true };
    })
    .get('/me', async ({ headers, set }) => {
        const user = await requireAuth(headers.authorization ?? null).catch(() => null);
        if (!user) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }
        return { user };
    });
