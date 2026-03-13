/**
 * useTasks Hook
 *
 * Manages tasks state using TanStack Query + zen-core tRPC.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { useTrpc } from '../context/ZenCoreContext';
import type { TaskStatus } from '@codegraph/config';

interface UseTasksOptions {
    filter?: TaskStatus;
    enabled?: boolean;
}

/**
 * Fetch tasks list via zen-core tRPC
 */
export function useTasks({ filter, enabled = true }: UseTasksOptions = {}) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: queryKeys.tasks.list(filter),
        queryFn: () => trpc.tasks.list.query(filter ? { filter } : undefined),
        enabled,
        staleTime: 30 * 1000,
    });
}

/**
 * Fetch single task via zen-core tRPC
 */
export function useTask(taskId: string) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: queryKeys.tasks.detail(taskId),
        queryFn: () => trpc.tasks.get.query({ id: taskId }),
        enabled: !!taskId,
        staleTime: 30 * 1000,
    });
}

/**
 * Delete task mutation via zen-core tRPC
 */
export function useDeleteTask() {
    const trpc = useTrpc();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (taskId: string) => trpc.tasks.delete.mutate({ id: taskId }),
        onSuccess: (_, taskId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
            queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });
        },
    });
}

/**
 * Update task status mutation via zen-core tRPC
 */
export function useUpdateTaskStatus() {
    const trpc = useTrpc();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
            trpc.tasks.updateStatus.mutate({ id: taskId, status }),
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
        },
    });
}
