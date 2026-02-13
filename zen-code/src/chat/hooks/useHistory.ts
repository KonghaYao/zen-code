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
 * @returns Query result with history data
 *
 * Example:
 * ```tsx
 * const { data: historyList, isLoading, error } = useHistory();
 * ```
 */
export function useHistory() {
    const { historyList, refreshHistoryList } = useChat();

    return useQuery({
        queryKey: queryKeys.history.list(),
        queryFn: async () => {
            await refreshHistoryList();
            return historyList;
        },
        staleTime: 60 * 1000, // 1 minute - history changes moderately
    });
}
