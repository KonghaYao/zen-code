import { defineConfig, type Plugin } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
import { promises as fs } from 'fs';
import path from 'path';

function addShebang(): Plugin {
    return {
        name: 'add-shebang',
        async writeBundle(options) {
            const outDir = options.dir ?? 'dist';
            const cliFile = path.join(outDir, 'cli.js');
            const content = await fs.readFile(cliFile, 'utf-8');
            if (!content.startsWith('#!')) {
                await fs.writeFile(cliFile, '#!/usr/bin/env node\n' + content);
                await fs.chmod(cliFile, 0o755);
            }
        },
    };
}

export default defineConfig({
    plugins: [nodeExternals(), addShebang()],
    build: {
        lib: {
            entry: {
                cli: 'src/cli.ts',
            },
            formats: ['es'],
        },
        target: 'esnext',
        minify: false,
        outDir: 'dist',
        emptyOutDir: true,
    },
});
