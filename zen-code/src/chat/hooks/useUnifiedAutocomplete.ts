/**
 * useUnifiedAutocomplete Hook
 *
 * Unified autocomplete system for commands (/), skills (#), and agents (@).
 * Supports keyboard navigation (↑↓) and completion (Tab/→).
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import fuzzysort from 'fuzzysort';
import type { Skill, Agent } from '@codegraph/config';

// ============================================================================
// Types
// ============================================================================

/**
 * Autocomplete item interface
 */
export interface AutocompleteItem {
    /** Unique identifier */
    id: string;
    /** Display name (used for completion) */
    name: string;
    /** Full display text (includes trigger character) */
    displayText: string;
    /** Description text */
    description?: string;
    /** Match score for sorting */
    score?: number;
    /** Original data (skill, agent, or command object) */
    raw?: Skill | Agent | any;
}

/**
 * Autocomplete type
 */
export type AutocompleteType = 'command' | 'skill' | 'agent';

/**
 * Autocomplete state
 */
export interface AutocompleteState {
    /** Current autocomplete type */
    type: AutocompleteType | null;
    /** Whether autocomplete is visible */
    visible: boolean;
    /** Query text (without trigger character) */
    query: string;
    /** Filtered autocomplete items */
    items: AutocompleteItem[];
    /** Currently selected index */
    selectedIndex: number;
    /** Position of trigger character in input */
    triggerPosition: number;
}

/**
 * Options for useUnifiedAutocomplete
 */
export interface UseUnifiedAutocompleteOptions {
    /** Available commands list */
    commands?: any[];
    /** Available skills list */
    skills?: Skill[];
    /** Available agents list */
    agents?: Agent[];
    /** Maximum visible items (default: 5) */
    maxVisible?: number;
}

/**
 * Return type for useUnifiedAutocomplete
 */
