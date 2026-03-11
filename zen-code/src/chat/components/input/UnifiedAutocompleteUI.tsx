/**
 * UnifiedAutocompleteUI Component
 *
 * Displays autocomplete suggestions for commands (/), skills (#), and agents (@).
 * Supports keyboard navigation and highlighting.
 */

import React, { useMemo } from 'react';
import { Box, Spacer, Text } from 'ink';
import fuzzysort from 'fuzzysort';
import type { AutocompleteItem, AutocompleteType } from '../../hooks/useUnifiedAutocomplete';

interface HighlightedTextProps {
    text: string;
    query: string;
    isHighlighted: boolean;
}

/**
 * Highlights matching characters in text based on query
 */
const HighlightedText: React.FC<HighlightedTextProps> = ({ text, query, isHighlighted }) => {
    const parts = useMemo(() => {
        if (!query) {
            return [{ text, highlight: false }];
        }

        const result = fuzzysort.go(query, [text], { threshold: -10000 })[0];
        if (!result || !result.indexes || result.indexes.length === 0) {
            return [{ text, highlight: false }];
        }

        const highlightIndexes = new Set(result.indexes);
        const parts: { text: string; highlight: boolean }[] = [];
        let currentPart = '';
        let currentHighlight = highlightIndexes.has(0);

        for (let i = 0; i < text.length; i++) {
            const isHighlight = highlightIndexes.has(i);
            if (isHighlight !== currentHighlight) {
                if (currentPart) {
                    parts.push({ text: currentPart, highlight: currentHighlight });
                }
                currentPart = text[i]!;
                currentHighlight = isHighlight;
            } else {
                currentPart += text[i];
            }
        }
        if (currentPart) {
            parts.push({ text: currentPart, highlight: currentHighlight });
        }

        return parts;
    }, [text, query]);

    return (
        <Text color={isHighlighted ? 'yellow' : undefined} bold={isHighlighted}>
            {parts.map((part, index) => (
                <Text
                    key={index}
                    color={part.highlight ? (isHighlighted ? 'yellow' : 'cyan') : isHighlighted ? 'yellow' : undefined}
                    bold={part.highlight || isHighlighted}
                >
                    {part.text}
                </Text>
            ))}
        </Text>
    );
};

interface UnifiedAutocompleteUIProps {
    visible: boolean;
    type: AutocompleteType | null;
    items: AutocompleteItem[];
    selectedIndex: number;
    query: string;
    maxVisible?: number;
    /** Max characters for description (default: 50) */
    maxDescLength?: number;
}

/**
 * Truncate text to max length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '…';
}

export const UnifiedAutocompleteUI: React.FC<UnifiedAutocompleteUIProps> = ({
    visible,
    type,
    items,
    selectedIndex,
    query,
    maxVisible = 5,
}) => {
    if (!visible || items.length === 0 || !type) {
        return null;
    }

    const titles: Record<AutocompleteType, string> = {
        command: '命令建议',
        skill: '技能建议',
        agent: 'Agent 建议',
    };

    const displayItems = items.slice(0, maxVisible);

    return (
        <Box marginBottom={1} flexDirection="column">
            <Text color="yellow" bold>
                {titles[type]} (↑↓ 选择, Tab/→ 补全):
            </Text>
            {displayItems.map((item, index) => (
                <Box key={item.id}>
                    <Text color={index === selectedIndex ? 'yellow' : undefined}>
                        {index === selectedIndex ? '▶ ' : '  '}
                    </Text>
                    <HighlightedText text={item.displayText} query={query} isHighlighted={index === selectedIndex} />
                    <Spacer></Spacer>
                    {item.description && (
                        <Text dimColor={index !== selectedIndex} color={index === selectedIndex ? 'yellow' : undefined}>
                            {item.description.length > 30 ? item.description.slice(0, 30) + '...' : item.description}
                        </Text>
                    )}
                </Box>
            ))}
            {items.length > maxVisible && <Text color="gray">...还有 {items.length - maxVisible} 项</Text>}
        </Box>
    );
};
