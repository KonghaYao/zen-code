import { z } from 'zod';
import { AgentSchema } from './schemas.js';

// ============ Agent Configuration ============
export interface MiddlewareConfig {
    enabled: boolean;
    customParams?: unknown;
}

export class StandardAgent {
    private _data: z.infer<typeof AgentSchema>;

    constructor(data: z.infer<typeof AgentSchema>) {
        const result = AgentSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid Agent data: ${result.error.message}`);
        }
        this._data = result.data;
    }

    get id(): string {
        return this._data.id;
    }

    get name(): string {
        return this._data.name;
    }

    get description(): string {
        return this._data.description;
    }

    get systemPromptId(): string {
        return this._data.system_prompt;
    }

    get modelId(): string {
        return this._data.model;
    }

    get middlewares(): Record<string, MiddlewareConfig> {
        const config: Record<string, MiddlewareConfig> = {};
        for (const [midId, value] of Object.entries(this._data.middlewares)) {
            config[midId] = typeof value === 'boolean' ? { enabled: value } : { enabled: true, customParams: value };
        }
        return config;
    }

    getMiddlewareConfig(midId: string): MiddlewareConfig | undefined {
        const value = this._data.middlewares[midId];
        if (value === undefined) return undefined;
        return typeof value === 'boolean' ? { enabled: value } : { enabled: true, customParams: value };
    }

    toJSON(): z.infer<typeof AgentSchema> {
        return JSON.parse(JSON.stringify(this._data));
    }
}
