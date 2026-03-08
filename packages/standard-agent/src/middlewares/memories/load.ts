/**
 * Memory loader for parsing and loading agent memories from MEMORY.md files.
 *
 * Each memory is a directory containing a MEMORY.md file with:
 * - YAML frontmatter (name, description required)
 * - Markdown content
 *
 * Example MEMORY.md structure:
 * ```markdown
 * ---
 * name: my-memory
 * description: Brief description of what this memory contains
 * category: architecture
 * priority: high
 * ---
 *
 * # My Memory
 *
 * Content...
 * ```
 */

import { readFileSync, statSync, existsSync, readdirSync, lstatSync } from 'fs';
import { join, resolve, relative, dirname, basename } from 'path';
import { parse } from 'yaml';

// Maximum size for MEMORY.md files (10MB)
const MAX_MEMORY_FILE_SIZE = 10 * 1024 * 1024;

export interface MemoryMetadata {
    name: string;
    description: string;
    path: string;
    source: 'user' | 'project';
    tags?: string[];
    category?: string;
    created?: string;
    last_updated?: string;
    priority?: 'high' | 'medium' | 'low';
    context_scope?: string;
}

/**
 * Check if a path is safely contained within base_dir.
 */
function _isSafePath(path: string, baseDir: string): boolean {
    try {
        const resolvedPath = resolve(path);
        const resolvedBase = resolve(baseDir);
        const relativePath = relative(resolvedBase, resolvedPath);
        if (!relativePath) return true;
        if (relativePath.startsWith('..') || relativePath.includes(':')) return false;
        return true;
    } catch {
        return false;
    }
}

/**
 * Parse YAML frontmatter from a MEMORY.md file.
 */
function _parseMemoryMetadata(memoryMdPath: string, source: 'user' | 'project'): MemoryMetadata | null {
    try {
        const fileStats = statSync(memoryMdPath);
        if (fileStats.size > MAX_MEMORY_FILE_SIZE) {
            console.warn(`Skipping ${memoryMdPath}: file too large (${fileStats.size} bytes)`);
            return null;
        }

        const content = readFileSync(memoryMdPath, 'utf-8');

        const frontmatterPattern = /^---\s*\n([\s\S]*?)\n---\s*\n/;
        const match = content.match(frontmatterPattern);

        if (!match) {
            // If no frontmatter, use directory name as name and first line as description
            const dirName = basename(dirname(memoryMdPath));
            const firstLine = content.split('\n').find((l) => l.trim().startsWith('#'));
            return {
                name: dirName,
                description: firstLine ? firstLine.replace(/^#+\s*/, '') : dirName,
                path: memoryMdPath,
                source,
            };
        }

        let frontmatterData: Record<string, any>;
        try {
            frontmatterData = parse(match[1]);
        } catch {
            console.warn(`Invalid YAML in ${memoryMdPath}`);
            return null;
        }

        if (typeof frontmatterData !== 'object' || frontmatterData === null) {
            return null;
        }

        const name = frontmatterData.name || basename(dirname(memoryMdPath));
        const description = frontmatterData.description || String(name);

        return {
            name: String(name),
            description: String(description),
            path: memoryMdPath,
            source,
            tags: frontmatterData.tags,
            category: frontmatterData.category,
            created: frontmatterData.created,
            last_updated: frontmatterData.last_updated,
            priority: frontmatterData.priority,
            context_scope: frontmatterData.context_scope,
        };
    } catch (error: any) {
        console.warn(`Error reading ${memoryMdPath}: ${error.message}`);
        return null;
    }
}

/**
 * List all memories from a single memories directory.
 */
function _listMemories(memoriesDir: string, source: 'user' | 'project'): MemoryMetadata[] {
    if (!existsSync(memoriesDir)) return [];

    let resolvedBase: string;
    try {
        resolvedBase = resolve(memoriesDir);
    } catch {
        return [];
    }

    const memories: MemoryMetadata[] = [];

    let memoryDirs: string[];
    try {
        memoryDirs = readdirSync(memoriesDir);
    } catch {
        return [];
    }

    for (const item of memoryDirs) {
        const memoryDir = join(memoriesDir, item);

        let lstat;
        let stat;
        try {
            lstat = lstatSync(memoryDir);
            stat = statSync(memoryDir);
        } catch {
            continue;
        }

        if (!stat.isDirectory()) continue;

        if (lstat.isSymbolicLink()) {
            const resolvedMemoryDir = resolve(memoryDir);
            if (!_isSafePath(resolvedMemoryDir, resolvedBase)) continue;
        }

        const memoryMdPath = join(memoryDir, 'MEMORY.md');
        if (!existsSync(memoryMdPath)) continue;

        if (!_isSafePath(memoryMdPath, resolvedBase)) continue;

        const metadata = _parseMemoryMetadata(memoryMdPath, source);
        if (metadata) {
            memories.push(metadata);
        }
    }

    return memories;
}

/**
 * List memories from user and/or project directories.
 *
 * Project memories override user memories with the same name.
 */
export function listMemories(userMemoriesDir?: string, projectMemoriesDir?: string): MemoryMetadata[] {
    const allMemories = new Map<string, MemoryMetadata>();

    if (userMemoriesDir) {
        for (const memory of _listMemories(userMemoriesDir, 'user')) {
            allMemories.set(memory.name, memory);
        }
    }

    if (projectMemoriesDir) {
        for (const memory of _listMemories(projectMemoriesDir, 'project')) {
            allMemories.set(memory.name, memory);
        }
    }

    return Array.from(allMemories.values());
}
