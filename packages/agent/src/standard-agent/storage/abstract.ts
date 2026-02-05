/**
 * Storage Abstraction Layer
 *
 * Defines the interface for storage implementations. All storage backends
 * (SQLite, PostgreSQL, MySQL, MongoDB, Redis, Memory, etc.) must implement
 * this interface.
 *
 * @example
 * ```typescript
 * // Memory Storage (in-memory)
 * const memoryStorage = new MemoryStorage();
 *
 * // SQLite Storage
 * const sqliteStorage = new AgentStorage('./agents.db');
 *
 * // Custom Storage
 * class CustomStorage implements IStorage { ... }
 * const customStorage = new CustomStorage();
 * ```
 */

import { z } from 'zod';
import { ModelSchema, PromptSchema, ToolSchema, MiddlewareSchema, AgentSchema } from '../index.js';

// ========================================
// Shared Types
// ========================================

export interface ModelRow {
    id: string;
    model_name: string;
    model_provider: string;
    stream_usage: number;
    enable_thinking: number;
    temperature: number;
    max_tokens: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    created_at: string;
    updated_at: string;
}

export interface PromptRow {
    id: string;
    name: string;
    content: string;
    metadata: string | null;
    created_at: string;
    updated_at: string;
}

export interface ToolRow {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface MiddlewareRow {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface AgentRow {
    id: string;
    name: string;
    description: string;
    system_prompt_id: string;
    model_id: string;
    created_at: string;
    updated_at: string;
}

export interface AgentToolRow {
    agent_id: string;
    tool_id: string;
    enabled: number;
    custom_params: string | null;
}

export interface AgentMiddlewareRow {
    agent_id: string;
    middleware_id: string;
    enabled: number;
    custom_params: string | null;
}

export interface AgentWithRelations {
    agent: AgentRow;
    model: ModelRow;
    systemPrompt: PromptRow;
    tools: (ToolRow & { enabled: boolean; customParams: any })[];
    middlewares: (MiddlewareRow & { enabled: boolean; customParams: any })[];
}

// ========================================
// Storage Interface
// ========================================

export interface IStorage {
    // ========================================
    // Lifecycle
    // ========================================
    /**
     * Initialize the storage backend (create tables, indexes, etc.)
     */
    initialize?(): Promise<void> | void;

    /**
     * Close the storage connection
     */
    close(): Promise<void>;

    // ========================================
    // Transactions
    // ========================================
    /**
     * Execute a transaction. If the callback throws, the transaction is rolled back.
     */
    transaction<T>(fn: () => T | Promise<T>): Promise<T>;

    // ========================================
    // Models
    // ========================================
    insertModel(data: z.infer<typeof ModelSchema>): Promise<void>;
    getModel(id: string): Promise<ModelRow | undefined>;
    getAllModels(): Promise<ModelRow[]>;
    updateModel(data: z.infer<typeof ModelSchema>): Promise<void>;
    deleteModel(id: string): Promise<void>;

    // ========================================
    // Prompts
    // ========================================
    insertPrompt(data: z.infer<typeof PromptSchema>): Promise<void>;
    getPrompt(id: string): Promise<PromptRow | undefined>;
    getPromptByName(name: string): Promise<PromptRow | undefined>;
    getAllPrompts(): Promise<PromptRow[]>;
    updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void>;
    deletePrompt(id: string): Promise<void>;

    // ========================================
    // Tools
    // ========================================
    insertTool(data: z.infer<typeof ToolSchema>): Promise<void>;
    getTool(id: string): Promise<ToolRow | undefined>;
    getAllTools(): Promise<ToolRow[]>;
    updateTool(data: z.infer<typeof ToolSchema>): Promise<void>;
    deleteTool(id: string): Promise<void>;

    // ========================================
    // Middlewares
    // ========================================
    insertMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void>;
    getMiddleware(id: string): Promise<MiddlewareRow | undefined>;
    getAllMiddlewares(): Promise<MiddlewareRow[]>;
    updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void>;
    deleteMiddleware(id: string): Promise<void>;

