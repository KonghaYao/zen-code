import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';

export default defineConfig({
    plugins: [nodeExternals()],
    build: {
        lib: {
            entry: {
                index: 'src/index.ts',
            },

            formats: ['es'],
        },
        target: 'esnext',
        minify: false,
        outDir: 'dist',
        emptyOutDir: true,
    },
});
