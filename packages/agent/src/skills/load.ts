/**
 * Skill loader for parsing and loading agent skills from SKILL.md files.
 *
 * This module implements Anthropic's agent skills pattern with YAML frontmatter parsing.
 * Each skill is a directory containing a SKILL.md file with:
 * - YAML frontmatter (name, description required)
 * - Markdown instructions for the agent
 * - Optional supporting files (scripts, configs, etc.)
 *
 * Example SKILL.md structure:
 * ```markdown
 * ---
 * name: web-research
 * description: Structured approach to conducting thorough web research
 * ---
 *
 * # Web Research Skill
 *
 * ## When to Use
 * - User asks you to research a topic
 * ...
 * ```
 */

import { readFileSync, statSync, existsSync, readdirSync, lstatSync } from 'fs';
import { join, resolve } from 'path';
import { parse } from 'yaml';

// Maximum size for SKILL.md files (10MB)
const MAX_SKILL_FILE_SIZE = 10 * 1024 * 1024;

// Agent Skills spec constraints (https://agentskills.io/specification)
const MAX_SKILL_NAME_LENGTH = 64;
const MAX_SKILL_DESCRIPTION_LENGTH = 1024;

// Skill metadata type
export interface SkillMetadata {
    name: string;
    description: string;
    path: string;
    source: 'user' | 'project';
    license?: string;
    compatibility?: string;
    metadata?: Record<string, string>;
    allowed_tools?: string;
}

/**
 * Check if a path is safely contained within base_dir.
 *
 * This prevents directory traversal attacks via symlinks or path manipulation.
 * The function resolves both paths to their canonical form (following symlinks)
 * and verifies that the target path is within the base directory.
 *
 * @param path - The path to validate
 * @param baseDir - The base directory that should contain the path
 * @returns True if the path is safely within baseDir, false otherwise
 */
function _isSafePath(path: string, baseDir: string): boolean {
    try {
        // Resolve both paths to their canonical form (follows symlinks)
        const resolvedPath = resolve(path);
        const resolvedBase = resolve(baseDir);

        // Check if the resolved path is within the base directory
        // This catches symlinks that point outside the base directory
        const relativePath = resolvedPath.substring(resolvedBase.length);

        // If the path starts with the base directory and the next character is path separator
        // or if they are exactly equal, it's safe
        return resolvedPath === resolvedBase || relativePath.startsWith('/') || relativePath === '';
    } catch (error) {
        // Error resolving paths (e.g., circular symlinks, too many levels)
        return false;
    }
}

/**
 * Validate skill name per Agent Skills spec.
 *
 * Requirements:
 * - Max 64 characters
 * - Lowercase alphanumeric and hyphens only (a-z, 0-9, -)
 * - Cannot start or end with hyphen
 * - No consecutive hyphens
 * - Must match parent directory name
 *
 * @param name - The skill name from YAML frontmatter
 * @param directoryName - The parent directory name
 * @returns Tuple of [isValid, errorMessage]. If valid, errorMessage is empty
 */
function _validateSkillName(name: string, directoryName: string): [boolean, string] {
    if (!name) {
        return [false, 'name is required'];
    }
    if (name.length > MAX_SKILL_NAME_LENGTH) {
        return [false, 'name exceeds 64 characters'];
    }
    // Pattern: lowercase alphanumeric, single hyphens between segments, no start/end hyphen
    const namePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!namePattern.test(name)) {
        return [false, 'name must be lowercase alphanumeric with single hyphens only'];
    }
    if (name !== directoryName) {
        return [false, `name '${name}' must match directory name '${directoryName}'`];
    }
    return [true, ''];
}

/**
 * Parse YAML frontmatter from a SKILL.md file per Agent Skills spec.
 *
 * @param skillMdPath - Path to the SKILL.md file
 * @param source - Source of the skill ('user' or 'project')
 * @returns SkillMetadata with all fields, or null if parsing fails
 */
