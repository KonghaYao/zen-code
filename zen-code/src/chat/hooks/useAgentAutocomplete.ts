/**
 * useAgentAutocomplete Hook
 *
 * Manages agent autocomplete state and logic for `@agent-name` triggers.
 * Similar to skill autocomplete with #, but for agents.
 *
 * Features:
 * - Detects `@` trigger in input
 * - Prefix matching for agent names
 * - Right-arrow completion support
 */

import { useState, useCallback } from 'react';
import type { Agent } from '@codegraph/config';

export interface AgentAutocompleteState {
    /** Whether autocomplete list is visible */
    visible: boolean;
    /** Current query text (without @) */
    query: string;
    /** Filtered agents list */
    filteredAgents: Agent[];
    /** The start position of the @ trigger in the input */
    triggerPosition: number;
}

export interface UseAgentAutocompleteOptions {
    /** Available agents list */
    agents: Agent[];
    /** Maximum number of suggestions to show */
    maxSuggestions?: number;
}

export interface UseAgentAutocompleteReturn {
    /** Current autocomplete state */
    state: AgentAutocompleteState;
    /** Check if input should trigger autocomplete */
    checkTrigger: (input: string, cursorPosition?: number) => void;
    /** Get first matching agent for completion */
    getFirstAgent: () => Agent | null;
    /** Complete the input with first agent */
    complete: (input: string) => string;
    /** Hide autocomplete list */
    hide: () => void;
    /** Whether autocomplete is currently active */
    isActive: boolean;
}

/**
 * Check if `@` at a given position should trigger autocomplete
 * Only triggers if `@` is at the start of input or preceded by whitespace
 */
function shouldTrigger(input: string, atPosition: number): boolean {
    if (atPosition === 0) return true;
    const charBefore = input[atPosition - 1];
    return charBefore === ' ' || charBefore === '\n' || charBefore === '\t';
}

/**
 * Extract query from input starting at @ position
 * Returns the text after @ until whitespace or end
 */
function extractQuery(input: string, atPosition: number): string {
    let endPos = atPosition + 1;
    while (endPos < input.length && !/[\s\n\t]/.test(input[endPos])) {
        endPos++;
    }
    return input.slice(atPosition + 1, endPos);
}

/**
 * Filter agents by prefix matching on name or id
 */
function filterAgents(agents: Agent[], query: string, maxResults: number): Agent[] {
    const lowerQuery = query.toLowerCase();

    // Prefix matches first - match on name or id
    const prefixMatches = agents.filter((agent) => {
        const lowerName = agent.name.toLowerCase();
        const lowerId = agent.id.toLowerCase();
        return lowerName.startsWith(lowerQuery) || lowerId.includes(lowerQuery);
    });

    // Sort by name length (shorter = more relevant for prefix match)
    prefixMatches.sort((a, b) => a.name.localeCompare(b.name));

    return prefixMatches.slice(0, maxResults);
}

/**
 * Hook for agent autocomplete functionality
 */
export function useAgentAutocomplete({
    agents,
    maxSuggestions = 5,
}: UseAgentAutocompleteOptions): UseAgentAutocompleteReturn {
    const [state, setState] = useState<AgentAutocompleteState>({
        visible: false,
        query: '',
        filteredAgents: [],
        triggerPosition: -1,
    });

    // Check if input should trigger autocomplete
    const checkTrigger = useCallback(
        (input: string, _cursorPosition?: number) => {
            // Find the last `@` in the input
            const lastIndex = input.lastIndexOf('@');

            if (lastIndex === -1) {
                // No @ found, hide autocomplete
                setState((prev) => ({
                    ...prev,
                    visible: false,
                    query: '',
                    filteredAgents: [],
                    triggerPosition: -1,
                }));
                return;
            }

            // Check if @ should trigger
            if (!shouldTrigger(input, lastIndex)) {
                setState((prev) => ({
                    ...prev,
                    visible: false,
                    query: '',
                    filteredAgents: [],
                    triggerPosition: -1,
                }));
                return;
            }

            // Extract query after @
            const query = extractQuery(input, lastIndex);

            // Filter agents
            const filteredAgents = filterAgents(agents, query, maxSuggestions);

            // If query exactly matches an agent name, hide autocomplete
            // This prevents re-triggering after completion
            if (filteredAgents.length === 1 && filteredAgents[0].name.toLowerCase() === query.toLowerCase()) {
                setState((prev) => ({
                    ...prev,
                    visible: false,
                    query: '',
                    filteredAgents: [],
                    triggerPosition: -1,
                }));
                return;
            }

            setState((prev) => ({
                ...prev,
                visible: true,
                query,
                filteredAgents,
                triggerPosition: lastIndex,
            }));
        },
        [agents, maxSuggestions],
    );

    // Get first matching agent
    const getFirstAgent = useCallback((): Agent | null => {
        if (!state.visible || state.filteredAgents.length === 0) return null;
        return state.filteredAgents[0] ?? null;
    }, [state.visible, state.filteredAgents]);

    // Complete the input with first agent
    const complete = useCallback(
        (input: string): string => {
            const firstAgent = getFirstAgent();
            if (!firstAgent) return input;

            // Find the part before @ and replace @xxx with @agent-name
            const beforeAt = input.slice(0, state.triggerPosition);
            const afterQuery = input.slice(state.triggerPosition + 1 + state.query.length);

            // Complete with agent name and add a space
            return `${beforeAt}@${firstAgent.name} ${afterQuery}`;
        },
        [getFirstAgent, state.triggerPosition, state.query],
    );

    // Hide autocomplete list
    const hide = useCallback(() => {
        setState((prev) => ({
            ...prev,
            visible: false,
            query: '',
            filteredAgents: [],
            triggerPosition: -1,
        }));
    }, []);

    const isActive = state.visible && state.filteredAgents.length > 0;

    return {
        state,
        checkTrigger,
        getFirstAgent,
        complete,
        hide,
        isActive,
    };
}
