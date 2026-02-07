import { z } from 'zod';
import { AgentPackageSchema } from './schemas.js';
import type { IStorage } from './storage/abstract.js';

/**
 * Agent Serializer
 *
 * Handles JSON import/export for agent packages
 */
export class AgentSerializer {
    constructor(private storage: IStorage) {}

    /**
     * Export all agents, models, and prompts to JSON
     */
    async toJSON(): Promise<z.infer<typeof AgentPackageSchema>> {
        const [models, prompts, agents] = await Promise.all([
            this.storage.getAllModels(),
            this.storage.getAllPrompts(),
            this.storage.getAllAgents(),
        ]);

        return {
            models: models.map((m) => ({
                id: m.id,
                model_name: m.model_name,
                model_provider: m.model_provider,
                stream_usage: Boolean(m.stream_usage),
                enable_thinking: Boolean(m.enable_thinking),
                temperature: m.temperature,
                max_tokens: m.max_tokens,
                top_p: m.top_p,
                frequency_penalty: m.frequency_penalty,
                presence_penalty: m.presence_penalty,
            })),
            prompts: prompts.map((p) => ({
                id: p.id,
                name: p.name,
                content: p.content,
                metadata: p.metadata ? JSON.parse(p.metadata) : undefined,
            })),
            agents: agents.map((a) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                system_prompt: a.system_prompt_id,
                model: a.model_id,
                tools: a.tools,
                middleware: a.middlewares,
            })),
        };
    }

    /**
     * Import agents, models, and prompts from JSON
     */
    async fromJSON(data: z.infer<typeof AgentPackageSchema>): Promise<void> {
        const result = AgentPackageSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid AgentPackage data: ${result.error.message}`);
        }

        // Add resources in dependency order using transactions
        await this.storage.transaction(async () => {
            for (const m of result.data.models) {
                await this.storage.insertModel(m);
            }
            for (const p of result.data.prompts) {
                await this.storage.insertPrompt(p);
            }
            for (const a of result.data.agents) {
                await this.storage.insertAgent(a);
            }
        });
    }
}
