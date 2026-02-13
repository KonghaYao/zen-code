/**
 * useKnowledge Hook
 *
 * Manages knowledge base (memories and skills) state using TanStack Query.
 * Replaces manual Promise-based async calls in KnowledgePanel.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 * - Separate queries for memories and skills
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { listMemories, type MemoryMetadata } from '@codegraph/agent/src/memories/load.js';
import { listSkills, type SkillMetadata } from '@langgraph-js/standard-agent';
import { join } from 'path';

export type KnowledgeItem = (MemoryMetadata | SkillMetadata) & { type: 'memory' | 'skill' };

interface UseKnowledgeOptions {
    type: 'memories' | 'skills';
    enabled?: boolean;
}

/**
 * Fetch knowledge base items (memories or skills)
 *
 * @param options - Hook options with type (memories or skills)
 * @returns Query result with knowledge data
 *
 * Example:
 * ```tsx
 * const { data: memories, isLoading } = useKnowledge({ type: 'memories' });
 * const { data: skills, isLoading } = useKnowledge({ type: 'skills' });
 * ```
 */
export function useKnowledge({ type, enabled = true }: UseKnowledgeOptions) {
    return useQuery({
        queryKey: type === 'memories' ? queryKeys.knowledge.memories() : queryKeys.knowledge.skills(),
        queryFn: async () => {
            const projectDir = join(process.cwd(), '.claude', type);
            const userDir = join(process.env.HOME || '', '.deepagents/code', type);

            try {
                if (type === 'memories') {
                    const memories = listMemories(userDir, projectDir);
                    return memories.map((m) => ({ ...m, type: 'memory' as const }));
                } else {
                    const skills = listSkills(userDir, projectDir);
                    return skills.map((s) => ({ ...s, type: 'skill' as const }));
                }
            } catch (error) {
                console.warn(`Failed to load ${type}:`, error);
                return [];
            }
        },
        enabled,
        staleTime: 2 * 60 * 1000, // 2 minutes - knowledge changes moderately
    });
}