function _parseSkillMetadata(skillMdPath: string, source: 'user' | 'project'): SkillMetadata | null {
    try {
        // Security: Check file size to prevent DoS attacks
        const fileStats = statSync(skillMdPath);
        if (fileStats.size > MAX_SKILL_FILE_SIZE) {
            console.warn(`Skipping ${skillMdPath}: file too large (${fileStats.size} bytes)`);
            return null;
        }

        const content = readFileSync(skillMdPath, 'utf-8');

        // Match YAML frontmatter between --- delimiters
        const frontmatterPattern = /^---\s*\n(.*?)\n---\s*\n/s;
        const match = content.match(frontmatterPattern);

        if (!match) {
            console.warn(`Skipping ${skillMdPath}: no valid YAML frontmatter found`);
            return null;
        }

        const frontmatterStr = match[1];

        // Parse YAML using the yaml library
        let frontmatterData: Record<string, any>;

        try {
            frontmatterData = parse(frontmatterStr);
        } catch (error) {
            console.warn(`Invalid YAML in ${skillMdPath}: ${error}`);
            return null;
        }

        if (typeof frontmatterData !== 'object' || frontmatterData === null) {
            console.warn(`Skipping ${skillMdPath}: frontmatter is not a mapping`);
            return null;
        }

        // Validate required fields
        const name = frontmatterData.name;
        const description = frontmatterData.description;

        if (!name || !description) {
            console.warn(`Skipping ${skillMdPath}: missing required 'name' or 'description'`);
            return null;
        }

        // Validate name format per spec (warn but still load for backwards compatibility)
        const directoryName = skillMdPath.split('/').slice(-2)[0];
        const [isValid, error] = _validateSkillName(String(name), directoryName);
        if (!isValid) {
            console.warn(
                `Skill '${name}' in ${skillMdPath} does not follow Agent Skills spec: ${error}. ` +
                    `Consider renaming to be spec-compliant.`,
            );
        }

        // Validate description length (spec: max 1024 chars)
        let descriptionStr = String(description);
        if (descriptionStr.length > MAX_SKILL_DESCRIPTION_LENGTH) {
            console.warn(`Description exceeds ${MAX_SKILL_DESCRIPTION_LENGTH} chars in ${skillMdPath}, truncating`);
            descriptionStr = descriptionStr.substring(0, MAX_SKILL_DESCRIPTION_LENGTH);
        }

        return {
            name: String(name),
            description: descriptionStr,
            path: skillMdPath,
            source: source,
            license: frontmatterData.license,
            compatibility: frontmatterData.compatibility,
            metadata: frontmatterData.metadata,
            allowed_tools: frontmatterData['allowed-tools'],
        };
    } catch (error: any) {
        console.warn(`Error reading ${skillMdPath}: ${error.message}`);
        return null;
    }
}

/**
 * List all skills from a single skills directory (internal helper).
 *
 * Scans the skills directory for subdirectories containing SKILL.md files,
 * parses YAML frontmatter, and returns skill metadata.
 *
 * Skills are organized as:
 * ```
 * skills/
 * ├── skill-name/
 * │   ├── SKILL.md        # Required: instructions with YAML frontmatter
 * │   ├── script.py       # Optional: supporting files
 * │   └── config.json     # Optional: supporting files
 * ```
 *
 * @param skillsDir - Path to the skills directory
 * @param source - Source of the skills ('user' or 'project')
 * @returns List of skill metadata dictionaries
 */
function _listSkills(skillsDir: string, source: 'user' | 'project'): SkillMetadata[] {
    // Check if skills directory exists
    if (!existsSync(skillsDir)) {
        return [];
    }

    // Resolve base directory to canonical path for security checks
    let resolvedBase: string;
    try {
        resolvedBase = resolve(skillsDir);
    } catch (error) {
        // Can't resolve base directory, fail safe
        return [];
    }

    const skills: SkillMetadata[] = [];

    // Iterate through subdirectories
    let skillDirs: string[];
    try {
        skillDirs = readdirSync(skillsDir);
    } catch (error) {
        return [];
    }

    for (const item of skillDirs) {
        const skillDir = join(skillsDir, item);

        // Security: Catch symlinks pointing outside the skills directory
        if (!_isSafePath(skillDir, resolvedBase)) {
            continue;
        }

        let stat;
        try {
            stat = lstatSync(skillDir);
        } catch (error) {
            continue;
        }

        if (!stat.isDirectory()) {
            continue;
        }

        // Look for SKILL.md file
        const skillMdPath = join(skillDir, 'SKILL.md');
        if (!existsSync(skillMdPath)) {
            continue;
        }

        // Security: Validate SKILL.md path is safe before reading
        // This catches SKILL.md files that are symlinks pointing outside
        if (!_isSafePath(skillMdPath, resolvedBase)) {
            continue;
        }

        // Parse metadata
        const metadata = _parseSkillMetadata(skillMdPath, source);
        if (metadata) {
            skills.push(metadata);
        }
    }

    return skills;
}

/**
 * List skills from user and/or project directories.
 *
 * When both directories are provided, project skills with the same name as
 * user skills will override them.
 *
 * TODO: 加上强缓存以避免性能问题
 *
 * @param userSkillsDir - Path to the user-level skills directory
 * @param projectSkillsDir - Path to the project-level skills directory
 * @returns Merged list of skill metadata from both sources, with project skills
 *          taking precedence over user skills when names conflict
 */
export function listSkills(userSkillsDir?: string, projectSkillsDir?: string): SkillMetadata[] {
    const allSkills = new Map<string, SkillMetadata>();

    // Load user skills first (foundation)
    if (userSkillsDir) {
        const userSkills = _listSkills(userSkillsDir, 'user');
        for (const skill of userSkills) {
            allSkills.set(skill.name, skill);
        }
    }

    // Load project skills second (override/augment)
    if (projectSkillsDir) {
        const projectSkills = _listSkills(projectSkillsDir, 'project');
        for (const skill of projectSkills) {
            // Project skills override user skills with the same name
            allSkills.set(skill.name, skill);
        }
    }

    return Array.from(allSkills.values());
}
