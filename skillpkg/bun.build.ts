import { build, BunPlugin } from 'bun';
import { promises as fs } from 'fs';
import { tailwindPlugin } from '@konghayao/bun-plugin-tailwind';
import packageJson from './package.json';

async function buildZenSwarm() {
    console.log('🐝 Building zen-swarm with Bun...');

    // 清理 dist 目录
    await fs.rm('./dist', { recursive: true, force: true });
    await fs.mkdir('./dist', { recursive: true });

    console.log('\n📦 Building backend server...');

    const serverResult = await build({
        entrypoints: ['./src/server.ts'],
        target: 'node',
        format: 'esm',
        minify: true,
        sourcemap: false,
        splitting: false,
        outdir: 'dist',

        plugins: [tailwindPlugin],
        external: [
            // Bun 内置模块
            'bun:sqlite',
            'bun:*',

            // Node.js 核心模块
            'path',
            'crypto',
            'util',
            'stream',
            'fs',
            'os',
            'events',
            'child_process',
            'readline',
            'tty',
            'net',
            'http',
            'https',
            'url',
            'buffer',
            'assert',
            'zlib',
            'worker_threads',
            'perf_hooks',
            'v8',
            'vm',
            'dns',
            'module',
            'process',
        ],
        define: {
            __filename: 'import.meta.filename',
        },
    });

    if (!serverResult.success) {
        console.error('❌ Backend build failed');
        for (const log of serverResult.logs) {
            console.error(log);
        }
        process.exit(1);
    }
    console.log('  ✓ server.js built');
}

buildZenSwarm().catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
