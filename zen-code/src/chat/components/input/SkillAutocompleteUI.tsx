/**
 * SkillAutocompleteUI Component
 *
 * Displays skill autocomplete suggestions when user types `#skill-name`.
 * Similar to command hints but for skills.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Skill } from '@codegraph/config';

export interface SkillAutocompleteUIProps {
    /** Whether to show the autocomplete list */
    visible: boolean;
    /** Filtered skills to display */
    skills: Skill[];
    /** Current query text (without #) */
    query: string;
    /** Maximum number of items to show */
    maxVisible?: number;
}

/**
 * Highlight the matched prefix in skill name
 */
function HighlightedName({ name, query }: { name: string; query: string }): React.ReactElement {
    if (!query) {
        return <Text color="cyan">{name}</Text>;
    }

    const lowerName = name.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerName.startsWith(lowerQuery)) {
        return (
            <>
                <Text color="green" bold>
                    {name.slice(0, query.length)}
                </Text>
                <Text color="cyan">{name.slice(query.length)}</Text>
            </>
        );
    }

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
            {visibleSkills.map((skill) => (
                <Box key={skill.name}>
                    <Text> #</Text>
                    <HighlightedName name={skill.name} query={query} />
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
