import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import nodeExternals from 'rollup-plugin-node-externals';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { analyzer } from 'vite-bundle-analyzer';

export default defineConfig({
    plugins: [
        nodeExternals({
            builtins: true,
            deps: false,
            devDeps: false,
            peerDeps: false,
            optDeps: false,
            exclude: [], // 这里不需要排除任何包。
            include: [
                'bun:sqlite',
                'path',
                'crypto',
                'util',
                'stream',
                'fs',
                'pg',
                'redis',
                'react-devtools-core',
                'node-sqlite3-wasm', // 修复特殊文件引用的情况
                'execa',
                'lowdb',
                'lowdb/node',
                'chalk',
                'extract-zip',
                'fs-extra',
                'path-exists',
                'tempy',
                'xdg-basedir',
                'openai',
                'yaml',
                'zod',
                'marked',
                'marked-terminal',
                '@anthropic-ai/sdk',
                '@langchain/anthropic',
                '@langchain/google-genai',
                '@google/generative-ai',
                '@langchain/core',
                '@langchain/langgraph',
                '@langchain/openai',
                'openai',
                'langchain',
                'node-notifier',
                'micromatch',
            ],
        }),
        react(),
        // analyzer({
        //     analyzerMode: 'server', // Options: 'server', 'static', 'json'
        //     analyzerPort: 8888, // Port for the server mode
        //     openAnalyzer: true, // Automatically open the analyzer in the browser
        //     summary: true, // Show full chunk info in the console
        // }),
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        lib: {
            entry: {
                cli: './src/cli.ts',
                'zen-code': './src/app.tsx',
                'zen-init': './src/zen-init.tsx',
                'zen-keyboard': './src/zen-keyboard.tsx',
                nonInteractive: './src/nonInteractive.ts',
            },
            formats: ['es'],
        },
        target: 'esnext',
        sourcemap: false,
    },
    define: {
        __filename: 'import.meta.filename',
        'window.FormData': 'globalThis.FormData',
    },
    resolve: {
        conditions: ['module', 'node', 'production'],
    },
});
