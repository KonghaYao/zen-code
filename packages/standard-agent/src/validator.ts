import type { IStorage } from './storage/abstract.js';

/**
 * Agent Validator
 *
 * Validates agent dependencies (models, prompts, tools, middlewares)
 */
export class AgentValidator {
    constructor(private storage: IStorage) {}

    async validateAgent(agentId: string): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];
        const agent = await this.storage.getAgent(agentId);

        if (!agent) {
            errors.push(`Agent ${agentId} not found`);
            return { valid: false, errors };
        }

        // Check model reference
        const model = await this.storage.getModel(agent.model_id);
        if (!model) {
            errors.push(`Model ${agent.model_id} not found`);
        }

        // Check system prompt reference
        const prompt = await this.storage.getPrompt(agent.system_prompt_id);
        if (!prompt) {
            errors.push(`Prompt ${agent.system_prompt_id} not found`);
        }

        // Check tool references
        for (const toolId of Object.keys(agent.tools)) {
            const tool = await this.storage.getTool(toolId);
            if (!tool) {
                errors.push(`Tool ${toolId} not found`);
            }
        }

        // Check middleware references
        for (const midId of Object.keys(agent.middlewares)) {
            const middleware = await this.storage.getMiddleware(midId);
            if (!middleware) {
                errors.push(`Middleware ${midId} not found`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    async validateAll(): Promise<Map<string, { valid: boolean; errors: string[] }>> {
        const results = new Map<string, { valid: boolean; errors: string[] }>();
        const agents = await this.storage.getAllAgents();

        for (const agent of agents) {
            results.set(agent.id, await this.validateAgent(agent.id));
        }

        return results;
    }
}
