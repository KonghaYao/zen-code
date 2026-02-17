import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileSystemSkillStore } from '../implementations/FileSystemSkillStore.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { SkillContent, IRemoteStore } from '../types/index.js';

// Helper to create temporary directories for testing
async function createTempDirs(): Promise<{ userSkillsDir: string; projectSkillsDir: string }> {
    const baseDir = path.join(os.tmpdir(), `skill-store-test-${Date.now()}`);
    const userSkillsDir = path.join(baseDir, 'user-skills');
    const projectSkillsDir = path.join(baseDir, 'project-skills');

    await fs.mkdir(userSkillsDir, { recursive: true });
    await fs.mkdir(projectSkillsDir, { recursive: true });

    return { userSkillsDir, projectSkillsDir };
}

// Helper to clean up temporary directories
async function cleanupTempDirs(baseDir: string): Promise<void> {
    if (
        await fs
            .access(baseDir)
            .then(() => true)
            .catch(() => false)
    ) {
        await fs.rm(baseDir, { recursive: true, force: true });
    }
}

// Helper to create a skill file
async function createSkillFile(skillsDir: string, name: string, description: string, content: string): Promise<void> {
    const skillDir = path.join(skillsDir, name);
    await fs.mkdir(skillDir, { recursive: true });

    const skillFile = path.join(skillDir, 'SKILL.md');
    const skillContent = `---
description: ${description}
tags: [test]
---

# ${name}

${content}
`;

    await fs.writeFile(skillFile, skillContent, 'utf-8');
}

