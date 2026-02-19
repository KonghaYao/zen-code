/**
 * 前端类型定义
 * 与后端 tRPC schema 保持一致
 */

export type { PanelType } from './chat.js';

// ========================================
// Model Types
// ========================================
export interface Model {
    id: string;
    model_name: string;
    model_provider: string;
    stream_usage: boolean;
    enable_thinking: boolean;
    temperature: number;
    max_tokens: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
}

export type ModelInput = {
    id: string;
    model_name: string;
    model_provider: string;
    stream_usage?: boolean;
    enable_thinking?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
};

export type UpdateModelInput = Omit<ModelInput, 'id'> & {
    id: string;
    // 所有字段都是可选的，除了 id
    model_name?: string;
    model_provider?: string;
    stream_usage?: boolean;
    enable_thinking?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
};

// ========================================
// Prompt Types
// ========================================
export interface Prompt {
    id: string;
    name: string;
    current_version: number;
    description?: string;
    content: string;
    change_note?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PromptVersion {
    id: string;
    prompt_id: string;
    version: number;
    content: string;
    metadata?: string;
    change_note?: string;
    created_at: string;
}

export type PromptInput = {
    id: string;
    name: string;
    content: string;
    description?: string;
    change_note?: string;
};
export type UpdatePromptInput = Partial<PromptInput> & { id: string };
export type CreateVersionInput = {
    promptId: string;
    content: string;
    changeNote?: string;
};

// ========================================
// Tool Types
// ========================================
export interface Tool {
    id: string;
    name: string;
    description: string;
    schema: string; // JSON string
    parameters: string | null; // JSON string or null
    created_at?: string;
    updated_at?: string;
}

export type ToolInput = Omit<Tool, 'created_at' | 'updated_at'>;
export type UpdateToolInput = Partial<ToolInput> & { id: string };

// ========================================
// Middleware Types
// ========================================
export interface Middleware {
    id: string;
    name: string;
    description: string;
    priority: number;
    config: string; // JSON string
    created_at?: string;
    updated_at?: string;
}

export type MiddlewareInput = Omit<Middleware, 'created_at' | 'updated_at'>;
export type UpdateMiddlewareInput = Partial<MiddlewareInput> & { id: string };

// ========================================
// Agent Types
// ========================================
export interface Agent {
    id: string;
    name: string;
    description: string;
    system_prompt: string; // Prompt ID
    model: string; // Model ID
    tools: Record<string, boolean | any>;
    middlewares: Record<string, boolean | any>;
    created_at?: string;
    updated_at?: string;
}

export interface AgentWithDependencies extends Agent {
    modelInfo?: Model;
    promptInfo?: Prompt;
}

export type AgentInput = {
    id: string;
    name: string;
    description: string;
    system_prompt: string;
    model: string;
    tools?: Record<string, boolean | any>;
    middleware?: Record<string, boolean | any>;
};

export type UpdateAgentInput = Partial<AgentInput> & { id: string };

// ========================================
// MCP Types
// ========================================
export interface MCPServer {
    id: string;
    name: string;
    config: Record<string, any>; // MCP server configuration
    enabled: boolean;
    created_at?: string;
    updated_at?: string;
}

// Helper type for accessing config fields
export interface McpServerConfig {
    name: string;
    type: 'stdio' | 'http' | 'ws';
    command?: string;
    args?: string[];
    url?: string;
    env?: Record<string, string>;
    enabled?: boolean;
}

export type MCPServerInput = MCPServer;
export type UpdateMCPServerInput = Partial<MCPServerInput> & { id: string };

// ========================================
// Skill Types
// ========================================
export interface Skill {
    name: string;
    description: string;
    path: string;
    source: 'user' | 'project';
    license?: string;
    compatibility?: string;
    metadata?: Record<string, string>;
    allowed_tools?: string;
}

// ========================================
// UI Types
// ========================================
export interface Tab {
    id: string;
    label: string;
    icon: string;
}
