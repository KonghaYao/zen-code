/**
 * useProviders Hook
 *
 * Manages providers list via zen-core tRPC.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { useTrpc } from '../context/ZenCoreContext';

/**
 * Fetch providers list via zen-core tRPC
 */
export function useProviders({ enabled = true }: { enabled?: boolean } = {}) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: queryKeys.providers.list(),
        queryFn: () => trpc.providers.list.query(),
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}
