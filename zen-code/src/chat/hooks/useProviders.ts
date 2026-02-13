/**
 * useProviders Hook
 *
 * Manages providers list extracted from config.
 * Derives from config data using TanStack Query.
 *
 * Features:
 * - Automatic loading state
 * - Derived from config query
 * - Cache management
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { ConfigManager } from '@codegraph/config';
import { useConfig } from './useConfig';

interface UseProvidersOptions {
    manager: ConfigManager;
    enabled?: boolean;
}

/**
 * Fetch providers list from config
 *
 * Derives providers from config data. This is a derived query that
 * depends on the config query.
 *
 * @param options - Hook options
 * @returns Query result with providers data
 *
 * Example:
 * ```tsx
 * const { data: providers, isLoading } = useProviders({ manager: configStore });
 * ```
 */
export function useProviders({ manager, enabled = true }: UseProvidersOptions) {
    const { data: config } = useConfig({ manager, enabled });

    return useQuery({
        queryKey: queryKeys.providers.list(),
        queryFn: () => {
            return config?.providers || [];
        },
        enabled: enabled && !!config,
        staleTime: Infinity, // Derive from config, don't refetch independently
    });
}
