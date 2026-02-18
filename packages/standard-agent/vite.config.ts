import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
export default defineConfig({
    plugins: [nodeExternals()],
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'standardAgent',
            fileName: 'index',
            formats: ['es'],
        },
        target: 'esnext',
        minify: false,
    },
});
