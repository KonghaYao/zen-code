/**
 * useSkills Hook
 *
 * Manages skills state using TanStack Query + zen-core tRPC.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { useTrpc } from '../context/ZenCoreContext';

/**
 * Fetch skills list via zen-core tRPC
 */
export function useSkills({ enabled = true }: { enabled?: boolean } = {}) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: queryKeys.skills.list(),
        queryFn: () => trpc.skills.list.query(),
        enabled,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * Fetch single skill content via zen-core tRPC
 */
export function useSkill({ name, enabled = true }: { name: string; enabled?: boolean }) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: queryKeys.skills.detail(name),
        queryFn: () => trpc.skills.get.query({ name }),
        enabled: enabled && !!name,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Save skill mutation via zen-core tRPC
 */
export function useSaveSkill() {
    const trpc = useTrpc();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            name,
            content,
        }: {
            name: string;
            content: { frontmatter?: Record<string, unknown>; body: string };
        }) => trpc.skills.save.mutate({ name, content }),
        onSuccess: (_, { name }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.list() });
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.detail(name) });
        },
    });
}

/**
 * Delete skill mutation via zen-core tRPC
 */
export function useDeleteSkill() {
    const queryClient = useQueryClient();
    const trpc = useTrpc();

    return useMutation({
        mutationFn: (name: string) => trpc.skills.delete.mutate({ name }),
        onSuccess: (_, name) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.skills.list() });
            queryClient.removeQueries({ queryKey: queryKeys.skills.detail(name) });
        },
    });
}
