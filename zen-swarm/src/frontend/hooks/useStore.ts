/**
 * Remote Store Hooks
 *
 * React hooks for remote store management using tRPC
 * (store router is added at runtime by server)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api.js';

// Store API client with type assertion (store router is added at runtime by server)
const storeApi = (apiClient as any).store;

// ========================================
// Query Keys
// ========================================

export const storeKeys = {
    all: ['store'] as const,
    stores: () => [...storeKeys.all, 'stores'] as const,
    remotePrompts: (storeId: string, page?: number) => [...storeKeys.all, 'remotePrompts', storeId, page] as const,
    searchPrompts: (storeId: string, query: string) => [...storeKeys.all, 'searchPrompts', storeId, query] as const,
    remoteSkills: (storeId: string, page?: number) => [...storeKeys.all, 'remoteSkills', storeId, page] as const,
    searchSkills: (storeId: string, query: string) => [...storeKeys.all, 'searchSkills', storeId, query] as const,
};

// ========================================
// Store Config Hooks
// ========================================

export function useStores() {
    return useQuery({
        queryKey: storeKeys.stores(),
        queryFn: () => storeApi.listStores.query(),
    });
}

export function useAddStore() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id?: string; name: string; base_url: string; api_key?: string; enabled?: boolean }) =>
            storeApi.addStore.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: storeKeys.stores() }),
    });
}

export function useUpdateStore() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { id: string; name?: string; base_url?: string; api_key?: string; enabled?: boolean }) =>
            storeApi.updateStore.mutate(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: storeKeys.stores() }),
    });
}

export function useDeleteStore() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => storeApi.deleteStore.mutate({ id }),
        onSuccess: () => qc.invalidateQueries({ queryKey: storeKeys.stores() }),
    });
}

// ========================================
// Remote Content Hooks
// ========================================

export function useRemotePrompts(storeId: string, page?: number) {
    return useQuery({
        queryKey: storeKeys.remotePrompts(storeId, page),
        queryFn: () => storeApi.listRemotePrompts.query({ storeId, page }),
        enabled: !!storeId,
    });
}

export function useSearchRemotePrompts(storeId: string, query: string) {
    return useQuery({
        queryKey: storeKeys.searchPrompts(storeId, query),
        queryFn: () => storeApi.searchRemotePrompts.query({ storeId, query }),
        enabled: !!storeId && query.length > 1,
    });
}

export function useRemoteSkills(storeId: string, page?: number) {
    return useQuery({
        queryKey: storeKeys.remoteSkills(storeId, page),
        queryFn: () => storeApi.listRemoteSkills.query({ storeId, page }),
        enabled: !!storeId,
    });
}

export function useGetRemoteSkill(storeId: string, skillName: string) {
    return useQuery({
        queryKey: [...storeKeys.all, 'getRemoteSkill', storeId, skillName] as const,
        queryFn: () => storeApi.getRemoteSkill.query({ storeId, skillName }),
        enabled: !!storeId && !!skillName,
    });
}

export function useSearchRemoteSkills(storeId: string, query: string) {
    return useQuery({
        queryKey: storeKeys.searchSkills(storeId, query),
        queryFn: () => storeApi.searchRemoteSkills.query({ storeId, query }),
        enabled: !!storeId && query.length > 1,
    });
}

// ========================================
// Import Hooks
// ========================================

export function useImportPrompt() {
    return useMutation({
        mutationFn: ({ storeId, promptId }: { storeId: string; promptId: string }) =>
            storeApi.importPrompt.mutate({ storeId, promptId }),
    });
}

export function useImportSkill() {
    return useMutation({
        mutationFn: ({ storeId, skillName }: { storeId: string; skillName: string }) =>
            storeApi.importSkill.mutate({ storeId, skillName }),
    });
}
