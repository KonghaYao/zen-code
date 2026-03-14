/**
 * Postman Hooks
 * Uses apiClient (same pattern as useSM / useStore for runtime-added routers)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api.js';

// Type cast for postman router (added at runtime by zen-core)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const postmanApi = (apiClient as any).postman;

// ========================================
// Query Keys
// ========================================

export const postmanKeys = {
    all: ['postman'] as const,
    collections: () => [...postmanKeys.all, 'collections'] as const,
    requests: (collectionId: string) => [...postmanKeys.all, 'requests', collectionId] as const,
    environments: () => [...postmanKeys.all, 'environments'] as const,
    activeEnv: () => [...postmanKeys.all, 'activeEnv'] as const,
    history: (limit?: number) => [...postmanKeys.all, 'history', limit] as const,
    historyEntry: (id: string) => [...postmanKeys.all, 'historyEntry', id] as const,
};

// ========================================
// Collections
// ========================================

export function useCollections() {
    return useQuery({
        queryKey: postmanKeys.collections(),
        queryFn: () => postmanApi.listCollections.query(),
    });
}

export function useCreateCollection() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string; name: string; description?: string }) =>
            postmanApi.createCollection.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.collections() }),
    });
}

export function useUpdateCollection() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string; name?: string; description?: string }) =>
            postmanApi.updateCollection.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.collections() }),
    });
}

export function useDeleteCollection() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string }) => postmanApi.deleteCollection.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.collections() }),
    });
}

// ========================================
// Requests
// ========================================

export function useRequests(collectionId: string) {
    return useQuery({
        queryKey: postmanKeys.requests(collectionId),
        queryFn: () => postmanApi.listRequests.query({ collection_id: collectionId }),
    });
}

export function useCreateRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => postmanApi.createRequest.mutate(input),
        onSuccess: (_data: any, vars: any) =>
            qc.invalidateQueries({ queryKey: postmanKeys.requests(vars.collection_id) }),
    });
}

export function useUpdateRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => postmanApi.updateRequest.mutate(input),
        onSuccess: (_data: any, vars: any) => {
            // We don't know collection_id from update, so invalidate all request lists
            qc.invalidateQueries({ queryKey: postmanKeys.all });
        },
    });
}

export function useDeleteRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string }) => postmanApi.deleteRequest.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.all }),
    });
}

// ========================================
// Environments
// ========================================

export function useEnvironments() {
    return useQuery({
        queryKey: postmanKeys.environments(),
        queryFn: () => postmanApi.listEnvironments.query(),
    });
}

export function useActiveEnvironment() {
    return useQuery({
        queryKey: postmanKeys.activeEnv(),
        queryFn: () => postmanApi.getActiveEnvironment.query(),
    });
}

export function useCreateEnvironment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => postmanApi.createEnvironment.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.environments() }),
    });
}

export function useUpdateEnvironment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => postmanApi.updateEnvironment.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.environments() }),
    });
}

export function useSetActiveEnvironment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string }) => postmanApi.setActiveEnvironment.mutate(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: postmanKeys.environments() });
            qc.invalidateQueries({ queryKey: postmanKeys.activeEnv() });
        },
    });
}

export function useDeleteEnvironment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string }) => postmanApi.deleteEnvironment.mutate(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: postmanKeys.environments() });
            qc.invalidateQueries({ queryKey: postmanKeys.activeEnv() });
        },
    });
}

// ========================================
// History
// ========================================

export function useHistory(limit = 50) {
    return useQuery({
        queryKey: postmanKeys.history(limit),
        queryFn: () => postmanApi.listHistory.query({ limit }),
    });
}

export function useClearHistory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input?: { before?: string }) => postmanApi.clearHistory.mutate(input ?? {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.history() }),
    });
}

export function useDeleteHistoryEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string }) => postmanApi.deleteHistoryEntry.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.history() }),
    });
}

// ========================================
// Send
// ========================================

export function useSendRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: any) => postmanApi.send.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: postmanKeys.history() }),
    });
}
