/**
 * useErrors Hook
 *
 * Manages errors state using TanStack Query.
 * Provides error list fetching, deletion, and clearing.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 * - Automatic refetch after mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { errorStore, type ErrorEntry } from '../services/ErrorStore';

interface UseErrorsOptions {
    /** 限制返回数量，默认 100 */
    limit?: number;
    /** 是否启用查询 */
    enabled?: boolean;
}

/**
 * Fetch errors list
 *
 * @param options - Hook options with optional limit
 * @returns Query result with errors data
 *
 * Example:
 * ```tsx
 * const { data: errors, isLoading, error } = useErrors();
 * ```
 */
export function useErrors({ limit = 100, enabled = true }: UseErrorsOptions = {}) {
    return useQuery({
        queryKey: queryKeys.errors.list(),
        queryFn: async () => {
            return errorStore.getRecentErrors(limit);
        },
        enabled,
        staleTime: 5 * 1000, // 5 seconds - errors change frequently
        refetchInterval: 5 * 1000, // Auto refetch every 5 seconds
    });
}

/**
 * Fetch error statistics
 *
 * @returns Query result with error stats
 *
 * Example:
 * ```tsx
 * const { data: stats } = useErrorStats();
 * ```
 */
export function useErrorStats() {
    return useQuery({
        queryKey: queryKeys.errors.stats(),
        queryFn: async () => {
            return errorStore.getStats();
        },
        staleTime: 5 * 1000,
        refetchInterval: 5 * 1000,
    });
}

/**
 * Delete single error mutation
 *
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const deleteError = useDeleteError();
 *
 * const handleDelete = async (errorId: string) => {
 *   await deleteError.mutateAsync(errorId);
 * };
 * ```
 */
export function useDeleteError() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (errorId: string) => {
            return errorStore.deleteError(errorId);
        },
        onSuccess: () => {
            // Invalidate all error queries
            queryClient.invalidateQueries({ queryKey: queryKeys.errors.all });
        },
    });
}

/**
 * Clear all errors mutation
 *
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const clearErrors = useClearErrors();
 *
 * const handleClear = async () => {
 *   await clearErrors.mutateAsync();
 * };
 * ```
 */
export function useClearErrors() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<void> => {
            errorStore.clearAll();
        },
        onSuccess: () => {
            // Invalidate all error queries
            queryClient.invalidateQueries({ queryKey: queryKeys.errors.all });
        },
    });
}

export type { ErrorEntry };
