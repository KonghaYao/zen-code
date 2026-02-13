/**
 * useSkills Hook
 *
 * Manages skills state using TanStack Query.
 * Replaces manual useState + useEffect pattern in useSkills hook.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 * - Automatic refetch after mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { Skill, SkillContent } from '@codegraph/config';
import type { ConfigManager } from '@codegraph/config';

interface UseSkillsOptions {
    manager: ConfigManager | null;
    enabled?: boolean;
}

/**
 * Fetch skills list
 *
 * @param options - Hook options
 * @returns Query result with skills data
 *
 * Example:
 * ```tsx
 * const { data: skills, isLoading, error } = useSkills({ manager: configStore });
 * ```
 */
export function useSkills({ manager, enabled = true }: UseSkillsOptions) {
    return useQuery({
        queryKey: queryKeys.skills.list(),
        queryFn: async () => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            return await manager.listSkills();
        },
        enabled: enabled && !!manager,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Fetch single skill content
 *
 * @param options - Hook options with skill name
 * @returns Query result with skill data
 *
 * Example:
 * ```tsx
 * const { data: skill, isLoading } = useSkill({
 *   manager: configStore,
 *   name: 'brainstorming'
 * });
 * ```
 */
export function useSkill({ manager, name, enabled = true }: UseSkillsOptions & { name: string }) {
    return useQuery({
        queryKey: queryKeys.skills.detail(name),
        queryFn: async () => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            return await manager.getSkill(name);
        },
        enabled: enabled && !!manager && !!name,
        staleTime: 5 * 60 * 1000, // 5 minutes - skill content doesn't change often
    });
}

/**
 * Save skill mutation
 *
 * @param options - Hook options
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const saveSkill = useSaveSkill({ manager: configStore });
 *
 * const handleSave = async (content: SkillContent) => {
 *   await saveSkill.mutateAsync({ name: 'my-skill', content });
 * };
 * ```
 */
export function useSaveSkill({ manager }: { manager: ConfigManager | null }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name, content }: { name: string; content: SkillContent }) => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            await manager.saveSkill(name, content);
        },
        onSuccess: (_, { name }) => {
            // Invalidate skills list
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.list() });

            // Invalidate specific skill cache
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.detail(name) });
        },
    });
}

/**
 * Delete skill mutation
 *
 * @param options - Hook options
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const deleteSkill = useDeleteSkill({ manager: configStore });
 *
 * const handleDelete = async (name: string) => {
 *   await deleteSkill.mutateAsync(name);
 * };
 * ```
 */
export function useDeleteSkill({ manager }: { manager: ConfigManager | null }) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (name: string) => {
            if (!manager) {
                throw new Error('ConfigManager not initialized');
            }
            await manager.deleteSkill(name);
        },
        onSuccess: (_, name) => {
            // Invalidate skills list
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.list() });

            // Remove specific skill from cache
            queryClient.removeQueries({ queryKey: queryKeys.skills.detail(name) });
        },
    });
}
