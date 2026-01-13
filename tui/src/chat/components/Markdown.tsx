import React, { useMemo, memo } from 'react';
import { parse } from 'marked';
import MarkedTerminal from 'marked-terminal';
import { Text } from 'ink';
import { useChat } from '@langgraph-js/sdk/react';

// Singleton renderer instance to avoid repeated instantiation
const renderer = new MarkedTerminal({}, {});

// Reserve space for UI elements (header, input area, status bar)
const RESERVED_ROWS = 10;
const DEFAULT_MAX_ROWS = 50;

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

    const maxRows = Math.max(
        1,
        Math.floor((Math.min(process.stdout.rows || DEFAULT_MAX_ROWS, DEFAULT_MAX_ROWS) - RESERVED_ROWS) / 2),
    );
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
    // Memoize parsed text to avoid re-parsing on every render
    const parsedText = useMemo(() => {
        return parse(children || '', { renderer: renderer as any }) as string;
    }, [children]);

    const { loading } = useChat();

    // Show full text only when not loading (allows viewing complete responses)
    const displayText = useMemo(() => {
        return safeLongText(parsedText.trim(), !loading);
    }, [parsedText, loading]);

    return <Text>{displayText}</Text>;
});

export default Markdown;
