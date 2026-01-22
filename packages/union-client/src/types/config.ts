/**
 * 配置相关类型定义
 * 从 @codegraph/config 重新导出
 */

export type {
  AppConfig,
  MCPConfig,
  Skill,
  SkillContent,
  Plugin,
  PluginConfig,
  PluginSource,
  PluginPackage,
} from '@codegraph/config';

export interface UseConfigReturn {
  config: AppConfig | null;
  loading: boolean;
  error: Error | null;
  updateConfig: (updates: Partial<AppConfig>) => Promise<AppConfig>;
}

export interface UseSkillsReturn {
  skills: Skill[];
  loading: boolean;
  error: Error | null;
  getSkill: (name: string) => Promise<SkillContent | null>;
  saveSkill: (name: string, content: SkillContent) => Promise<void>;
  deleteSkill: (name: string) => Promise<void>;
}

export interface UsePluginsReturn {
  plugins: Plugin[];
  loading: boolean;
  error: Error | null;
  installPlugin: (name: string, source: PluginSource) => Promise<void>;
  uninstallPlugin: (name: string) => Promise<void>;
  updatePluginConfig: (name: string, config: PluginConfig) => Promise<void>;
}
