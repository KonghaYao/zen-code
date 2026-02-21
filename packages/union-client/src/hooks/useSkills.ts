import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsMounted } from 'usehooks-ts';
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

    // 使用 usehooks-ts 的 useIsMounted 检查组件是否已挂载
    const isMounted = useIsMounted();

    // AbortController 引用，用于取消异步操作
    const abortControllerRef = useRef<AbortController | null>(null);

    // 加载 Skills 列表
    const loadSkills = useCallback(
        async (signal?: AbortSignal) => {
            // 检查是否已取消或组件已卸载
            if (signal?.aborted || !isMounted()) return;

            if (!manager) {
                if (signal?.aborted || !isMounted()) return;
                setLoading(false);
                return;
            }

            try {
                if (signal?.aborted || !isMounted()) return;
                setLoading(true);
                setError(null);

                const skillsList = await manager.listSkills();

                if (signal?.aborted || !isMounted()) return;
                setSkills(skillsList);
            } catch (err) {
                if (!signal?.aborted && isMounted()) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                if (!signal?.aborted && isMounted()) {
                    setLoading(false);
                }
            }
        },
        [manager, isMounted],
    );

    // 获取单个 Skill 内容
    const getSkill = useCallback(
        async (name: string, signal?: AbortSignal): Promise<SkillContent | null> => {
            // 检查是否已取消或组件已卸载
            if (signal?.aborted || !isMounted()) {
                throw new Error('Operation cancelled');
            }

            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }

            try {
                const skillContent = await manager.getSkill(name);

                if (signal?.aborted || !isMounted()) {
                    throw new Error('Operation cancelled');
                }

                return skillContent;
            } catch (err) {
                if (signal?.aborted) {
                    throw new Error('Operation cancelled');
                }
                throw new Error(`Failed to get skill "${name}": ${err instanceof Error ? err.message : String(err)}`);
            }
        },
        [manager, isMounted],
    );

    // 保存 Skill
    const saveSkill = useCallback(
        async (name: string, content: SkillContent, signal?: AbortSignal): Promise<void> => {
            // 检查是否已取消或组件已卸载
            if (signal?.aborted || !isMounted()) {
                throw new Error('Operation cancelled');
            }

            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }

            try {
                await manager.saveSkill(name, content);

                if (signal?.aborted || !isMounted()) return;
                // 保存成功后重新加载列表
                await loadSkills(signal);
            } catch (err) {
                if (signal?.aborted) {
                    throw new Error('Operation cancelled');
                }
                throw new Error(`Failed to save skill "${name}": ${err instanceof Error ? err.message : String(err)}`);
            }
        },
        [manager, isMounted, loadSkills],
    );

    // 删除 Skill
    const deleteSkill = useCallback(
        async (name: string, signal?: AbortSignal): Promise<void> => {
            // 检查是否已取消或组件已卸载
            if (signal?.aborted || !isMounted()) {
                throw new Error('Operation cancelled');
            }

            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }

            try {
                await manager.deleteSkill(name);

                if (signal?.aborted || !isMounted()) return;
                // 删除成功后重新加载列表
                await loadSkills(signal);
            } catch (err) {
                if (signal?.aborted) {
                    throw new Error('Operation cancelled');
                }
                throw new Error(
                    `Failed to delete skill "${name}": ${err instanceof Error ? err.message : String(err)}`,
                );
            }
        },
        [manager, isMounted, loadSkills],
    );

    // 初始化时加载 Skills
    useEffect(() => {
        // 创建新的 AbortController
        abortControllerRef.current = new AbortController();

        loadSkills(abortControllerRef.current.signal);

        // 清理函数
        return () => {
            // 取消进行中的异步操作
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
        };
    }, [manager, loadSkills]);

    // 组件卸载时清理 AbortController
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
        };
    }, []);

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