    // ========================================
    // Agents
    // ========================================
    insertAgent(data: z.infer<typeof AgentSchema>): Promise<void>;
    getAgent(id: string): Promise<
        | (AgentRow & {
              tools: Record<string, boolean | any>;
              middlewares: Record<string, boolean | any>;
          })
        | undefined
    >;
    getAllAgents(): Promise<
        (AgentRow & { tools: Record<string, boolean | any>; middlewares: Record<string, boolean | any> })[]
    >;
    updateAgent(data: z.infer<typeof AgentSchema>): Promise<void>;
    deleteAgent(id: string): Promise<void>;

    // ========================================
    // Query Helpers
    // ========================================
    getAgentWithDependencies(id: string): Promise<AgentWithRelations | undefined>;
}

// ========================================
// Base Storage Class (for convenience)
// ========================================

/**
 * Base class that provides common utilities for storage implementations.
 * Implementations can extend this class to get helper methods.
 */
export abstract class BaseStorage implements IStorage {
    /**
     * Get current timestamp in ISO format
     */
    protected now(): string {
        return new Date().toISOString();
    }

    /**
     * Convert boolean to integer (1/0)
     */
    protected boolToInt(value: boolean): number {
        return value ? 1 : 0;
    }

    /**
     * Convert integer to boolean
     */
    protected intToBool(value: number): boolean {
        return value === 1;
    }

    /**
     * Convert any value to JSON string safely
     */
    protected safeStringify(value: any): string | null {
        if (value === null || value === undefined) return null;
        return JSON.stringify(value);
    }

    /**
     * Parse JSON string safely
     */
    protected safeParse<T>(value: string | null): T | null {
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    // Abstract methods that must be implemented
    abstract initialize?(): Promise<void> | void;
    abstract close(): Promise<void>;
    abstract transaction<T>(fn: () => T | Promise<T>): Promise<T>;
    abstract insertModel(data: z.infer<typeof ModelSchema>): Promise<void>;
    abstract getModel(id: string): Promise<ModelRow | undefined>;
    abstract getAllModels(): Promise<ModelRow[]>;
    abstract updateModel(data: z.infer<typeof ModelSchema>): Promise<void>;
    abstract deleteModel(id: string): Promise<void>;
    abstract insertPrompt(data: z.infer<typeof PromptSchema>): Promise<void>;
    abstract getPrompt(id: string): Promise<PromptRow | undefined>;
    abstract getPromptByName(name: string): Promise<PromptRow | undefined>;
    abstract getAllPrompts(): Promise<PromptRow[]>;
    abstract updatePrompt(data: z.infer<typeof PromptSchema>): Promise<void>;
    abstract deletePrompt(id: string): Promise<void>;
    abstract insertTool(data: z.infer<typeof ToolSchema>): Promise<void>;
    abstract getTool(id: string): Promise<ToolRow | undefined>;
    abstract getAllTools(): Promise<ToolRow[]>;
    abstract updateTool(data: z.infer<typeof ToolSchema>): Promise<void>;
    abstract deleteTool(id: string): Promise<void>;
    abstract insertMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void>;
    abstract getMiddleware(id: string): Promise<MiddlewareRow | undefined>;
    abstract getAllMiddlewares(): Promise<MiddlewareRow[]>;
    abstract updateMiddleware(data: z.infer<typeof MiddlewareSchema>): Promise<void>;
    abstract deleteMiddleware(id: string): Promise<void>;
    abstract insertAgent(data: z.infer<typeof AgentSchema>): Promise<void>;
    abstract getAgent(id: string): Promise<
        | (AgentRow & {
              tools: Record<string, boolean | any>;
              middlewares: Record<string, boolean | any>;
          })
        | undefined
    >;
    abstract getAllAgents(): Promise<
        (AgentRow & { tools: Record<string, boolean | any>; middlewares: Record<string, boolean | any> })[]
    >;
    abstract updateAgent(data: z.infer<typeof AgentSchema>): Promise<void>;
    abstract deleteAgent(id: string): Promise<void>;
    abstract getAgentWithDependencies(id: string): Promise<AgentWithRelations | undefined>;
}
