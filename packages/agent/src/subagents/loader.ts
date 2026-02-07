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

import { AgentPackage } from '../standard-agent/package.js';
import { MemoryStorage } from '../standard-agent/storage/memory.js';
import { AgentSchema } from '../standard-agent/schemas.js';
import { z } from 'zod';
import { createToolRegistry } from './tools.js';
import { createMiddlewareRegistry } from './middlewares.js';

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
        id: 'models/qwen-plus',
        model_name: 'glm-4.7',
        model_provider: process.env.MODEL_PROVIDER || 'openai',
        stream_usage: true,
        enable_thinking: true,
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    // Default Prompts
    await pkg.addPrompt({
        id: 'prompts/default',
        name: 'default',
        content: 'You are a helpful AI assistant specialized in coding tasks.',
    });

    await pkg.addPrompt({
        id: 'prompts/planner',
        name: 'planner',
        content: 'You are a task planning specialist. Break down complex tasks into actionable steps.',
    });

    await pkg.addPrompt({
        id: 'prompts/reviewer',
        name: 'reviewer',
        content: 'You are a code review specialist. Analyze code quality, security, and best practices.',
    });

    await pkg.addPrompt({
        id: 'prompts/debugger',
        name: 'debugger',
        content: 'You are a debugging specialist. Help identify and fix code issues.',
    });

    await pkg.addPrompt({
        id: 'prompts/refactor',
        name: 'refactor',
        content: 'You are a refactoring specialist. Improve code structure and maintainability.',
    });

    await pkg.addPrompt({
        id: 'prompts/finder',
        name: 'finder',
        content: 'You are a file navigation specialist. Help users find files and code patterns.',
    });

    // Register tools into the package
    await createToolRegistry(pkg);

    // Register middleware implementations into the package registry
    await createMiddlewareRegistry(pkg);

    // Default SubAgents
    await pkg.addAgent({
        id: 'agents/default',
        name: 'Jarvis',
        description: '全功能代码助手',
        system_prompt: 'prompts/default',
        model: 'models/qwen-plus',
        tools: {
            read_file: true,
            write_file: true,
            edit_file: true,
            glob_files: true,
            'search-files-rg': true,
            folder_operations: true,
            terminal: true,
            ask_user_with_options: true,
            TodoWrite: true,
        },
        middleware: {
            agents_md: true,
            skills: {
                projectMemoriesDir: './.claude/skills',
            },
            memories: {
                projectMemoriesDir: './.claude/memories',
            },
            subagents: true,
        },
    });

    return pkg;
}
