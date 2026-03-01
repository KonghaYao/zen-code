/**
 * Provider Hooks
 *
 * React hooks for provider management using tRPC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api.js';

// Provider API client with type assertion (providers router is added at runtime by server)
const providersApi = (apiClient as any).providers;

// ========================================
// Query Keys
// ========================================

export const providerKeys = {
    all: ['providers'] as const,
    list: () => [...providerKeys.all, 'list'] as const,
    detail: (id: string) => [...providerKeys.all, 'detail', id] as const,
    active: () => [...providerKeys.all, 'active'] as const,
};

// ========================================
// Types
// ========================================

export type ProviderType = 'openai' | 'anthropic';

export interface Provider {
    id: string;
    name: string;
    type: ProviderType;
    apiKey: string; // 脱敏显示
    baseUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProviderInput {
    name: string;
    type: ProviderType;
    apiKey: string;
    baseUrl: string;
    isActive?: boolean;
}

export interface ProviderUpdateInput {
    id: string;
    name?: string;
    type?: ProviderType;
    apiKey?: string;
    baseUrl?: string;
    isActive?: boolean;
}

// ========================================
// Default Base URLs
// ========================================

export const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
};

// ========================================
// Query Hooks
// ========================================

/**
 * 获取所有提供商
 */
export function useProviders() {
    return useQuery({
        queryKey: providerKeys.list(),
        queryFn: () => providersApi.list.query() as Promise<Provider[]>,
        staleTime: 5 * 60 * 1000, // 5 分钟
    });
}

/**
 * 获取单个提供商
 */
export function useProvider(id: string | null | undefined) {
    return useQuery({
        queryKey: providerKeys.detail(id!),
        queryFn: () => providersApi.get.query({ id: id! }) as Promise<Provider>,
        enabled: !!id,
    });
}

/**
 * 获取活跃提供商
 */
export function useActiveProvider() {
    return useQuery({
        queryKey: providerKeys.active(),
        queryFn: () => providersApi.getActive.query() as Promise<Provider | null>,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * 获取默认 Base URL
 */
export function useDefaultBaseUrl(type: ProviderType) {
    return useQuery({
        queryKey: [...providerKeys.all, 'defaultBaseUrl', type],
        queryFn: () => providersApi.getDefaultBaseUrl.query({ type }) as Promise<string>,
        staleTime: Infinity, // 永不过期
    });
}

// ========================================
// Mutation Hooks
// ========================================

/**
 * 创建提供商
 */
export function useCreateProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ProviderInput) => providersApi.create.mutate(data) as Promise<Provider>,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: providerKeys.list() });
            queryClient.invalidateQueries({ queryKey: providerKeys.active() });
        },
    });
}

/**
 * 更新提供商
 */
export function useUpdateProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ProviderUpdateInput) => providersApi.update.mutate(data) as Promise<Provider>,
        onSuccess: (updatedProvider) => {
            queryClient.invalidateQueries({ queryKey: providerKeys.list() });
            queryClient.invalidateQueries({ queryKey: providerKeys.detail(updatedProvider.id) });
            if (updatedProvider.isActive) {
                queryClient.invalidateQueries({ queryKey: providerKeys.active() });
            }
        },
    });
}

/**
 * 删除提供商
 */
export function useDeleteProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => providersApi.delete.mutate({ id }) as Promise<{ success: boolean; id: string }>,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: providerKeys.list() });
            queryClient.invalidateQueries({ queryKey: providerKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: providerKeys.active() });
        },
    });
}

/**
 * 设置活跃提供商
 */
export function useSetActiveProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => providersApi.setActive.mutate({ id }) as Promise<Provider>,
        onSuccess: (updatedProvider) => {
            // 乐观更新：更新缓存中的活跃状态
            queryClient.setQueryData(providerKeys.list(), (old: Provider[] | undefined) => {
                if (!old) return old;
                return old.map((p) => ({
                    ...p,
                    isActive: p.id === updatedProvider.id,
                }));
            });
            queryClient.setQueryData(providerKeys.active(), updatedProvider);
        },
    });
}

/**
 * 验证 API Key 格式
 */
export function useValidateApiKey() {
    return useMutation({
        mutationFn: (params: { type: ProviderType; apiKey: string; baseUrl?: string }) =>
            providersApi.validateApiKey.query(params) as Promise<{ valid: boolean; error?: string; warning?: string }>,
    });
}
