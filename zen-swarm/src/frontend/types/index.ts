/**
 * 前端类型定义
 * 与后端 tRPC schema 保持一致
 */

export type { PanelType } from './chat.js';

// ========================================
// Provider Types
// ========================================
export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'moonshot' | 'zhipu' | 'custom';

export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    apiKey: string; // Masked
    baseUrl: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ========================================
// Model Types
// ========================================
export interface Model {
    id: string;
    name?: string;
    provider_id: string;
    model_name: string;
    stream_usage: boolean;
    enable_thinking: boolean;
    temperature: number;
    max_tokens: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    provider?: Provider | null;
}

export type ModelInput = {
    id: string;
    name?: string;
    provider_id: string;
    model_name: string;
    stream_usage?: boolean;
    enable_thinking?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
};

export type UpdateModelInput = {
    id: string;
    name?: string;
    provider_id?: string;
    model_name?: string;
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
    change_note?: string | null; // 后端返回 null，不是 undefined
    created_at?: string;
    updated_at?: string;
    metadata?: any;
}

export interface PromptVersion {
    id: string;
    prompt_id: string;
    version: number;
    content: string;
    metadata?: string | null; // 后端返回 null，不是 undefined
    change_note?: string | null; // 后端返回 null，不是 undefined
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
// Middleware Types
// ========================================
export interface Middleware {
    id: string;
    name: string;
    description: string;
    parameters: string | null; // JSON string or null
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
    middlewares?: Record<string, boolean | any>;
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

// 卡片统计信息
export interface CardStat {
    label: string;
    value: string | number;
}
