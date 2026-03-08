/**
 * useHistory Hook
 *
 * Manages chat history state using TanStack Query.
 * Wraps LangGraph SDK's useChat hook for better caching and error handling.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 * - Integration with LangGraph SDK
 * - Filter support with automatic sync
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { useChat } from '@langgraph-js/sdk/react';

export interface HistoryFilter {
    metadata?: Record<string, string>;
    status?: 'idle' | 'busy' | 'interrupted' | 'error' | null;
    sortBy?: 'thread_id' | 'status' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch chat history list
 *
 * Wraps LangGraph SDK's useChat hook and adds TanStack Query caching.
 * Automatically syncs filter to useChat's internal state.
 *
 * @param filter Optional history filter to apply
 * @returns Query result with history data
 *
 * Example:
 * ```tsx
 * const { data: historyList, isLoading, error } = useHistory();
 * const { data: filteredHistory } = useHistory({ metadata: { path: '/some/path' } });
 * ```
 */
export function useHistory(filter?: HistoryFilter) {
    const { historyList, refreshHistoryList, setHistoryFilter } = useChat();

    // Create a filter-specific query key to trigger refetch when filter changes
    const filterKey = filter ? JSON.stringify(filter) : null;
    const queryKey = filterKey ? ['history', 'list', filterKey] : queryKeys.history.list();

    return useQuery({
        queryKey,
        queryFn: async () => {
            // Set filter before refreshing to ensure first load has correct filter
            if (filter) {
                setHistoryFilter(filter);
            }
            await refreshHistoryList();
            return historyList;
        },
        staleTime: 60 * 1000, // 1 minute - history changes moderately
    });
}
