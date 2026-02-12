import { PermissionAction } from '../permission/types';

/**
 * 配置类型定义
 */

// Task System types
export * from './task';

// ============================================================================
// Tool Types
// ============================================================================

/**
 * 工具调用参数类型
 * 统一项目中工具参数的类型声明
 */
export type ToolArgs = Record<string, unknown>;

/**
 * Provider 配置
 */
export interface ProviderConfig {
    /** Provider 唯一标识 */
    id: string;
    /** Provider 类型 */
    type: string;
    /** API 密钥 */
    apiKey: string;
    /** API 基础 URL */
    baseUrl: string;
}

/**
 * 应用配置
 */
/**
 * 应用配置
 */
export interface AppConfig {
    /** 当前使用的 Provider ID */
    provider_id: string;
    provider_type: string;
    /** 当前使用的模型 ID */
    model_id: string;
    /** Providers 配置数组 */
    providers: ProviderConfig[];
    /** MCP 配置 */
    mcp_config?: MCPConfig;
    /** 流刷新间隔 */
    stream_refresh_interval?: number;
    /** 是否启用思考模式 */
    enable_thinking?: boolean;
    /** 切换命令 */
    switch_command?: string;
    /** 紧凑模式 */
    compact_mode?: boolean;
    /** 权限配置 */
    permissions?: PermissionConfig;
}

/**
 * 旧版本配置格式（用于迁移）
 */
export interface LegacyAppConfig {
    main_model: string;
    model_provider?: 'openai' | 'anthropic';
    openai_api_key?: string;
    openai_base_url?: string;
    anthropic_api_key?: string;
    anthropic_base_url?: string;
    mcp_config?: MCPConfig;
    stream_refresh_interval?: number;
    enable_thinking?: boolean;
    switch_command?: string;
    compact_mode?: boolean;
    permissions?: PermissionConfig;
}

/**
 * Permission control configuration for tool calls
 */
export interface PermissionConfig {
    /** Rules that allow tool use without confirmation */
    allow?: string[];
    /** Rules that require user confirmation before execution */
    ask?: string[];
    /** Rules that deny tool use completely */
    deny?: string[];
    /** Default permission mode: 'ask' (default), 'allow', or 'deny' */
    defaultMode?: PermissionAction;
}

export interface MCPConfig {
    [key: string]: any;
}

export interface Skill {
    name: string;
    description: string;
    path: string;
}

export interface SkillContent {
    frontmatter: Record<string, any>;
    markdown: string;
}

export interface Plugin {
    name: string;
    version: string;
    enabled: boolean;
}

export interface PluginConfig {
    [key: string]: any;
}

export interface PluginSource {
    type: 'npm' | 'git' | 'local';
    url?: string;
    path?: string;
}

export interface PluginPackage {
    name: string;
    version: string;
    description: string;
    config?: PluginConfig;
}

export interface RemoteStoreConfig {
    baseUrl: string;
    apiKey?: string;
}