export interface UseUnifiedAutocompleteReturn {
    /** Current autocomplete state */
    state: AutocompleteState;
    /** Check if input should trigger autocomplete */
    checkTrigger: (input: string, cursorPosition?: number) => void;
    /** Select next item (↓) */
    selectNext: () => void;
    /** Select previous item (↑) */
    selectPrev: () => void;
    /** Get currently selected item */
    getSelectedItem: () => AutocompleteItem | null;
    /** Complete the input with selected item */
    complete: (input: string) => string;
    /** Hide autocomplete */
    hide: () => void;
    /** Whether autocomplete is active */
    isActive: boolean;
    /** Handle keyboard events */
    handleKeyDown: (key: {
        upArrow?: boolean;
        downArrow?: boolean;
        tab?: boolean;
        rightArrow?: boolean;
        escape?: boolean;
    }) => boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Trigger characters mapping
 */
const TRIGGERS: Record<string, AutocompleteType> = {
    '/': 'command',
    '#': 'skill',
    '@': 'agent',
};

/**
 * Check if trigger character at position should activate autocomplete
 * Only triggers if character is at start or preceded by whitespace
 */
function shouldTrigger(input: string, position: number): boolean {
    if (position === 0) return true;
    const charBefore = input[position - 1];
    return charBefore === ' ' || charBefore === '\n' || charBefore === '\t';
}

/**
 * Extract query text from input starting at trigger position
 */
function extractQuery(input: string, triggerPosition: number): string {
    let endPos = triggerPosition + 1;
    while (endPos < input.length && !/[\s\n\t]/.test(input[endPos])) {
        endPos++;
    }
    return input.slice(triggerPosition + 1, endPos);
}

/**
 * Convert commands to autocomplete items
 * Supports both formats:
 * - { command: 'help', displayText: '/help', description: '...' }
 * - { name: 'help', description: '...' }
 */
function commandsToItems(commands: any[], query: string, maxResults: number): AutocompleteItem[] {
    if (!commands || commands.length === 0) return [];

    const lowerQuery = query.toLowerCase();

    // Filter by prefix match on name or command field
    const matches = commands.filter((cmd) => {
        const name = (cmd.name || cmd.command || '').toLowerCase();
        return name.startsWith(lowerQuery);
    });

    return matches.slice(0, maxResults).map((cmd) => {
        const name = cmd.name || cmd.command;
        return {
            id: name,
            name,
            displayText: cmd.displayText || `/${name}`,
            description: cmd.description,
            raw: cmd,
        };
    });
}

/**
 * Convert skills to autocomplete items with fuzzy matching
 */
function skillsToItems(skills: Skill[], query: string, maxResults: number): AutocompleteItem[] {
    if (!skills || skills.length === 0) return [];

    if (!query) {
        return skills.slice(0, maxResults).map((skill) => ({
            id: skill.name,
            name: skill.name,
            displayText: `#${skill.name}`,
            description: skill.description,
            raw: skill,
        }));
    }

    // Fuzzy search on skill names
    const targets = skills.map((skill) => ({
        skill,
        name: fuzzysort.prepare(skill.name.toLowerCase()),
    }));

    const results = fuzzysort.go(query.toLowerCase(), targets, {
        key: 'name',
        limit: maxResults,
        threshold: -10000,
    });

    return results.map((result) => ({
        id: result.obj.skill.name,
        name: result.obj.skill.name,
        displayText: `#${result.obj.skill.name}`,
        description: result.obj.skill.description,
        score: result.score,
        raw: result.obj.skill,
    }));
}

/**
 * Convert agents to autocomplete items with prefix matching
 */
function agentsToItems(agents: Agent[], query: string, maxResults: number): AutocompleteItem[] {
    if (!agents || agents.length === 0) return [];

    const lowerQuery = query.toLowerCase();

    // Prefix match on name or id
    const matches = agents.filter((agent) => {
        const lowerName = agent.name.toLowerCase();
        const lowerId = agent.id.toLowerCase();
        return lowerName.startsWith(lowerQuery) || lowerId.includes(lowerQuery);
    });

    // Sort by name
    matches.sort((a, b) => a.name.localeCompare(b.name));

    return matches.slice(0, maxResults).map((agent) => ({
        id: agent.id,
        name: agent.name,
        displayText: `@${agent.name}`,
        description: agent.description,
        raw: agent,
    }));
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Unified autocomplete hook for commands, skills, and agents
 */
export function useUnifiedAutocomplete({
    commands = [],
    skills = [],
    agents = [],
    maxVisible = 5,
}: UseUnifiedAutocompleteOptions): UseUnifiedAutocompleteReturn {
    const [state, setState] = useState<AutocompleteState>({
        type: null,
        visible: false,
        query: '',
        items: [],
        selectedIndex: 0,
        triggerPosition: -1,
    });

    // Track if we need to reset selection when items change
    const prevItemsLengthRef = useRef(0);

    /**
     * Check input for autocomplete triggers
     */
    const checkTrigger = useCallback(
        (input: string, _cursorPosition?: number) => {
            let lastTriggerPos = -1;
            let lastTriggerType: AutocompleteType | null = null;

            // Find the last trigger character in input
            for (let i = input.length - 1; i >= 0; i--) {
                const char = input[i];
                if (TRIGGERS[char] && shouldTrigger(input, i)) {
                    lastTriggerPos = i;
                    lastTriggerType = TRIGGERS[char];
                    break;
                }
            }

            // No trigger found
            if (lastTriggerPos === -1 || lastTriggerType === null) {
                setState((prev) => ({
                    ...prev,
                    type: null,
                    visible: false,
                    query: '',
                    items: [],
                    triggerPosition: -1,
                    selectedIndex: 0,
                }));
                return;
            }

            // Extract query
            const query = extractQuery(input, lastTriggerPos);

            // Filter items based on type
            let items: AutocompleteItem[] = [];
            switch (lastTriggerType) {
                case 'command':
                    items = commandsToItems(commands, query, maxVisible);
                    break;
                case 'skill':
                    items = skillsToItems(skills, query, maxVisible);
                    break;
                case 'agent':
                    items = agentsToItems(agents, query, maxVisible);
                    break;
            }

            // Hide if exact match (prevents re-triggering after completion)
            if (items.length === 1 && items[0].name.toLowerCase() === query.toLowerCase()) {
                setState((prev) => ({
                    ...prev,
                    type: null,
                    visible: false,
                    query: '',
                    items: [],
                    triggerPosition: -1,
                    selectedIndex: 0,
                }));
                return;
            }

            // Hide if no items match
            if (items.length === 0) {
                setState((prev) => ({
                    ...prev,
                    type: null,
                    visible: false,
                    query: '',
                    items: [],
                    triggerPosition: -1,
                    selectedIndex: 0,
                }));
                return;
            }

            setState((prev) => {
                // Reset selectedIndex when items change
                const shouldResetSelection = prev.items.length !== items.length;
                return {
                    ...prev,
                    type: lastTriggerType,
                    visible: true,
                    query,
                    items,
                    selectedIndex: shouldResetSelection ? 0 : Math.min(prev.selectedIndex, items.length - 1),
                    triggerPosition: lastTriggerPos,
                };
            });
        },
        [commands.length, skills.length, agents.length, maxVisible],
    );

    /**
     * Select next item (↓)
     */
    const selectNext = useCallback(() => {
        setState((prev) => {
            if (!prev.visible || prev.items.length === 0) return prev;
            const nextIndex = (prev.selectedIndex + 1) % prev.items.length;
            return { ...prev, selectedIndex: nextIndex };
        });
    }, []);

    /**
     * Select previous item (↑)
     */
    const selectPrev = useCallback(() => {
        setState((prev) => {
            if (!prev.visible || prev.items.length === 0) return prev;
            const prevIndex = prev.selectedIndex === 0 ? prev.items.length - 1 : prev.selectedIndex - 1;
            return { ...prev, selectedIndex: prevIndex };
        });
    }, []);

    /**
     * Get currently selected item
     */
    const getSelectedItem = useCallback((): AutocompleteItem | null => {
        if (!state.visible || state.items.length === 0) return null;
        return state.items[state.selectedIndex] ?? null;
    }, [state.visible, state.items, state.selectedIndex]);

    /**
     * Complete the input with selected item
     */
    const complete = useCallback(
        (input: string): string => {
            const selectedItem = getSelectedItem();
            if (!selectedItem) return input;

            // Re-derive trigger position from current input
            const triggerPos = state.triggerPosition;
            if (triggerPos === -1) return input;

            // Verify trigger is still valid
            if (!shouldTrigger(input, triggerPos)) return input;

            const currentQuery = extractQuery(input, triggerPos);
            const beforeTrigger = input.slice(0, triggerPos);
            const afterQuery = input.slice(triggerPos + 1 + currentQuery.length);

            // Get the trigger character based on type
            const triggerChar = state.type === 'command' ? '/' : state.type === 'skill' ? '#' : '@';

            // Complete with selected item
            return `${beforeTrigger}${triggerChar}${selectedItem.name} ${afterQuery.trimStart()}`;
        },
        [getSelectedItem, state.triggerPosition, state.type],
    );

    /**
     * Hide autocomplete
     */
    const hide = useCallback(() => {
        setState((prev) => ({
            ...prev,
            type: null,
            visible: false,
            query: '',
            items: [],
            triggerPosition: -1,
            selectedIndex: 0,
        }));
    }, []);

    /**
     * Whether autocomplete is active
     */
    const isActive = state.visible && state.items.length > 0;

    /**
     * Handle keyboard events
     * Returns true if the event was handled
     */
    const handleKeyDown = useCallback(
        (key: {
            upArrow?: boolean;
            downArrow?: boolean;
            tab?: boolean;
            rightArrow?: boolean;
            escape?: boolean;
        }): boolean => {
            if (!isActive) return false;

            if (key.upArrow) {
                selectPrev();
                return true;
            }

            if (key.downArrow) {
                selectNext();
                return true;
            }

            if (key.tab || key.rightArrow) {
                return true; // Signal that we should complete
            }

            if (key.escape) {
                hide();
                return true;
            }

            return false;
        },
        [isActive, selectPrev, selectNext, hide],
    );

    return {
        state,
        checkTrigger,
        selectNext,
        selectPrev,
        getSelectedItem,
        complete,
        hide,
        isActive,
        handleKeyDown,
    };
}
