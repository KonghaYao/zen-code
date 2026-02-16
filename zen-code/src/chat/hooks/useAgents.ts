/**
 * useAgents Hook
 *
 * Manages agents state using TanStack Query.
 * Fetches available subagents for @-mention autocomplete.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { Agent } from '@codegraph/config';

interface UseAgentsOptions {
    enabled?: boolean;
}

/**
 * Default built-in agents
 * These match the agents defined in packages/agent/src/subagents/loader.ts
 */
const DEFAULT_AGENTS: Agent[] = [
    {
        id: 'agents/default',
        name: 'Jarvis',
        description: '代码实现助手',
    },
    {
        id: 'agents/manager',
        name: 'Manager',
        description: '任务管理员',
    },
];

/**
 * Fetch agents list
 *
 * @param options - Hook options
 * @returns Query result with agents data
 *
 * Example:
 * ```tsx
 * const { data: agents, isLoading, error } = useAgents();
 * ```
 */
export function useAgents({ enabled = true }: UseAgentsOptions = {}) {
    return useQuery({
        queryKey: queryKeys.agents.list(),
        queryFn: async (): Promise<Agent[]> => {
            // For now, return default agents
            // In the future, this could fetch from a server or config
            return DEFAULT_AGENTS;
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes - agents don't change often
    });
}
