/**
 * useKnowledge Hook
 *
 * Manages knowledge base (memories and skills) state using TanStack Query + zen-core tRPC.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { useTrpc } from '../context/ZenCoreContext';

export type KnowledgeItem = {
    name: string;
    path?: string;
    type: 'memory' | 'skill';
    [key: string]: unknown;
};

interface UseKnowledgeOptions {
    type: 'memories' | 'skills';
    enabled?: boolean;
}

/**
 * Fetch knowledge base items (memories or skills) via zen-core tRPC
 */
export function useKnowledge({ type, enabled = true }: UseKnowledgeOptions) {
    const trpc = useTrpc();
    return useQuery({
        queryKey: type === 'memories' ? queryKeys.knowledge.memories() : queryKeys.knowledge.skills(),
        queryFn: () => trpc.knowledge.list.query({ type }),
        enabled,
        staleTime: 2 * 60 * 1000,
    });
}
