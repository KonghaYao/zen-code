/**
 * 配置类型定义
 */

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
