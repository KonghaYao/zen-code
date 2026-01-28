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

export interface AppConfig {
  main_model: string;
  model_provider?: 'openai' | 'anthropic';
  mcp_config?: MCPConfig;
  openai_api_key?: string;
  openai_base_url?: string;
  anthropic_api_key?: string;
  anthropic_base_url?: string;
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
