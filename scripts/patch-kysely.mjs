#!/usr/bin/env node
/**
 * Patch kysely ESM index to comment out exports.
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
const PATTERNS = [
    {
        re: /^(\/\/\s*)*export \{ createQueryId \} from '\.\/util\/query-id\.js';$/m,
        replacement: '// export { createQueryId } from \'./util/query-id.js\';',
        name: 'createQueryId'
    },
    {
        re: /^(\/\/\s*)*export \{ expressionBuilder(,)? \} from '\.\/expression\/expression-builder\.js';$/m,
        replacement: '// export { expressionBuilder } from \'./expression/expression-builder.js\';',
        name: 'expressionBuilder'
    },
    {
        re: /^(\/\/\s*)*export \{ logOnce \} from '\.\/util\/log-once\.js';$/m,
        replacement: '// export { logOnce } from \'./util/log-once.js\';',
        name: 'logOnce'
    }
];

let content;
try {
    content = readFileSync(TARGET, 'utf8');
} catch {
    console.warn(`[patch-kysely] File not found, skipping:\n  ${TARGET}`);
    process.exit(0);
}

let patched = false;
let output = content;

for (const { re, replacement, name } of PATTERNS) {
    if (!re.test(content)) {
        console.warn(`[patch-kysely] Pattern for ${name} not found, skipping.`);
        continue;
    }

    const newOutput = output.replace(re, replacement);
    if (newOutput !== output) {
        output = newOutput;
        patched = true;
        console.log(`[patch-kysely] Patched: commented out ${name} export.`);
    }
}

if (!patched) {
    console.log('[patch-kysely] Already patched, nothing to do.');
} else {
    writeFileSync(TARGET, output, 'utf8');
}
