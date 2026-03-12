/**
 * SubAgent Configuration Loader
 *
 * Loads SubAgent configurations from:
 * 1. Default configurations (built-in)
 * 2. Project configurations (.claude/agents.json)
 * 3. User configurations (~/.zen-code/agents.json)
 *
 * Uses standard-agent's AgentPackage for configuration management.
 */

import { AgentPackage, MemoryStorage, AgentSchema } from '@langgraph-js/standard-agent';
import { z } from 'zod';
import { createMiddlewareRegistry } from './middlewares.js';
import { CORE_SYSTEM_PROMPT } from '../prompts/coding.js';
import { architectPrompt } from '../prompts/architect.js';
import { cliAgent } from '../prompts/cli.js';

export interface SubAgentConfig extends z.infer<typeof AgentSchema> {}

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

    // Default Prompts
    await pkg.addPrompt(
        {
            id: 'prompts/default',
            name: 'default',
        },
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
    await pkg.addPrompt(
        {
            id: 'prompts/manager',
            name: 'manager',
        },
        architectPrompt,
    );

    // Register middleware implementations into the package registry
    await createMiddlewareRegistry(pkg);

    // Default SubAgents
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
    // Manager Agent - 项目经理，与用户主要交流，派发任务给子 agent
    // 不需要直接操作文件系统、终端或 MCP，专注于协调和沟通
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

    return pkg;
}
