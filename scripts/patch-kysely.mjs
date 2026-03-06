#!/usr/bin/env node
/**
 * Patch kysely ESM index to comment out createQueryId export.
 *
 * Run automatically via postinstall.
 * Safe to run multiple times (idempotent).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const TARGET = resolve(
    ROOT,
    'node_modules/.bun/kysely@0.28.11/node_modules/kysely/dist/esm/index.js'
);

// Matches the line regardless of whether it is already commented (idempotent)
const RE = /^(\/\/\s*)*export \{ createQueryId \} from '\.\/util\/query-id\.js';$/m;
const COMMENT_LINE = `// export { createQueryId } from './util/query-id.js';`;

let content;
try {
    content = readFileSync(TARGET, 'utf8');
} catch {
    console.warn(`[patch-kysely] File not found, skipping:\n  ${TARGET}`);
    process.exit(0);
}

if (!RE.test(content)) {
    console.warn('[patch-kysely] Target line not found, skipping.');
    process.exit(0);
}

const patched = content.replace(RE, COMMENT_LINE);

if (patched === content) {
    console.log('[patch-kysely] Already patched, nothing to do.');
} else {
    writeFileSync(TARGET, patched, 'utf8');
    console.log('[patch-kysely] Patched: commented out createQueryId export.');
}