describe('FileSystemSkillStore', () => {
    let store: FileSystemSkillStore;
    let tempBaseDir: string;
    let userSkillsDir: string;
    let projectSkillsDir: string;
    let originalCwd: string;
    let originalHomedir: string;

    beforeEach(async () => {
        // Save original working directory and home directory
        originalCwd = process.cwd();
        originalHomedir = os.homedir();

        // Create temporary base directory
        tempBaseDir = path.join(os.tmpdir(), `skill-store-test-${Date.now()}`);

        // Create directories that match what FileSystemSkillStore expects
        const mockHomeDir = path.join(tempBaseDir, 'home');
        const mockProjectDir = path.join(tempBaseDir, 'project');

        // Store the actual skill directories for test setup
        userSkillsDir = path.join(mockHomeDir, '.claude', 'code', 'skills');
        projectSkillsDir = path.join(mockProjectDir, '.claude', 'skills');

        // Create the directories
        await fs.mkdir(userSkillsDir, { recursive: true });
        await fs.mkdir(projectSkillsDir, { recursive: true });

        // Mock process.cwd and os.homedir to return our test directories
        vi.spyOn(process, 'cwd').mockReturnValue(mockProjectDir);
        vi.spyOn(os, 'homedir').mockReturnValue(mockHomeDir);

        // Create store instance AFTER mocks are set up
        store = new FileSystemSkillStore();
    });

    afterEach(async () => {
        // Clean up temporary directories
        await cleanupTempDirs(tempBaseDir);

        // Restore mocks
        vi.restoreAllMocks();
    });

    describe('listSkills', () => {
        it('should return empty array when no skills exist', async () => {
            const skills = await store.listSkills();

            expect(skills).toEqual([]);
        });

        it('should list skills from user directory', async () => {
            // Create test skills in user directory
            await createSkillFile(userSkillsDir, 'test-skill-1', 'Test Skill 1', 'Content 1');
            await createSkillFile(userSkillsDir, 'test-skill-2', 'Test Skill 2', 'Content 2');

            const skills = await store.listSkills();

            expect(skills).toHaveLength(2);
            expect(skills[0].name).toBe('test-skill-1');
            expect(skills[0].description).toBe('Test Skill 1');
            expect(skills[1].name).toBe('test-skill-2');
            expect(skills[1].description).toBe('Test Skill 2');
        });

        it('should list skills from project directory', async () => {
            // Create test skills in project directory
            await createSkillFile(projectSkillsDir, 'project-skill-1', 'Project Skill 1', 'Content 1');

            const skills = await store.listSkills();

            expect(skills).toHaveLength(1);
            expect(skills[0].name).toBe('project-skill-1');
            expect(skills[0].description).toBe('Project Skill 1');
        });

        it('should list skills from both user and project directories', async () => {
            // Create skills in both directories
            await createSkillFile(userSkillsDir, 'user-skill', 'User Skill', 'User Content');
            await createSkillFile(projectSkillsDir, 'project-skill', 'Project Skill', 'Project Content');

            const skills = await store.listSkills();

            expect(skills).toHaveLength(2);
            const skillNames = skills.map((s) => s.name).sort();
            expect(skillNames).toEqual(['project-skill', 'user-skill']);
        });

        it('should handle skills with missing SKILL.md files gracefully', async () => {
            // Create a skill directory without SKILL.md
            const invalidSkillDir = path.join(userSkillsDir, 'invalid-skill');
            await fs.mkdir(invalidSkillDir, { recursive: true });

            // Create a valid skill
            await createSkillFile(userSkillsDir, 'valid-skill', 'Valid Skill', 'Valid Content');

            const skills = await store.listSkills();

            expect(skills).toHaveLength(1);
            expect(skills[0].name).toBe('valid-skill');
        });
    });

    describe('getSkill', () => {
        it('should return null for non-existent skill', async () => {
            const content = await store.getSkill('non-existent');

            expect(content).toBeNull();
        });

        it('should get skill from project directory (priority over user)', async () => {
            // Create skill in both directories
            await createSkillFile(userSkillsDir, 'test-skill', 'User Description', 'User Content');
            await createSkillFile(projectSkillsDir, 'test-skill', 'Project Description', 'Project Content');

            const content = await store.getSkill('test-skill');

            expect(content).not.toBeNull();
            expect(content?.frontmatter.description).toBe('Project Description');
            expect(content?.markdown).toContain('Project Content');
        });

        it('should get skill from user directory if not in project', async () => {
            await createSkillFile(userSkillsDir, 'user-only-skill', 'User Description', 'User Content');

            const content = await store.getSkill('user-only-skill');

            expect(content).not.toBeNull();
            expect(content?.frontmatter.description).toBe('User Description');
            expect(content?.markdown).toContain('User Content');
        });

        it('should parse frontmatter correctly', async () => {
            await createSkillFile(userSkillsDir, 'frontmatter-skill', 'Test Description', 'Test Content');

            const content = await store.getSkill('frontmatter-skill');

            expect(content).not.toBeNull();
            expect(content?.frontmatter.description).toBe('Test Description');
            expect(content?.frontmatter.tags).toEqual(['test']);
        });

        it('should separate frontmatter from markdown content', async () => {
            await createSkillFile(userSkillsDir, 'content-skill', 'Description', '# Header\n\nSome content');

            const content = await store.getSkill('content-skill');

            expect(content).not.toBeNull();
            expect(content?.markdown).toContain('# Header');
            expect(content?.markdown).toContain('Some content');
            expect(content?.markdown).not.toContain('---');
        });
    });

    describe('saveSkill', () => {
        it('should save skill to user directory', async () => {
            const skillContent: SkillContent = {
                frontmatter: {
                    description: 'New Skill',
                    usage: 'Use for testing',
                },
                markdown: '# New Skill\n\nThis is a new skill.',
            };

            await store.saveSkill('new-skill', skillContent);

            const skillPath = path.join(userSkillsDir, 'new-skill', 'SKILL.md');
            expect(
                await fs
                    .access(skillPath)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(true);

            const savedContent = await fs.readFile(skillPath, 'utf-8');
            expect(savedContent).toContain('description: New Skill');
            expect(savedContent).toContain('# New Skill');
        });

        it('should create skill directory if it does not exist', async () => {
            const skillContent: SkillContent = {
                frontmatter: { description: 'Test' },
                markdown: 'Content',
            };

            await store.saveSkill('nested/skill', skillContent);

            const skillPath = path.join(userSkillsDir, 'nested', 'skill', 'SKILL.md');
            expect(
                await fs
                    .access(skillPath)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(true);
        });

        it('should format skill content correctly', async () => {
            const skillContent: SkillContent = {
                frontmatter: {
                    description: 'Formatted Skill',
                    tags: ['test', 'example'],
                },
                markdown: '## Example\n\nThis is formatted.',
            };

            await store.saveSkill('formatted-skill', skillContent);

            const skillPath = path.join(userSkillsDir, 'formatted-skill', 'SKILL.md');
            const savedContent = await fs.readFile(skillPath, 'utf-8');

            expect(savedContent).toMatch(/^---\ndescription: Formatted Skill/);
            expect(savedContent).toContain('tags:\n  - test\n  - example');
            expect(savedContent).toContain('---\n\n## Example');
        });

        it('should overwrite existing skill', async () => {
            // Create initial skill
            await createSkillFile(userSkillsDir, 'overwrite-test', 'Old Description', 'Old Content');

            // Save new content
            const newContent: SkillContent = {
                frontmatter: { description: 'New Description' },
                markdown: 'New Content',
            };

            await store.saveSkill('overwrite-test', newContent);

            const retrievedContent = await store.getSkill('overwrite-test');
            expect(retrievedContent?.frontmatter.description).toBe('New Description');
            expect(retrievedContent?.markdown).toContain('New Content');
        });
    });

    describe('deleteSkill', () => {
        it('should delete skill from user directory', async () => {
            await createSkillFile(userSkillsDir, 'delete-test', 'To be deleted', 'Content');

            const skillPath = path.join(userSkillsDir, 'delete-test', 'SKILL.md');
            expect(
                await fs
                    .access(skillPath)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(true);

            await store.deleteSkill('delete-test');

            expect(
                await fs
                    .access(skillPath)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(false);
        });

        it('should handle deleting non-existent skill gracefully', async () => {
            await expect(store.deleteSkill('non-existent')).resolves.not.toThrow();
        });

        it('should delete entire skill directory', async () => {
            await createSkillFile(userSkillsDir, 'directory-test', 'Test', 'Content');

            const skillDir = path.join(userSkillsDir, 'directory-test');
            expect(
                await fs
                    .access(skillDir)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(true);

            await store.deleteSkill('directory-test');

            expect(
                await fs
                    .access(skillDir)
                    .then(() => true)
                    .catch(() => false),
            ).toBe(false);
        });
    });

    describe('syncFromRemote', () => {
        it('should fetch and save skills from remote store', async () => {
            const remoteSkill1: SkillContent = {
                frontmatter: { description: 'Remote Skill 1' },
                markdown: 'Remote content 1',
            };
            const remoteSkill2: SkillContent = {
                frontmatter: { description: 'Remote Skill 2' },
                markdown: 'Remote content 2',
            };

            const mockRemoteStore: IRemoteStore = {
                fetchSkill: vi.fn().mockResolvedValueOnce(remoteSkill1).mockResolvedValueOnce(remoteSkill2),
                fetchPlugin: vi.fn(),
                listRemoteSkills: vi.fn().mockResolvedValue([
                    { name: 'remote-skill-1', description: 'Remote Skill 1', path: '' },
                    { name: 'remote-skill-2', description: 'Remote Skill 2', path: '' },
                ]),
                listRemotePlugins: vi.fn(),
            };

            await store.syncFromRemote(mockRemoteStore);

            expect(mockRemoteStore.listRemoteSkills).toHaveBeenCalledTimes(1);
            expect(mockRemoteStore.fetchSkill).toHaveBeenCalledWith('remote-skill-1');
            expect(mockRemoteStore.fetchSkill).toHaveBeenCalledWith('remote-skill-2');

            // Verify skills were saved locally
            const skill1 = await store.getSkill('remote-skill-1');
            const skill2 = await store.getSkill('remote-skill-2');

            expect(skill1).toEqual(remoteSkill1);
            expect(skill2).toEqual(remoteSkill2);
        });

        it('should skip skills that fail to fetch', async () => {
            const mockRemoteStore: IRemoteStore = {
                fetchSkill: vi
                    .fn()
                    .mockResolvedValueOnce({ frontmatter: { description: 'Valid' }, markdown: 'Content' })
                    .mockResolvedValueOnce(null), // Second skill fails to fetch
                fetchPlugin: vi.fn(),
                listRemoteSkills: vi.fn().mockResolvedValue([
                    { name: 'valid-skill', description: 'Valid', path: '' },
                    { name: 'invalid-skill', description: 'Invalid', path: '' },
                ]),
                listRemotePlugins: vi.fn(),
            };

            await store.syncFromRemote(mockRemoteStore);

            const validSkill = await store.getSkill('valid-skill');
            expect(validSkill).not.toBeNull();

            const invalidSkill = await store.getSkill('invalid-skill');
            expect(invalidSkill).toBeNull();
        });

        it('should handle empty remote skills list', async () => {
            const mockRemoteStore: IRemoteStore = {
                fetchSkill: vi.fn(),
                fetchPlugin: vi.fn(),
                listRemoteSkills: vi.fn().mockResolvedValue([]),
                listRemotePlugins: vi.fn(),
            };

            await expect(store.syncFromRemote(mockRemoteStore)).resolves.not.toThrow();
            expect(mockRemoteStore.fetchSkill).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle skills with invalid YAML frontmatter', async () => {
            const skillDir = path.join(userSkillsDir, 'invalid-yaml');
            await fs.mkdir(skillDir, { recursive: true });

            const invalidYaml = `---
description: Test
invalid: [unclosed bracket
---

# Content
`;
            await fs.writeFile(path.join(skillDir, 'SKILL.md'), invalidYaml, 'utf-8');

            const skills = await store.listSkills();

            // Should still list the skill, even with invalid frontmatter
            expect(skills.length).toBeGreaterThan(0);
        });

        it('should handle skills without frontmatter', async () => {
            const skillDir = path.join(userSkillsDir, 'no-frontmatter');
            await fs.mkdir(skillDir, { recursive: true });

            const noFrontmatter = `# Just Content

No frontmatter here.
`;
            await fs.writeFile(path.join(skillDir, 'SKILL.md'), noFrontmatter, 'utf-8');

            const content = await store.getSkill('no-frontmatter');

            expect(content).not.toBeNull();
            expect(content?.frontmatter).toEqual({});
            expect(content?.markdown).toContain('# Just Content');
        });
    });
});
