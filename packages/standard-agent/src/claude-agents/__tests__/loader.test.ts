import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeAgentLoader } from '../loader.js';
import type { ClaudeAgentConfig } from '../types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

describe('ClaudeAgentLoader', () => {
    let loader: ClaudeAgentLoader;
    let tempDir: string;

    beforeEach(async () => {
        loader = new ClaudeAgentLoader();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-agents-'));
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('loadFromDirectory', () => {
        it('should load single agent from directory', async () => {
            const agentDir = path.join(tempDir, 'test-agent');
            await fs.mkdir(agentDir, { recursive: true });

            await fs.writeFile(
                path.join(agentDir, 'Agent.md'),
                `---
name: test-agent
description: Test agent
tools:
  - read
  - write
---

Test system prompt`,
            );

            const agents = await loader.loadFromDirectory(tempDir);

            expect(agents).toHaveLength(1);
            expect(agents[0].name).toBe('test-agent');
            expect(agents[0].description).toBe('Test agent');
            expect(agents[0].tools).toEqual(['read', 'write']);
            expect(agents[0].systemPrompt).toBe('Test system prompt');
        });

        it('should load multiple agents from directory', async () => {
            await fs.mkdir(path.join(tempDir, 'agent1'), { recursive: true });
            await fs.mkdir(path.join(tempDir, 'agent2'), { recursive: true });

            await fs.writeFile(
                path.join(tempDir, 'agent1', 'Agent.md'),
                `---
name: agent1
description: First agent
---
System 1`,
            );

            await fs.writeFile(
                path.join(tempDir, 'agent2', 'Agent.md'),
                `---
name: agent2
description: Second agent
---
System 2`,
            );

            const agents = await loader.loadFromDirectory(tempDir);

            expect(agents).toHaveLength(2);
            expect(agents.map((a) => a.name)).toContain('agent1');
            expect(agents.map((a) => a.name)).toContain('agent2');
        });

        it('should handle nested directories', async () => {
            const nestedDir = path.join(tempDir, 'nested', 'deep', 'agent');
            await fs.mkdir(nestedDir, { recursive: true });

            await fs.writeFile(
                path.join(nestedDir, 'Agent.md'),
                `---
name: nested-agent
description: Nested agent
---
Nested prompt`,
            );

            const agents = await loader.loadFromDirectory(tempDir);

            expect(agents).toHaveLength(1);
            expect(agents[0].name).toBe('nested-agent');
        });

        it('should skip directories without Agent.md', async () => {
            await fs.mkdir(path.join(tempDir, 'no-agent'), { recursive: true });
            await fs.writeFile(path.join(tempDir, 'no-agent', 'README.md'), 'Not an agent');

            const agents = await loader.loadFromDirectory(tempDir);

            expect(agents).toHaveLength(0);
        });

        it('should handle empty directory', async () => {
            const agents = await loader.loadFromDirectory(tempDir);
            expect(agents).toHaveLength(0);
        });

        it('should handle non-existent directory gracefully', async () => {
            const agents = await loader.loadFromDirectory('/non/existent/path');
            expect(agents).toHaveLength(0);
        });

        it('should skip invalid agent files with warning', async () => {
            await fs.mkdir(path.join(tempDir, 'invalid'), { recursive: true });
            await fs.writeFile(path.join(tempDir, 'invalid', 'Agent.md'), 'Invalid content without frontmatter');

            const agents = await loader.loadFromDirectory(tempDir);

            expect(agents).toHaveLength(0);
        });

        it('should handle Agent.md files directly in root directory', async () => {
            await fs.writeFile(
                path.join(tempDir, 'Agent.md'),
                `---
name: root-agent
description: Root level agent
---
Root prompt`,
            );

            const agents = await loader.loadFromDirectory(tempDir);

            expect(agents).toHaveLength(1);
            expect(agents[0].name).toBe('root-agent');
        });
    });

    describe('mergeConfigs', () => {
        it('should merge project and user agents', () => {
            const projectAgents: ClaudeAgentConfig[] = [
                {
                    name: 'project-agent',
                    description: 'Project agent',
                    systemPrompt: 'Project prompt',
                    filePath: '/project/.claude/agents/project-agent/Agent.md',
                },
            ];

            const userAgents: ClaudeAgentConfig[] = [
                {
                    name: 'user-agent',
                    description: 'User agent',
                    systemPrompt: 'User prompt',
                    filePath: '/user/.claude/agents/user-agent/Agent.md',
                },
            ];

            const merged = loader.mergeConfigs(projectAgents, userAgents);

            expect(merged).toHaveLength(2);
            expect(merged.map((a) => a.name)).toContain('project-agent');
            expect(merged.map((a) => a.name)).toContain('user-agent');
        });

        it('should prioritize project agents over user agents with same name', () => {
            const projectAgents: ClaudeAgentConfig[] = [
                {
                    name: 'shared-agent',
                    description: 'Project version',
                    systemPrompt: 'Project prompt',
                    filePath: '/project/.claude/agents/shared-agent/Agent.md',
                },
            ];

            const userAgents: ClaudeAgentConfig[] = [
                {
                    name: 'shared-agent',
                    description: 'User version',
                    systemPrompt: 'User prompt',
                    filePath: '/user/.claude/agents/shared-agent/Agent.md',
                },
            ];

            const merged = loader.mergeConfigs(projectAgents, userAgents);

            expect(merged).toHaveLength(1);
            expect(merged[0].description).toBe('Project version');
            expect(merged[0].systemPrompt).toBe('Project prompt');
        });

        it('should handle empty arrays', () => {
            expect(loader.mergeConfigs([], [])).toHaveLength(0);
            expect(
                loader.mergeConfigs([{ name: 'a', description: 'd', systemPrompt: 's' }] as ClaudeAgentConfig[], []),
            ).toHaveLength(1);
            expect(
                loader.mergeConfigs([], [{ name: 'a', description: 'd', systemPrompt: 's' }] as ClaudeAgentConfig[]),
            ).toHaveLength(1);
        });

        it('should maintain project agent priority with multiple duplicates', () => {
            const projectAgents: ClaudeAgentConfig[] = [
                { name: 'agent1', description: 'Project 1', systemPrompt: 'P1' },
                { name: 'agent2', description: 'Project 2', systemPrompt: 'P2' },
            ] as ClaudeAgentConfig[];

            const userAgents: ClaudeAgentConfig[] = [
                { name: 'agent1', description: 'User 1', systemPrompt: 'U1' },
                { name: 'agent3', description: 'User 3', systemPrompt: 'U3' },
            ] as ClaudeAgentConfig[];

            const merged = loader.mergeConfigs(projectAgents, userAgents);

            expect(merged).toHaveLength(3);
            const agent1 = merged.find((a) => a.name === 'agent1');
            expect(agent1?.description).toBe('Project 1');
        });
    });

    describe('loadAllAgents', () => {
        it('should load agents from both project and user directories', async () => {
            // Create project directory
            const projectDir = path.join(tempDir, 'project');
            const projectAgentsDir = path.join(projectDir, '.claude', 'agents');
            await fs.mkdir(path.join(projectAgentsDir, 'p-agent'), { recursive: true });
            await fs.writeFile(
                path.join(projectAgentsDir, 'p-agent', 'Agent.md'),
                `---
name: p-agent
description: Project agent
---
Project prompt`,
            );

            // Create user directory
            const userDir = path.join(tempDir, 'user');
            const userAgentsDir = path.join(userDir, '.claude', 'agents');
            await fs.mkdir(path.join(userAgentsDir, 'u-agent'), { recursive: true });
            await fs.writeFile(
                path.join(userAgentsDir, 'u-agent', 'Agent.md'),
                `---
name: u-agent
description: User agent
---
User prompt`,
            );

            const agents = await loader.loadAllAgents(projectDir, userDir);

            expect(agents).toHaveLength(2);
            expect(agents.map((a) => a.name)).toContain('p-agent');
            expect(agents.map((a) => a.name)).toContain('u-agent');
        });

        it('should prioritize project agents when both exist', async () => {
            const projectDir = path.join(tempDir, 'project');
            const projectAgentsDir = path.join(projectDir, '.claude', 'agents');
            await fs.mkdir(path.join(projectAgentsDir, 'shared'), { recursive: true });
            await fs.writeFile(
                path.join(projectAgentsDir, 'shared', 'Agent.md'),
                `---
name: shared-agent
description: Project version
tools:
  - read
---
Project prompt`,
            );

            const userDir = path.join(tempDir, 'user');
            const userAgentsDir = path.join(userDir, '.claude', 'agents');
            await fs.mkdir(path.join(userAgentsDir, 'shared'), { recursive: true });
            await fs.writeFile(
                path.join(userAgentsDir, 'shared', 'Agent.md'),
                `---
name: shared-agent
description: User version
tools:
  - write
---
User prompt`,
            );

            const agents = await loader.loadAllAgents(projectDir, userDir);

            expect(agents).toHaveLength(1);
            expect(agents[0].description).toBe('Project version');
            expect(agents[0].tools).toEqual(['read']);
        });

        it('should handle missing project directory', async () => {
            const userDir = path.join(tempDir, 'user');
            const userAgentsDir = path.join(userDir, '.claude', 'agents');
            await fs.mkdir(path.join(userAgentsDir, 'u-agent'), { recursive: true });
            await fs.writeFile(
                path.join(userAgentsDir, 'u-agent', 'Agent.md'),
                `---
name: u-agent
description: User agent
---
User prompt`,
            );

            const agents = await loader.loadAllAgents('/non/existent/project', userDir);

            expect(agents).toHaveLength(1);
            expect(agents[0].name).toBe('u-agent');
        });

        it('should handle missing user directory', async () => {
            const projectDir = path.join(tempDir, 'project');
            const projectAgentsDir = path.join(projectDir, '.claude', 'agents');
            await fs.mkdir(path.join(projectAgentsDir, 'p-agent'), { recursive: true });
            await fs.writeFile(
                path.join(projectAgentsDir, 'p-agent', 'Agent.md'),
                `---
name: p-agent
description: Project agent
---
Project prompt`,
            );

            const agents = await loader.loadAllAgents(projectDir, '/non/existent/user');

            expect(agents).toHaveLength(1);
            expect(agents[0].name).toBe('p-agent');
        });

        it('should work with default user directory', async () => {
            const projectDir = path.join(tempDir, 'project');
            const projectAgentsDir = path.join(projectDir, '.claude', 'agents');
            await fs.mkdir(path.join(projectAgentsDir, 'p-agent'), { recursive: true });
            await fs.writeFile(
                path.join(projectAgentsDir, 'p-agent', 'Agent.md'),
                `---
name: p-agent
description: Project agent
---
Project prompt`,
            );

            // Test with default user directory (should not throw)
            const agents = await loader.loadAllAgents(projectDir);

            expect(agents).toHaveLength(1);
            expect(agents[0].name).toBe('p-agent');
        });
    });

    describe('findAgentFiles', () => {
        it('should find all Agent.md files recursively', async () => {
            await fs.mkdir(path.join(tempDir, 'agent1'), { recursive: true });
            await fs.mkdir(path.join(tempDir, 'sub', 'agent2'), { recursive: true });

            await fs.writeFile(path.join(tempDir, 'agent1', 'Agent.md'), 'content');
            await fs.writeFile(path.join(tempDir, 'sub', 'agent2', 'Agent.md'), 'content');
            await fs.writeFile(path.join(tempDir, 'Agent.md'), 'content');

            const files = await loader.findAgentFiles(tempDir);

            expect(files).toHaveLength(3);
            expect(files.some((f) => f.endsWith('Agent.md'))).toBe(true);
        });
    });
});
