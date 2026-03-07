/**
 * AgentAutocompleteUI Component
 *
 * Displays agent autocomplete suggestions when user types `@agent-name`.
 * Similar to skill hints but for agents.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '@codegraph/config';

export interface AgentAutocompleteUIProps {
    /** Whether to show the autocomplete list */
    visible: boolean;
    /** Filtered agents to display */
    agents: Agent[];
    /** Current query text (without @) */
    query: string;
    /** Maximum number of items to show */
    maxVisible?: number;
}

/**
 * Highlight the matched prefix in agent name
 */
function HighlightedName({ name, query }: { name: string; query: string }): React.ReactElement {
    if (!query) {
        return <Text color="magenta">{name}</Text>;
    }

    const lowerName = name.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerName.startsWith(lowerQuery)) {
        return (
            <>
                <Text color="green" bold>
                    {name.slice(0, query.length)}
                </Text>
                <Text color="magenta">{name.slice(query.length)}</Text>
            </>
        );
    }

    return <Text color="magenta">{name}</Text>;
}

/**
 * AgentAutocompleteHintUI - Displays agent suggestions below the input
 */
export const AgentAutocompleteHintUI: React.FC<AgentAutocompleteUIProps> = ({
    visible,
    agents,
    query,
    maxVisible = 5,
}) => {
    if (!visible || agents.length === 0) {
        return null;
    }

    const visibleAgents = agents.slice(0, maxVisible);

    return (
        <Box marginBottom={1} flexDirection="column">
            <Text color="yellow" bold>
                Agent 建议 (按 → 补全):
            </Text>
            {visibleAgents.map((agent, index) => (
                <Box key={agent.id}>
                    <Text color={index === 0 ? 'yellow' : undefined}>{index === 0 ? '▶ @' : '  @'}</Text>
                    <HighlightedName name={agent.name} query={query} />
                    <Text dimColor> - {agent.description}</Text>
                </Box>
            ))}
            {agents.length > maxVisible && <Text color="gray">...还有 {agents.length - maxVisible} 个 Agent</Text>}
        </Box>
    );
};

/**
 * EmptyStateUI - Displayed when no agents match the query
 */
export const AgentAutocompleteEmptyUI: React.FC<{ visible: boolean; query: string }> = ({ visible, query }) => {
    if (!visible || !query) {
        return null;
    }

    return (
        <Box marginBottom={1}>
            <Text color="gray">无匹配 Agent: @{query}</Text>
        </Box>
    );
};

export default AgentAutocompleteHintUI;
