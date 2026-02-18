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
import { createToolRegistry } from './tools.js';
import { createMiddlewareRegistry } from './middlewares.js';
import { CORE_SYSTEM_PROMPT } from '../prompts/coding.js';
import { architectPrompt } from '../prompts/architect.js';

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
        content: CORE_SYSTEM_PROMPT,
    });
    await pkg.addPrompt({
        id: 'prompts/manager',
        name: 'manager',
        content: architectPrompt,
    });

    // Register tools into the package
    await createToolRegistry(pkg);

    // Register middleware implementations into the package registry
    await createMiddlewareRegistry(pkg);

    // Default SubAgents
    await pkg.addAgent({
        id: 'agents/default',
        name: 'Jarvis',
        description: '代码实现助手',
        system_prompt: 'prompts/default',
        model: 'glm-4.7',
        tools: {
            read_file: true,
            write_file: true,
            edit_file: true,
            glob_files: true,
            search_files_rg: true,
            folder_operations: true,
            terminal: true,
            ask_user_questions: true,
            todo_write: true,
        },
        middleware: {
            agents_md: true,
            skills: true,
            memories: true,
            subagents: true,
        },
    });
    // Default SubAgents
    await pkg.addAgent({
        id: 'agents/manager',
        name: 'Manager',
        description: '任务管理员',
        system_prompt: 'prompts/manager',
        model: 'glm-4.7',
        tools: {
            read_file: true,
            write_file: true,
            edit_file: true,
            glob_files: true,
            search_files_rg: true,
            folder_operations: true,
            terminal: true,
            ask_user_questions: true,
            todo_write: true,
        },
        middleware: {
            agents_md: true,
            skills: true,
            memories: true,
            subagents: true,
        },
    });

    return pkg;
}
