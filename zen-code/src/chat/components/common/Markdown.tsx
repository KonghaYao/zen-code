import MarkdownRenderer from 'ink-markdown-es';
import { SimpleMarkdown } from './SimpleMarkdown';
import { memo, useMemo } from 'react';

interface MarkdownProps {
    children: string;
    simple?: boolean;
    loading: boolean;
    maxRows?: number;
}

/**
 * Truncates long text to fit within terminal bounds.
 * @param text - The full text to potentially truncate
 * @param isLoading - If true, truncates text; otherwise shows full text
 * @param maxRows - Maximum number of rows to display when truncated
 * @returns Truncated text with row count indicator, or full text
 */
export const safeLongText = (text: string, isLoading: boolean, maxRows: number = 5): string => {
    if (!isLoading || !text || text.trim() === '') {
        return text;
    }

    const lines = text.split('\n');

    if (lines.length <= maxRows) {
        return text;
    }

    const hiddenCount = lines.length - maxRows;
    const visibleLines = lines.slice(-maxRows);

    return `\u001b[33m${hiddenCount} rows hidden...\u001b[0m\n${visibleLines.join('\n')}`;
};

const Markdown: React.FC<MarkdownProps> = ({ children, simple, loading, maxRows = 5 }) => {
    const displayText = useMemo(() => {
        return safeLongText(children, loading, maxRows);
    }, [children, loading, maxRows]);

    if (simple) {
        return <SimpleMarkdown>{displayText}</SimpleMarkdown>;
    }

    return <MarkdownRenderer>{displayText}</MarkdownRenderer>;
};

export default memo(Markdown);
