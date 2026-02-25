/**
 * Memory loader for parsing and loading agent memories from MEMORY.md files.
 *
 * This module implements a memory system pattern with YAML frontmatter parsing.
 * Each memory is a directory containing a MEMORY.md file with:
 * - YAML frontmatter (name, description, tags, category required)
 * - Markdown content for the agent
 * - Optional supporting files (code examples, configs, etc.)
 */

import { readFileSync, statSync, existsSync, readdirSync, lstatSync } from 'fs';
import { join, resolve, relative } from 'path';
import { parse } from 'yaml';

// Maximum size for MEMORY.md files (10MB)
const MAX_MEMORY_FILE_SIZE = 10 * 1024 * 1024;

// Memory spec constraints
const MAX_MEMORY_NAME_LENGTH = 64;
const MAX_MEMORY_DESCRIPTION_LENGTH = 1024;

// Memory metadata type
export interface MemoryMetadata {
    name: string;
    description: string;
    tags: string[];
    category: string;
    path: string;
    source: 'user' | 'project';
    created?: string;
    last_updated?: string;
    priority?: string;
    context_scope?: string;
}

/**
 * Check if a path is safely contained within base_dir.
 */
function _isSafePath(path: string, baseDir: string): boolean {
    try {
        const resolvedPath = resolve(path);
        const resolvedBase = resolve(baseDir);

        // Use relative() to check if path is within baseDir (cross-platform)
        const relativePath = relative(resolvedBase, resolvedPath);

        // Check if path is within baseDir:
        // 1. Empty string = same directory = safe
        // 2. Starts with '..' = goes outside = unsafe
        // 3. Contains ':' = cross-drive on Windows = unsafe (relative() returns absolute path)
        // 4. Otherwise = goes down = safe
        if (!relativePath) {
            return true;
        }
        if (relativePath.startsWith('..') || relativePath.includes(':')) {
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Validate memory name.
 */
function _validateMemoryName(name: string): [boolean, string] {
    if (!name) {
        return [false, 'name is required'];
    }
    if (name.length > MAX_MEMORY_NAME_LENGTH) {
        return [false, 'name exceeds 64 characters'];
    }
    const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!namePattern.test(name)) {
        return [false, 'name must be lowercase alphanumeric with single hyphens only'];
    }
    return [true, ''];
}

/**
 * Validate memory category.
 */
function _validateMemoryCategory(category: string): [boolean, string] {
    const validCategories = ['architecture', 'bug-fix', 'workflow', 'configuration', 'optimization'];
    if (!category) {
        return [false, 'category is required'];
    }
    if (!validCategories.includes(category)) {
        return [false, `category must be one of: ${validCategories.join(', ')}`];
    }
    return [true, ''];
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
            console.warn(`Skipping ${memoryMdPath}: no valid YAML frontmatter found`);
            return null;
        }

        const frontmatterStr = match[1];
        let frontmatterData: Record<string, any>;

        try {
            frontmatterData = parse(frontmatterStr);
        } catch (error) {
            console.warn(`Invalid YAML in ${memoryMdPath}: ${error}`);
            return null;
        }

        if (typeof frontmatterData !== 'object' || frontmatterData === null) {
            console.warn(`Skipping ${memoryMdPath}: frontmatter is not a mapping`);
            return null;
        }

        const name = frontmatterData.name;
        const description = frontmatterData.description;
        const tags = frontmatterData.tags;
        const category = frontmatterData.category;

        if (!name || !description || !tags || !category) {
            console.warn(`Skipping ${memoryMdPath}: missing required fields (name, description, tags, category)`);
            return null;
        }

        const [isValidName, nameError] = _validateMemoryName(String(name));
        if (!isValidName) {
            console.warn(
                `Memory '${name}' in ${memoryMdPath} does not follow naming convention: ${nameError}. ` +
                    `Consider renaming to be compliant.`,
            );
        }

        const [isValidCategory, categoryError] = _validateMemoryCategory(String(category));
        if (!isValidCategory) {
            console.warn(`Skipping ${memoryMdPath}: ${categoryError}`);
            return null;
        }

        let descriptionStr = String(description);
        if (descriptionStr.length > MAX_MEMORY_DESCRIPTION_LENGTH) {
            console.warn(`Description exceeds ${MAX_MEMORY_DESCRIPTION_LENGTH} chars in ${memoryMdPath}, truncating`);
            descriptionStr = descriptionStr.substring(0, MAX_MEMORY_DESCRIPTION_LENGTH);
        }

        if (!Array.isArray(tags)) {
            console.warn(`Skipping ${memoryMdPath}: tags must be an array`);
            return null;
        }
        const tagsArray = tags.map(String);

        return {
            name: String(name),
            description: descriptionStr,
            tags: tagsArray,
            category: String(category),
            path: memoryMdPath,
            source: source,
            created: frontmatterData.created,
            last_updated: frontmatterData.last_updated,
            priority: frontmatterData.priority || 'medium',
            context_scope: frontmatterData.context_scope || 'project',
        };
    } catch (error: any) {
        console.warn(`Error reading ${memoryMdPath}: ${error.message}`);
        return null;
    }
}

/**
 * List all memories from a single memories directory (internal helper).
 */
function _listMemories(memoriesDir: string, source: 'user' | 'project'): MemoryMetadata[] {
    if (!existsSync(memoriesDir)) {
        return [];
    }

    let resolvedBase: string;
    try {
        resolvedBase = resolve(memoriesDir);
    } catch (error) {
        return [];
    }

    const memories: MemoryMetadata[] = [];
    let memoryDirs: string[];

    try {
        memoryDirs = readdirSync(memoriesDir);
    } catch (error) {
        return [];
    }

    for (const item of memoryDirs) {
        const memoryDir = join(memoriesDir, item);

        if (!_isSafePath(memoryDir, resolvedBase)) {
            continue;
        }

        let stat;
        try {
            stat = lstatSync(memoryDir);
        } catch (error) {
            continue;
        }

        if (!stat.isDirectory()) {
            continue;
        }

        const memoryMdPath = join(memoryDir, 'MEMORY.md');
        if (!existsSync(memoryMdPath)) {
            continue;
        }

        if (!_isSafePath(memoryMdPath, resolvedBase)) {
            continue;
        }

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
 * When both directories are provided, project memories with the same name as
 * user memories will override them.
 *
 * @param userMemoriesDir - Path to the user-level memories directory
 * @param projectMemoriesDir - Path to the project-level memories directory
 * @returns Merged list of memory metadata from both sources, with project memories
 *          taking precedence over user memories when names conflict
 */
export function listMemories(userMemoriesDir?: string, projectMemoriesDir?: string): MemoryMetadata[] {
    const allMemories = new Map<string, MemoryMetadata>();

    // Load user memories first (foundation)
    if (userMemoriesDir) {
        const userMemories = _listMemories(userMemoriesDir, 'user');
        for (const memory of userMemories) {
            allMemories.set(memory.name, memory);
        }
    }

    // Load project memories second (override/augment)
    if (projectMemoriesDir) {
        const projectMemories = _listMemories(projectMemoriesDir, 'project');
        for (const memory of projectMemories) {
            // Project memories override user memories with the same name
            allMemories.set(memory.name, memory);
        }
    }

    return Array.from(allMemories.values());
}
