import { z } from 'zod';
import { ModelSchema, PromptSchema, ToolSchema, MiddlewareSchema } from './index.js';

// ============ Base Entity ============
export abstract class Entity<T extends z.ZodType> {
    protected _data: z.infer<T>;

    constructor(schema: T, data: z.infer<T>) {
        const result = schema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid ${this.constructor.name} data: ${result.error.message}`);
        }
        this._data = result.data;
    }

    get id(): string {
        return (this._data as any).id;
    }

    get name(): string {
        return (this._data as any).name;
    }

    get data(): Readonly<z.infer<T>> {
        return this._data as Readonly<z.infer<T>>;
    }

    toJSON(): z.infer<T> {
        return JSON.parse(JSON.stringify(this._data));
    }
}

// ============ Resource Entities ============
export class Model extends Entity<typeof ModelSchema> {
    constructor(data: z.infer<typeof ModelSchema>) {
        super(ModelSchema, data);
    }

    get modelName(): string {
        return this._data.model_name;
    }

    get provider(): string {
        return this._data.model_provider;
    }

    get streamUsage(): boolean {
        return this._data.stream_usage;
    }

    get enableThinking(): boolean {
        return this._data.enable_thinking;
    }

    get temperature(): number {
        return this._data.temperature;
    }

    get maxTokens(): number {
        return this._data.max_tokens;
    }

    get topP(): number {
        return this._data.top_p;
    }

    get frequencyPenalty(): number {
        return this._data.frequency_penalty;
    }

    get presencePenalty(): number {
        return this._data.presence_penalty;
    }
}

export class Prompt extends Entity<typeof PromptSchema> {
    constructor(data: z.infer<typeof PromptSchema>) {
        super(PromptSchema, data);
    }

    get content(): string {
        return this._data.content;
    }

    get metadata(): unknown | undefined {
        return this._data.metadata;
    }
}

export class Tool extends Entity<typeof ToolSchema> {
    constructor(data: z.infer<typeof ToolSchema>) {
        super(ToolSchema, data);
    }

    get description(): string {
        return this._data.description;
    }
}

export class Middleware extends Entity<typeof MiddlewareSchema> {
    constructor(data: z.infer<typeof MiddlewareSchema>) {
        super(MiddlewareSchema, data);
    }

    get description(): string {
        return this._data.description;
    }
}
