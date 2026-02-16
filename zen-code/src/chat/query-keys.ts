/**
 * TanStack Query Keys
 *
 * Centralized query key definitions for zen-code application.
 * Query keys are used to identify, cache, and refetch data.
 *
 * Design Principles:
 * - Hierarchical structure for cache invalidation
 * - Use specific keys for fine-grained control
 * - Factory functions for dynamic parameters
 *
 * Reference: https://tanstack.com/query/latest/docs/react/guides/query-keys
 */

export const queryKeys = {
    // ========== Config ==========
    config: {
        all: ['config'] as const,
        detail: () => ['config', 'detail'] as const,
    },

    // ========== Providers ==========
    providers: {
        all: ['providers'] as const,
        list: () => ['providers', 'list'] as const,
        detail: (id: string) => ['providers', 'detail', id] as const,
    },

    // ========== Models ==========
    models: {
        all: ['models'] as const,
        list: (providerId: string) => ['models', 'list', providerId] as const,
        available: () => ['models', 'available'] as const,
    },

    // ========== Skills ==========
    skills: {
        all: ['skills'] as const,
        list: () => ['skills', 'list'] as const,
        detail: (name: string) => ['skills', 'detail', name] as const,
    },

    // ========== Tasks ==========
    tasks: {
        all: ['tasks'] as const,
        list: (filter?: string) => ['tasks', 'list', filter] as const,
        detail: (id: string) => ['tasks', 'detail', id] as const,
    },

    // ========== History ==========
    history: {
        all: ['history'] as const,
        list: () => ['history', 'list'] as const,
        detail: (threadId: string) => ['history', 'detail', threadId] as const,
    },

    // ========== Knowledge ==========
    knowledge: {
        all: ['knowledge'] as const,
        memories: () => ['knowledge', 'memories'] as const,
        skills: () => ['knowledge', 'skills'] as const,
    },

    // ========== Agents ==========
    agents: {
        all: ['agents'] as const,
        list: () => ['agents', 'list'] as const,
        detail: (id: string) => ['agents', 'detail', id] as const,
    },
} as const;

/**
 * Type definitions for query keys
 */
export type QueryKeyFactory = typeof queryKeys;
