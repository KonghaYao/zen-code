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
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { useChat } from '@langgraph-js/sdk/react';
/**
 * Fetch chat history list
 *
 * Wraps LangGraph SDK's useChat hook and adds TanStack Query caching.
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
export function useHistory() {
    const { historyList, refreshHistoryList, historyFilter } = useChat();

    // Create a filter-specific query key to trigger refetch when filter changes
    // Use the entire filter object as part of the key
    const filterKey = historyFilter
        ? JSON.stringify({
              metadata: historyFilter.metadata,
              status: historyFilter.status,
              sortBy: historyFilter.sortBy,
              sortOrder: historyFilter.sortOrder,
          })
        : null;

    const queryKey = filterKey ? ['history', 'list', filterKey] : queryKeys.history.list();

    return useQuery({
        queryKey,
        queryFn: async () => {
            await refreshHistoryList();
            const result = historyList;

            return result;
        },
        staleTime: 60 * 1000, // 1 minute - history changes moderately
    });
}
