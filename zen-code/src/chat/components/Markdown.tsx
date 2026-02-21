import React, { useMemo, memo } from 'react';
import { parse } from 'marked';
import MarkedTerminal from 'marked-terminal';
import { Box, Text } from 'ink';

// Singleton renderer instance to avoid repeated instantiation
const renderer = new MarkedTerminal(
    {
        showSectionPrefix: false,
        tab: 2,
    },
    {},
);

/**
 * Truncates long text to fit within terminal bounds.
 * @param text - The full text to potentially truncate
 * @param showFull - If true, returns full text; otherwise truncates
 * @returns Truncated text with row count indicator, or full text
 */
export const safeLongText = (text: string, showFull = false): string => {
    if (showFull || !text) {
        return text;
    }

    const maxRows = 5;
    const lines = text.split('\n');

    if (lines.length <= maxRows) {
        return text;
    }

    const hiddenCount = lines.length - maxRows;
    const visibleLines = lines.slice(-maxRows);

    return `\u001b[33m${hiddenCount} rows hidden...\u001b[0m\n${visibleLines.join('\n')}`;
};

type MarkdownProps = {
    children: string;
    [key: string]: any;
};

const Markdown: React.FC<MarkdownProps> = memo(({ children }) => {
    const loading = false;

    // MEM FIX: Only parse markdown when loading is complete (not during streaming)
    // This prevents creating large parsed strings on every character update
    const parsedText = useMemo(() => {
        if (!children || loading) {
            // Return raw text during streaming
            return children || '';
        }
        return parse(children, {
            renderer: renderer as any,
        }) as string;
    }, [children, loading]);

    // Show full text only when not loading (allows viewing complete responses)
    const displayText = useMemo(() => {
        return safeLongText(parsedText.trim(), !loading);
    }, [parsedText, loading]);

    // Split text into lines and render each as separate Text component
    // Using line index as key to cache each line component
    const lines = useMemo(() => {
        return displayText.split('\n').map((i) => (i === '' ? '\n' : i));
    }, [displayText]);

    return (
        <Box flexDirection="column">
            {lines.map((line, index) => (
                <Text key={`line-${index}`}>{line}</Text>
            ))}
        </Box>
    );
});

export default Markdown;
