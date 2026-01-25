import type { Skill, SkillContent } from '../types/index.js';

/**
 * Skill 存储抽象接口
 */
export interface ISkillStore {
  /**
   * 列出所有可用的 skills
   */
  listSkills(): Promise<Skill[]>;

  /**
   * 读取特定 skill 的内容
   */
  getSkill(name: string): Promise<SkillContent | null>;

  /**
   * 保存或更新 skill
   */
  saveSkill(name: string, content: SkillContent): Promise<void>;

  /**
   * 删除 skill
   */
  deleteSkill(name: string): Promise<void>;

  /**
   * 同步从远程商店拉取 skills
   */
  syncFromRemote(remoteStore: IRemoteStore): Promise<void>;
}

/**
 * 远程商店抽象接口
 */
export interface IRemoteStore {
  /**
   * 从远程获取 skill
   */
  fetchSkill(name: string): Promise<SkillContent | null>;

  /**
   * 从远程获取插件
   */
  fetchPlugin(name: string): Promise<any>;

  /**
   * 列出远程可用的 skills
   */
  listRemoteSkills(): Promise<Skill[]>;

  /**
   * 列出远程可用的插件
   */
  listRemotePlugins(): Promise<any[]>;
}
