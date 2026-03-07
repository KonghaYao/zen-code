import { compile, Features, normalizePath } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import type { BunPlugin } from 'bun';
import fs from 'node:fs/promises';
import * as path from 'path';

const SPECIAL_QUERY_RE = /[?&](raw|url)\b/;

type Compiler = Awaited<ReturnType<typeof compile>>;

export const tailwindPlugin: BunPlugin = {
    name: 'tailwindcss',
    setup(build) {
        build.onLoad({ filter: /\.css/ }, async ({ path: inputPath }) => {
            if (!isPotentialCssRootFile(inputPath)) return;

            let inputBaseForRoot = path.dirname(path.resolve(inputPath));

            let sourceContents = await Bun.file(inputPath).text();
            let compiler = await compile(sourceContents, {
                base: inputBaseForRoot,
                onDependency(_path) {
                    // TODO: Bun does not currently have a bundler API which is
                    // analogous to `.addWatchFile()`.
                },
            });

            let candidates = new Set<string>();
            let basePath: string | null = null;

            // Build sources list for Scanner
            // compiler.sources replaces the old compiler.globs in newer versions
            let sources = (() => {
                // Disable auto source detection
                if (compiler.root === 'none') {
                    return [];
                }

                // No root specified, use the project base as the default source
                if (compiler.root === null) {
                    return [{ base: inputBaseForRoot, pattern: '**/*', negated: false }];
                }

                // Use the specified root
                return [{ ...compiler.root, negated: false }];
            })().concat(
                // compiler.sources is the new name for compiler.globs in @tailwindcss/node v4.2+
                ((compiler as any).sources ?? (compiler as any).globs ?? []).map(
                    (entry: { base: string; pattern: string }) => ({ ...entry, negated: false }),
                ),
            );

            let scanner = new Scanner({ sources });

            if (
                !(
                    compiler.features &
                    (Features.AtApply | Features.JsPluginCompat | Features.ThemeFunction | Features.Utilities)
                )
            ) {
                return undefined;
            }

            for (let candidate of scanner.scan()) {
                candidates.add(candidate);
            }

            if (compiler.features & Features.Utilities) {
                let root = compiler.root;

                if (root !== 'none' && root !== null) {
                    let newBasePath = normalizePath(path.resolve(root.base, root.pattern));

                    let isDir = await fs.stat(newBasePath).then(
                        (stats) => stats.isDirectory(),
                        () => false,
                    );

                    if (!isDir) {
                        throw new Error(
                            `The path given to \`source(…)\` must be a directory but got \`source(${newBasePath})\` instead.`,
                        );
                    }

                    basePath = newBasePath;
                } else if (root === null) {
                    basePath = null;
                }
            }

            let contents = compiler.build([...sharedCandidates(compiler, basePath), ...candidates]);

            return {
                // Return directly to Bun's bundler which will optimize the CSS
                contents,
                loader: 'css',
            };
        });
    },
};

export default tailwindPlugin;

function sharedCandidates(compiler: Compiler, basePath: string | null): Set<string> {
    // Without onBeforeParse / module graph scanning, we have no shared candidates
    // from other JS/TS modules. Return empty set — Scanner handles file-based candidates.
    if (compiler.root === 'none') return new Set();
    return new Set();
}

function isPotentialCssRootFile(id: string) {
    if (id.includes('/.vite/')) return;
    let extension = getExtension(id);
    let isCssFile =
        (extension === 'css' ||
            (extension === 'vue' && id.includes('&lang.css')) ||
            (extension === 'astro' && id.includes('&lang.css')) ||
            // We want to process Svelte `<style>` tags to properly add dependency
            // tracking for imported files.
            isSvelteStyle(id)) &&
        // Don't intercept special static asset resources
        !SPECIAL_QUERY_RE.test(id);

    return isCssFile;
}

function getExtension(id: string) {
    let [filename] = id.split('?', 2);
    return path.extname(filename).slice(1);
}

function isSvelteStyle(id: string) {
    let extension = getExtension(id);
    return extension === 'svelte' && id.includes('&lang.css');
}
