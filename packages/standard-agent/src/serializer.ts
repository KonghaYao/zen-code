import { z } from 'zod';
import type { IStorage } from './storage/abstract.js';

/**
 * Extended schema for serialization (includes content)
 */
const PromptExportSchema = z.object({
    id: z.string(),
    name: z.string(),
    content: z.string(),
    change_note: z.string().optional(),
});

const AgentPackageExportSchema = z.object({
    models: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            model_name: z.string(),
            provider_id: z.string(),
            stream_usage: z.boolean(),
            enable_thinking: z.boolean(),
            temperature: z.number(),
            max_tokens: z.number(),
            top_p: z.number(),
            frequency_penalty: z.number(),
            presence_penalty: z.number(),
        }),
    ),
    prompts: z.array(PromptExportSchema),
    agents: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            system_prompt: z.string(),
            model: z.string(),
            middlewares: z.record(z.string(), z.unknown()),
        }),
    ),
});

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
    async toJSON(): Promise<z.infer<typeof AgentPackageExportSchema>> {
        const [models, prompts, agents] = await Promise.all([
            this.storage.getAllModels(),
            this.storage.getAllPromptsWithCurrentVersion(),
            this.storage.getAllAgents(),
        ]);

        return {
            models: models.map((m) => ({
                id: m.id,
                name: m.name ?? undefined,
                model_name: m.model_name,
                provider_id: m.provider_id,
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
                change_note: p.change_note || undefined,
            })),
            agents: agents.map((a) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                system_prompt: a.system_prompt_id,
                model: a.model_id,
                middlewares: a.middlewares,
            })),
        };
    }

    /**
     * Import agents, models, and prompts from JSON
     */
    async fromJSON(data: unknown): Promise<void> {
        const result = AgentPackageExportSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid AgentPackage data: ${result.error.message}`);
        }

        // Add resources in dependency order using transactions
        await this.storage.transaction(async () => {
            for (const m of result.data.models) {
                await this.storage.insertModel(m);
            }
            for (const p of result.data.prompts) {
                await this.storage.insertPrompt({ id: p.id, name: p.name }, p.content, p.change_note);
            }
            for (const a of result.data.agents) {
                await this.storage.insertAgent(a);
            }
        });
    }
}
