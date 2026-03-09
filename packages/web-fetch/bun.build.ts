import { build, BuildConfig } from 'bun';

// Build configuration
const buildConfig = {
    entrypoints: ['src/index.ts', 'src/cli.ts'],
    outdir: 'dist',
    target: 'node' as const,
    format: 'esm' as const,
    external: ['defuddle', '@mozilla/readability', 'iconv-lite', 'zod', 'turndown'],
    splitting: true,
    sourcemap: false,
    minify: true,
} satisfies BuildConfig;

// Run build
async function runBuild() {
    try {
        const result = await build(buildConfig);

        if (result.success) {
            console.log('✓ Build completed successfully');
            console.log(`  Output directory: ${buildConfig.outdir}`);
            console.log(`  Entrypoints: ${buildConfig.entrypoints.join(', ')}`);
            console.log(`  Target: ${buildConfig.target}`);
            console.log(`  External: ${buildConfig.external.join(', ')}`);
        } else {
            console.error('✗ Build failed');
            for (const error of result.logs) {
                console.error(error);
            }
            process.exit(1);
        }
    } catch (error) {
        console.error('Build error:', error);
        process.exit(1);
    }
}

runBuild();
