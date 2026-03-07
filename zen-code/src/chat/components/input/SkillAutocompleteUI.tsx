/**
 * SkillAutocompleteUI Component
 *
 * Displays skill autocomplete suggestions when user types `#skill-name`.
 * Similar to command hints but for skills.
 *
 * Uses fuzzy matching with fuzzysort for flexible skill name matching.
 */

import React from 'react';
import { Box, Text } from 'ink';
import fuzzysort from 'fuzzysort';
import type { Skill } from '@codegraph/config';
import type { FuzzyMatch } from '../../hooks/useSkillAutocomplete';

export interface SkillAutocompleteUIProps {
    /** Whether to show the autocomplete list */
    visible: boolean;
    /** Filtered skills with fuzzy match info */
    skills: FuzzyMatch[];
    /** Current query text (without #) */
    query: string;
    /** Maximum number of items to show */
    maxVisible?: number;
}

/**
 * Highlight the matched characters in skill name using fuzzysort result
 */
function HighlightedName({ name, result }: { name: string; result: Fuzzysort.Result | null }): React.ReactElement {
    if (!result) {
        // No fuzzy result, just show the name
        return <Text color="cyan">{name}</Text>;
    }

    // Use fuzzysort's highlight method on the result object
    // The callback returns React elements for matched portions
    const highlighted = result.highlight((match) => (
        // Don't set key here, will be set in the outer map
        <Text color="green" bold>
            {match}
        </Text>
    ));

    // result.highlight() with callback returns (string | T)[]
    // Strings are unmatched portions, T (React elements) are matched portions
    if (Array.isArray(highlighted)) {
        return (
            <Text color="cyan">
                {highlighted.map((part, i) => {
                    if (typeof part === 'string') {
                        return <Text key={`p-${i}`}>{part}</Text>;
                    }
                    // part is a React element from the callback, add key via clone
                    return <React.Fragment key={`m-${i}`}>{part}</React.Fragment>;
                })}
            </Text>
        );
    }

    // Fallback to plain name
    return <Text color="cyan">{name}</Text>;
}

/**
 * SkillAutocompleteHintUI - Displays skill suggestions below the input
 */
export const SkillAutocompleteHintUI: React.FC<SkillAutocompleteUIProps> = ({
    visible,
    skills,
    query,
    maxVisible = 5,
}) => {
    if (!visible || skills.length === 0) {
        return null;
    }

    const visibleSkills = skills.slice(0, maxVisible);

    return (
        <Box marginBottom={1} flexDirection="column">
            <Text color="yellow" bold>
                技能建议 (按 → 补全):
            </Text>
            {visibleSkills.map(({ skill, result }, index) => (
                <Box key={skill.name}>
                    <Text color={index === 0 ? 'yellow' : undefined}>{index === 0 ? '▶ #' : '  #'}</Text>
                    <HighlightedName name={skill.name} result={result} />
                </Box>
            ))}
            {skills.length > maxVisible && <Text color="gray">...还有 {skills.length - maxVisible} 个技能</Text>}
        </Box>
    );
};

/**
 * EmptyStateUI - Displayed when no skills match the query
 */
export const SkillAutocompleteEmptyUI: React.FC<{ visible: boolean; query: string }> = ({ visible, query }) => {
    if (!visible || !query) {
        return null;
    }

    return (
        <Box marginBottom={1}>
            <Text color="gray">无匹配技能: #{query}</Text>
        </Box>
    );
};

export default SkillAutocompleteHintUI;
