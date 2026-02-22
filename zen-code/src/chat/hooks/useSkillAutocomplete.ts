/**
 * useSkillAutocomplete Hook
 *
 * Manages skill autocomplete state and logic for `#skill-name` triggers.
 * Similar to command autocomplete with `/`, but for skills.
 *
 * Features:
 * - Detects `#` trigger in input
 * - Fuzzy matching for skill names using fuzzysort
 * - Right-arrow completion support
 */

import { useState, useCallback, useMemo } from 'react';
import fuzzysort from 'fuzzysort';
import type { Skill } from '@codegraph/config';

export interface FuzzyMatch {
    skill: Skill;
    /** fuzzysort result for highlighting */
    result: Fuzzysort.Result | null;
}

export interface SkillAutocompleteState {
    /** Whether autocomplete list is visible */
    visible: boolean;
    /** Current query text (without #) */
    query: string;
    /** Filtered skills with fuzzy match info */
    filteredSkills: FuzzyMatch[];
    /** The start position of the # trigger in the input */
    triggerPosition: number;
}

export interface UseSkillAutocompleteOptions {
    /** Available skills list */
    skills: Skill[];
    /** Maximum number of suggestions to show */
    maxSuggestions?: number;
}

export interface UseSkillAutocompleteReturn {
    /** Current autocomplete state */
    state: SkillAutocompleteState;
    /** Check if input should trigger autocomplete */
    checkTrigger: (input: string, cursorPosition?: number) => void;
    /** Get first matching skill for completion */
    getFirstSkill: () => Skill | null;
    /** Complete the input with first skill */
    complete: (input: string) => string;
    /** Hide autocomplete list */
    hide: () => void;
    /** Whether autocomplete is currently active */
    isActive: boolean;
}

/**
 * Check if `#` at a given position should trigger autocomplete
 * Only triggers if `#` is at the start of input or preceded by whitespace
 */
function shouldTrigger(input: string, hashPosition: number): boolean {
    if (hashPosition === 0) return true;
    const charBefore = input[hashPosition - 1];
    return charBefore === ' ' || charBefore === '\n' || charBefore === '\t';
}

/**
 * Extract query from input starting at # position
 * Returns the text after # until whitespace or end
 */
function extractQuery(input: string, hashPosition: number): string {
    let endPos = hashPosition + 1;
    while (endPos < input.length && !/[\s\n\t]/.test(input[endPos])) {
        endPos++;
    }
    return input.slice(hashPosition + 1, endPos);
}

/**
 * Filter skills using fuzzy search
 */
function filterSkillsFuzzy(skills: Skill[], query: string, maxResults: number): FuzzyMatch[] {
    if (!query) {
        // No query - return all skills (up to maxResults)
        return skills.slice(0, maxResults).map((skill) => ({ skill, result: null }));
    }

    // Prepare skills for fuzzy search
    const targets = skills.map((skill) => ({
        skill,
        name: fuzzysort.prepare(skill.name.toLowerCase()),
        description: fuzzysort.prepare((skill.description || '').toLowerCase()),
    }));

    // Search by name (primary) and description (secondary)
    const nameResults = fuzzysort.go(query.toLowerCase(), targets, {
        key: 'name',
        limit: maxResults,
        threshold: -10000, // Allow more matches
    });

    // Convert results to FuzzyMatch array
    const matches: FuzzyMatch[] = nameResults.map((result) => ({
        skill: result.obj.skill,
        result: result,
    }));

    return matches;
}

/**
 * Hook for skill autocomplete functionality
 */
export function useSkillAutocomplete({
    skills,
    maxSuggestions = 5,
}: UseSkillAutocompleteOptions): UseSkillAutocompleteReturn {
    const [state, setState] = useState<SkillAutocompleteState>({
        visible: false,
        query: '',
        filteredSkills: [],
        triggerPosition: -1,
    });

    // Check if input should trigger autocomplete
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const checkTrigger = useCallback(
        (input: string, _cursorPosition?: number) => {
            // Find the last `#` in the input
            const lastHashIndex = input.lastIndexOf('#');

            if (lastHashIndex === -1) {
                // No # found, hide autocomplete
                setState((prev) => ({
                    ...prev,
                    visible: false,
                    query: '',
                    filteredSkills: [],
                    triggerPosition: -1,
                }));
                return;
            }

            // Check if # should trigger
            if (!shouldTrigger(input, lastHashIndex)) {
                setState((prev) => ({
                    ...prev,
                    visible: false,
                    query: '',
                    filteredSkills: [],
                    triggerPosition: -1,
                }));
                return;
            }

            // Extract query after #
            const query = extractQuery(input, lastHashIndex);

            // Filter skills using fuzzy search
            const filteredSkills = filterSkillsFuzzy(skills, query, maxSuggestions);

            // If query exactly matches a skill name, hide autocomplete
            // This prevents re-triggering after completion
            if (filteredSkills.length === 1 && filteredSkills[0].skill.name.toLowerCase() === query.toLowerCase()) {
                setState((prev) => ({
                    ...prev,
                    visible: false,
                    query: '',
                    filteredSkills: [],
                    triggerPosition: -1,
                }));
                return;
            }

            setState((prev) => ({
                ...prev,
                visible: true,
                query,
                filteredSkills,
                triggerPosition: lastHashIndex,
            }));
        },
        [skills.length, maxSuggestions],
    ); // Depend on skills.length instead of skills reference

    // Get first matching skill
    const getFirstSkill = useCallback((): Skill | null => {
        if (!state.visible || state.filteredSkills.length === 0) return null;
        return state.filteredSkills[0]?.skill ?? null;
    }, [state.visible, state.filteredSkills]);

    // Complete the input with first skill
    const complete = useCallback(
        (input: string): string => {
            const firstSkill = getFirstSkill();
            if (!firstSkill) return input;

            // Find the part before # and replace #xxx with #skill-name
            const beforeHash = input.slice(0, state.triggerPosition);
            const afterQuery = input.slice(state.triggerPosition + 1 + state.query.length);

            // Complete with skill name and add a space
            return `${beforeHash}#${firstSkill.name} ${afterQuery}`;
        },
        [getFirstSkill, state.triggerPosition, state.query],
    );

    // Hide autocomplete list
    const hide = useCallback(() => {
        setState((prev) => ({
            ...prev,
            visible: false,
            query: '',
            filteredSkills: [],
            triggerPosition: -1,
        }));
    }, []);

    const isActive = state.visible && state.filteredSkills.length > 0;

    return {
        state,
        checkTrigger,
        getFirstSkill,
        complete,
        hide,
        isActive,
    };
}
