import { useState, useEffect, useCallback } from 'react';
import type { Skill, SkillContent } from '@codegraph/config';
import type { ConfigManager } from '@codegraph/config';

/**
 * useSkills Hook - 使用 ConfigManager 管理 Skills
 *
 * @example
 * const { skills, loading, error, getSkill, saveSkill, deleteSkill } = useSkills(manager);
 */
export function useSkills(manager: ConfigManager | null) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载 Skills 列表
  const loadSkills = useCallback(async () => {
    if (!manager) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const skillsList = await manager.listSkills();
      setSkills(skillsList);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [manager]);

  // 获取单个 Skill 内容
  const getSkill = useCallback(async (name: string): Promise<SkillContent | null> => {
    if (!manager) {
      throw new Error('ConfigManager not initialized');
    }

    try {
      return await manager.getSkill(name);
    } catch (err) {
      throw new Error(`Failed to get skill "${name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [manager]);

  // 保存 Skill
  const saveSkill = useCallback(async (name: string, content: SkillContent): Promise<void> => {
    if (!manager) {
      throw new Error('ConfigManager not initialized');
    }

    try {
      await manager.saveSkill(name, content);
      // 保存成功后重新加载列表
      await loadSkills();
    } catch (err) {
      throw new Error(`Failed to save skill "${name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [manager, loadSkills]);

  // 删除 Skill
  const deleteSkill = useCallback(async (name: string): Promise<void> => {
    if (!manager) {
      throw new Error('ConfigManager not initialized');
    }

    try {
      await manager.deleteSkill(name);
      // 删除成功后重新加载列表
      await loadSkills();
    } catch (err) {
      throw new Error(`Failed to delete skill "${name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [manager, loadSkills]);

  // 初始化时加载 Skills
  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  return {
    skills,
    loading,
    error,
    getSkill,
    saveSkill,
    deleteSkill,
    refresh: loadSkills,
  };
}
