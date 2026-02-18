/**
 * Agent Configuration System
 *
 * Reads agent configurations from AgentPackage.
 * Each agent has specific tools, prompts, and middleware settings.
 *
 * Aligned with AgentSchema from @langgraph-js/standard-agent
 */

import type { AgentPackage } from '@langgraph-js/standard-agent';

export interface FEAgentConfig {
    id: string;
    name: string;
    description: string;
    system_prompt: string; // Reference to prompt ID
    model: string; // Reference to model ID
}

/**
 * Load agent configurations from AgentPackage
 * Returns a map of agent ID to configuration
 */
export async function loadAgentsList(pkg: AgentPackage): Promise<Record<string, FEAgentConfig>> {
    const agents = await pkg.listAgents();
    const result: Record<string, FEAgentConfig> = {};

    for (const agent of agents) {
        result[agent.id] = {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            system_prompt: agent.systemPromptId,
            model: agent.modelId,
        };
    }

    return result;
}

/**
 * Get default agent ID
 */
export function getDefaultAgentId(): string {
    return 'default';
}

/**
 * Validate agent configuration
 * Ensures required fields are present and types are correct
 */
export function validateAgentConfig(config: FEAgentConfig): string[] {
    const errors: string[] = [];

    if (!config.id) {
        errors.push('Agent id is required');
    }
    if (!config.name) {
        errors.push('Agent name is required');
    }
    if (!config.description) {
        errors.push('Agent description is required');
    }
    if (!config.system_prompt) {
        errors.push('Agent system_prompt is required');
    }
    if (!config.model) {
        errors.push('Agent model is required');
    }

    return errors;
}
