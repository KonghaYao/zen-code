/**
 * SkillPkg Registry Server
 * Elysia backend + React frontend (类 zen-swarm 风格)
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { checkConnection } from './db/client.js';
import { checkS3Connection } from './storage/s3.js';
import { authRoutes } from './routes/auth.js';
import { skillRoutes, userRoutes } from './routes/skills.js';
import { publishRoutes } from './routes/publish.js';
import { searchRoutes } from './routes/search.js';
const PORT = Number(process.env.PORT ?? 3000);

// Check DB & S3 connections
await checkConnection();
await checkS3Connection();

const app = new Elysia()
    .use(
        cors({
            origin: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CLI-Version'],
        }),
    )
    // API routes
    .use(authRoutes)
    .use(skillRoutes)
    .use(userRoutes)
    .use(publishRoutes)
    .use(searchRoutes)
    // Health check
    .get('/health', () => ({
        status: 'ok',
        service: 'skillpkg-registry',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    }));
// .use(
//     await staticPlugin({
//         assets: join(import.meta.dir, '../public/'),
//         prefix: '/',
//         indexHTML: true,
//     }),
// )

console.log(`\n📦 SkillPkg Registry started`);
console.log(`🌐 URL:     http://localhost:${PORT}`);
console.log(`   Health:  http://localhost:${PORT}/health`);
console.log(`   API:     http://localhost:${PORT}/api/skills`);
console.log(`   Search:  http://localhost:${PORT}/api/search?q=...\n`);

export type App = typeof app;
export default { fetch: app.fetch, port: PORT };
