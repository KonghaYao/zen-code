/**
 * useConfig Hook
 *
 * Manages configuration state using TanStack Query.
 * Replaces manual useState + useEffect pattern in SettingsContext.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 * - Optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { AppConfig } from '@codegraph/config';
import type { ConfigManager } from '@codegraph/config';

interface UseConfigOptions {
    manager: ConfigManager;
    enabled?: boolean;
}

/**
 * Fetch configuration
 *
 * @param options - Hook options
 * @returns Query result with config data
 *
 * Example:
 * ```tsx
 * const { data: config, isLoading, error } = useConfig({ manager: configStore });
 * ```
 */
export function useConfig({ manager, enabled = true }: UseConfigOptions) {
    return useQuery({
        queryKey: queryKeys.config.detail(),
        queryFn: async () => {
            await manager.initialize();
            return await manager.getConfig();
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Update configuration
 *
 * @param options - Hook options
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const updateConfig = useUpdateConfig({ manager: configStore });
 *
 * const handleSave = async () => {
 *   await updateConfig.mutateAsync({ model_id: 'gpt-4' });
 * };
 * ```
 */
export function useUpdateConfig({ manager }: UseConfigOptions) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newConfig: Partial<AppConfig>) => {
            await manager.updateConfig(newConfig);
            return await manager.getConfig();
        },
        onSuccess: (updatedConfig) => {
            // Update config cache
            queryClient.setQueryData(queryKeys.config.detail(), updatedConfig);

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.providers.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
        },
    });
}
