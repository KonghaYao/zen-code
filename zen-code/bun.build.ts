import { build } from 'bun';
import path from 'path';
import { promises as fs } from 'fs';

// Create a mock module for react-devtools-core
const mockReactDevtools = `
// Mock react-devtools-core for production builds
export const connectToDevTools = () => {};
export const setupDevTools = () => {};
export default {};
`;

async function buildZenCode() {
    // Check for --compile flag
    const compileMode = process.argv.includes('--compile');

    console.log('🔨 Building zen-code with Bun...');

    // Clean dist directory
    await fs.rm('./dist', { recursive: true, force: true });
    await fs.mkdir('./dist', { recursive: true });

    // Create a mock react-devtools-core module in the project's node_modules
    // const nodeModulesPath = '../node_modules/react-devtools-core';
    // const packageJsonPath = path.join(nodeModulesPath, 'package.json');
    // const indexPath = path.join(nodeModulesPath, 'index.js');

    // try {
    //     await fs.mkdir(nodeModulesPath, { recursive: true });
    //     await fs.writeFile(packageJsonPath, JSON.stringify({ type: 'module', main: 'index.js' }));
    //     await fs.writeFile(indexPath, mockReactDevtools);
    //     console.log('  Created mock react-devtools-core');
    // } catch (e) {
    //     console.log('  Warning: Could not create mock react-devtools-core:', e);
    // }

    // Build all entry points together with code splitting
    console.log('  Building with code splitting...');

    const result = await build({
        entrypoints: [
            './src/cli.ts',
            './src/app.tsx',
            './src/zen-keyboard.tsx',
            './src/nonInteractive.ts',
            '../zen-core/src/server.ts',
        ],
        outdir: './dist',
        target: 'node',
        format: 'esm',
        minify: true,
        sourcemap: false,
        // Enable code splitting
        splitting: true,
        // Force .mjs extension for all files
        root: './src',
        external: [
            // Bun-specific modules (cannot be bundled)
            'bun:sqlite',
            'bun:*',

            // Node.js core modules (cannot be bundled)
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
        // Define global variables
        define: {
            __filename: 'import.meta.filename',
            'window.FormData': 'globalThis.FormData',
        },
    });

    if (!result.success) {
        console.error('❌ Build failed');
        for (const error of result.logs) {
            console.error(error);
        }
        process.exit(1);
    }

    // Move zen-core server output to dist/zen-core.js
    const zenCoreServerPath = path.join('../', 'zen-core', 'src', 'server.js');
    const zenCoreDestPath = path.join('./dist', 'zen-core.js');
    if (await fileExists(zenCoreServerPath)) {
        await fs.rename(zenCoreServerPath, zenCoreDestPath);
        await fs.rm(path.join('./dist', 'zen-core'), { recursive: true, force: true });
        console.log('  ✓ zen-core.js moved');
    }

    // Make sure all entry files are logged
    const entryFiles = ['cli.js', 'app.js', 'zen-keyboard.js', 'nonInteractive.js'];

    for (const file of entryFiles) {
        const filePath = path.join('./dist', file);
        if (await fileExists(filePath)) {
            console.log(`  ✓ ${file} built`);
        }
    }

    // Show build summary
    const distFilesFinal = await fs.readdir('./dist');
    const chunkFiles = distFilesFinal.filter((f) => f.startsWith('chunk-'));
    console.log(`  Generated ${chunkFiles.length} shared chunk(s) for code splitting`);
    console.log('✅ Build complete!');
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

buildZenCode().catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
});
