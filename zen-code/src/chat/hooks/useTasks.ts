/**
 * useTasks Hook
 *
 * Manages tasks state using TanStack Query.
 * Replaces manual useState + useEffect pattern in TaskPanel.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 * - Automatic refetch after mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { TaskNode, TaskStatus } from '@codegraph/config';

interface UseTasksOptions {
    filter?: TaskStatus;
    enabled?: boolean;
}

/**
 * Fetch tasks list
 *
 * @param options - Hook options with optional status filter
 * @returns Query result with tasks data
 *
 * Example:
 * ```tsx
 * const { data: tasks, isLoading, error } = useTasks();
 * ```
 */
export function useTasks({ filter, enabled = true }: UseTasksOptions) {
    return useQuery({
        queryKey: queryKeys.tasks.list(filter),
        queryFn: async () => {
            const { getTasksStore } = await import('@codegraph/config');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();

            if (filter) {
                return await tasksStore.getTasksByStatus(filter);
            }

            return await tasksStore.getAllTasks();
        },
        enabled,
        staleTime: 30 * 1000, // 30 seconds - tasks change frequently
    });
}

/**
 * Fetch single task
 *
 * @param taskId - Task ID
 * @returns Query result with task data
 *
 * Example:
 * ```tsx
 * const { data: task, isLoading } = useTask('task-123');
 * ```
 */
export function useTask(taskId: string) {
    return useQuery({
        queryKey: queryKeys.tasks.detail(taskId),
        queryFn: async () => {
            const { getTasksStore } = await import('@codegraph/config');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();
            return await tasksStore.getTask(taskId);
        },
        enabled: !!taskId,
        staleTime: 30 * 1000,
    });
}

/**
 * Delete task mutation
 *
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const deleteTask = useDeleteTask();
 *
 * const handleDelete = async (taskId: string) => {
 *   await deleteTask.mutateAsync(taskId);
 * };
 * ```
 */
export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (taskId: string) => {
            const { getTasksStore } = await import('@codegraph/config');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();
            return await tasksStore.deleteTask(taskId);
        },
        onSuccess: (_, taskId) => {
            // Invalidate all task queries
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

            // Remove specific task from cache
            queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });
        },
    });
}

/**
 * Update task status mutation
 *
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const updateTaskStatus = useUpdateTaskStatus();
 *
 * const handleStatusChange = async (taskId: string, status: TaskStatus) => {
 *   await updateTaskStatus.mutateAsync({ taskId, status });
 * };
 * ```
 */
export function useUpdateTaskStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
            const { getTasksStore } = await import('@codegraph/config');
            const tasksStore = getTasksStore(process.cwd());
            await tasksStore.initialize();
            return await tasksStore.updateTask(taskId, { status });
        },
        onSuccess: (_, { taskId }) => {
            // Invalidate all task queries
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

            // Invalidate specific task cache
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
        },
    });
}
