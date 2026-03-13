/**
 * useConfig Hook
 *
 * Manages configuration state using TanStack Query + zen-core tRPC.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { AppConfig } from '@codegraph/config';
import { useTrpc } from '../context/ZenCoreContext';

/**
 * Fetch configuration via zen-core tRPC
 */
export function useConfig({ enabled = true }: { enabled?: boolean } = {}) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: queryKeys.config.detail(),
        queryFn: () => trpc.config.get.query(),
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

/**
 * Update configuration via zen-core tRPC
 */
export function useUpdateConfig() {
    const trpc = useTrpc();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (newConfig: Partial<AppConfig>) => trpc.config.update.mutate(newConfig as any),
        onSuccess: (updatedConfig) => {
            queryClient.setQueryData(queryKeys.config.detail(), updatedConfig);
            queryClient.invalidateQueries({ queryKey: queryKeys.providers.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
        },
    });
}
