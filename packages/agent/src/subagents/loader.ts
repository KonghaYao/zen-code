/**
 * SubAgent Configuration Loader
 *
 * Loads SubAgent configurations from:
 * 1. Project Agent.md files (.claude/agents/**\/Agent.md) - highest priority
 * 2. User Agent.md files (~/.claude/agents/**\/Agent.md)
 * 3. Default configurations (built-in) - fallback
 *
 * Uses standard-agent's AgentPackage for configuration management.
 */

import { AgentPackage, MemoryStorage, AgentSchema, ClaudeAgentLoader } from '@langgraph-js/standard-agent';
import { z } from 'zod';
import * as os from 'node:os';
import { createMiddlewareRegistry } from './middlewares.js';
import { architectPrompt } from '../prompts/architect.js';
import { cliAgent } from '../prompts/cli.js';

export interface SubAgentConfig extends z.infer<typeof AgentSchema> {}

/**
 * Default middleware configuration for agents loaded from Agent.md
 * Enables all standard middlewares
 */
const DEFAULT_MIDDLEWARES = {
    filesystem: true,
    terminal: true,
    agents_md: true,
    skills: true,
    subagents: true,
    interactive: true,
    task: true,
    mcp: true,
    web: true,
};

/**
 * Load default SubAgent configurations
 * These are the built-in agents provided by the system
 */
export async function loadDefaultConfigs(): Promise<AgentPackage> {
    const storage = new MemoryStorage();
    const pkg = new AgentPackage(storage);

    // Default Model
    await pkg.addModel({
        id: 'glm-4.7',
        model_name: 'glm-4.7',
        provider_id: process.env.MODEL_PROVIDER || 'openai',
        stream_usage: true,
        enable_thinking: true,
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    // Register middleware implementations into the package registry
    await createMiddlewareRegistry(pkg);

    // ========================================
    // Load Agent.md configurations (higher priority)
    // ========================================
    const loader = new ClaudeAgentLoader();
    const agentMdConfigs = await loader.loadAllAgents(process.cwd());

    // Track which agent IDs are covered by Agent.md
    const agentMdIds = new Set(agentMdConfigs.map((c) => `agents/${c.name}`));

    // Register Agent.md agents into package
    for (const config of agentMdConfigs) {
        const agentId = `agents/${config.name}`;
        const promptId = `prompts/${config.name}`;

        await pkg.addPrompt({ id: promptId, name: config.name }, config.systemPrompt);
        await pkg.addAgent({
            id: agentId,
            name: config.name,
            description: config.description,
            system_prompt: promptId,
            model: 'glm-4.7',
            middlewares: DEFAULT_MIDDLEWARES,
        });
    }

    // ========================================
    // Register built-in prompts
    // ========================================
    await pkg.addPrompt(
        { id: 'prompts/default', name: 'default' },
        cliAgent({
            cwd: process.cwd()!,
            env: {
                isGitRepo: true,
                platform: process.platform,
                osVersion: process.version,
                date: new Date().toISOString().split('T')[0],
            },
        }),
    );
    await pkg.addPrompt({ id: 'prompts/manager', name: 'manager' }, architectPrompt);

    // ========================================
    // Register built-in agents (only if not overridden by Agent.md)
    // ========================================
    if (!agentMdIds.has('agents/default')) {
        await pkg.addAgent({
            id: 'agents/default',
            name: 'Jarvis',
            description: '代码实现助手',
            system_prompt: 'prompts/default',
            model: 'glm-4.7',
            middlewares: {
                filesystem: true,
                terminal: true,
                agents_md: true,
                skills: true,
                subagents: true,
                interactive: true,
                task: true,
                mcp: true,
                web: true,
            },
        });
    }

    if (!agentMdIds.has('agents/manager')) {
        await pkg.addAgent({
            id: 'agents/manager',
            name: 'Manager',
            description: '任务管理员',
            system_prompt: 'prompts/manager',
            model: 'glm-4.7',
            middlewares: {
                filesystem: false,
                terminal: false,
                agents_md: true,
                skills: true,
                subagents: true,
                interactive: true,
                task: true,
                mcp: false,
                web: false,
            },
        });
    }

    return pkg;
}
