/**
 * TUI Text Truncation Utilities
 *
 * Provides utilities for truncating text in terminal UI to prevent overflow.
 */

/**
 * Configuration for different text contexts
 */
export const TRUNCATION_CONFIG = {
    /** Title text in selection renderer - most prominent */
    title: {
        maxWidth: 60,
        ellipsis: '…',
    },
    /** Description text - can be slightly longer */
    description: {
        maxWidth: 80,
        ellipsis: '…',
    },
    /** Option label text - compact but readable */
    optionLabel: {
        maxWidth: 50,
        ellipsis: '…',
    },
    /** Tab label - needs to fit in tab bar */
    tabLabel: {
        maxWidth: 30,
        ellipsis: '…',
    },
    /** Full question/title shown in tabs */
    fullTitle: {
        maxWidth: 80,
        ellipsis: '…',
    },
};

/**
 * Truncates a single line of text to fit within the specified max width
 * @param text - The text to truncate
 * @param maxWidth - Maximum width (default: 60 for titles)
 * @param ellipsis - Ellipsis character(s) to append (default: '...')
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxWidth: number = 20, ellipsis: string = '…'): string => {
    if (!text) return '';
    if (text.length <= maxWidth) return text;
    return text.substring(0, maxWidth - ellipsis.length) + ellipsis;
};

/**
 * Truncates text based on context configuration
 * @param text - Text to truncate
 * @param context - Which context to use for truncation
 * @returns Truncated text
 */
export const truncateByContext = (text: string, context: keyof typeof TRUNCATION_CONFIG): string => {
    const config = TRUNCATION_CONFIG[context];
    return truncateText(text, config.maxWidth, config.ellipsis);
};
