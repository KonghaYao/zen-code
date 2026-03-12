import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseAgentMd, validateAgentConfig } from './parser.js';
import type { ClaudeAgentConfig } from './types.js';

/**
 * Claude Agent Configuration Loader
 *
 * Loads agent configurations from .claude/agents/ directories
 * Supports both project-level and user-level configurations
 */
export class ClaudeAgentLoader {
    /**
     * Find all Agent.md files recursively in a directory
     * @param dir - Directory to search
     * @returns Array of file paths to Agent.md files
     */
    async findAgentFiles(dir: string): Promise<string[]> {
        const files: string[] = [];

        const scanDir = async (currentDir: string): Promise<void> => {
            try {
                const entries = await fs.readdir(currentDir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);

                    if (entry.isDirectory()) {
                        await scanDir(fullPath);
                    } else if (entry.isFile() && (entry.name === 'Agent.md' || entry.name === 'AGENT.md')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Ignore permission errors and missing directories
                const code = (error as NodeJS.ErrnoException).code;
                if (code !== 'ENOENT' && code !== 'EACCES' && code !== 'EPERM') {
                    throw error;
                }
            }
        };

        await scanDir(dir);
        return files;
    }

    /**
     * Load all agent configurations from a directory
     * @param dir - Directory path containing .md files
     * @returns Array of parsed agent configurations
     */
    async loadFromDirectory(dir: string): Promise<ClaudeAgentConfig[]> {
        const agents: ClaudeAgentConfig[] = [];

        try {
            const files = await this.findAgentFiles(dir);

            for (const filePath of files) {
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    const config = parseAgentMd(content, filePath);

                    // Only add valid configurations
                    const errors = validateAgentConfig(config);
                    if (errors.length === 0) {
                        agents.push(config);
                    } else {
                        console.warn(`[ClaudeAgentLoader] Invalid agent config in ${filePath}:`, errors);
                    }
                } catch (error) {
                    console.warn(`[ClaudeAgentLoader] Failed to parse ${filePath}:`, error);
                }
            }
        } catch (error) {
            // Directory doesn't exist, return empty array
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }

        return agents;
    }

    /**
     * Merge project-level and user-level configurations
     * Project-level configs take precedence (override by name)
     * @param projectAgents - Agents from project .claude/agents/
     * @param userAgents - Agents from ~/.claude/agents/
     * @returns Merged array with project agents overriding user agents by name
     */
    mergeConfigs(projectAgents: ClaudeAgentConfig[], userAgents: ClaudeAgentConfig[]): ClaudeAgentConfig[] {
        const agentMap = new Map<string, ClaudeAgentConfig>();

        // Add user-level agents first (lower priority)
        for (const agent of userAgents) {
            agentMap.set(agent.name, agent);
        }

        // Override with project-level agents (higher priority)
        for (const agent of projectAgents) {
            agentMap.set(agent.name, agent);
        }

        return Array.from(agentMap.values());
    }

    /**
     * Load all available agents from both project and user directories
     * @param projectRoot - Project root directory
     * @param userDir - Optional user directory (defaults to ~/.claude/agents)
     * @returns Array of all available agent configurations
     */
    async loadAllAgents(projectRoot: string, userDir?: string): Promise<ClaudeAgentConfig[]> {
        const projectDir = path.join(projectRoot, '.claude', 'agents');
        const userAgentsDir = userDir || path.join(process.env.HOME || '~', '.claude', 'agents');

        const [projectAgents, userAgents] = await Promise.all([
            this.loadFromDirectory(projectDir),
            this.loadFromDirectory(userAgentsDir),
        ]);

        return this.mergeConfigs(projectAgents, userAgents);
    }

    /**
     * Get agent by name from loaded configurations
     * @param agents - Array of agent configurations
     * @param name - Agent name to find
     * @returns Agent configuration or undefined
     */
    getAgentByName(agents: ClaudeAgentConfig[], name: string): ClaudeAgentConfig | undefined {
        return agents.find((agent) => agent.name === name);
    }

    /**
     * Get agent by file path
     * @param filePath - Path to the agent .md file
     * @returns Agent configuration or undefined
     */
    async loadAgentFromFile(filePath: string): Promise<ClaudeAgentConfig | undefined> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const config = parseAgentMd(content, filePath);
            const errors = validateAgentConfig(config);

            if (errors.length > 0) {
                console.warn(`[ClaudeAgentLoader] Invalid agent config in ${filePath}:`, errors);
                return undefined;
            }

            return config;
        } catch (error) {
            console.warn(`[ClaudeAgentLoader] Failed to load ${filePath}:`, error);
            return undefined;
        }
    }
}
