import { useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Box, Text, useFocus } from 'ink';
import chalk from 'chalk';
import { Key } from 'ink';
import useInput from '../../../utils/use-input';
import { useMultiLineInput } from '../../../hooks/useMultiLineInput';
import {
    calculateVisibleRange,
    ensureCursorVisible,
} from './textInputUtils.js';

/**
 * Props for MultiLineTextInput component
 */
export type MultiLineProps = {
    readonly id?: string;
    readonly placeholder?: string;
    readonly autoFocus?: boolean;
    readonly showCursor?: boolean;
    readonly value: string;
    readonly onChange?: (value: string) => void;
    readonly onSubmit?: (value: string) => void;
    readonly onHotKey?: (value: string, key: Key) => boolean;
    readonly disabled?: boolean;
    readonly maxVisibleLines?: number; // Maximum visible lines (auto-calculate if not provided)
    readonly enableVirtualScroll?: boolean; // Enable virtual scrolling
};

/**
 * Props for LineRenderer component
 */
interface LineRendererProps {
    content: string;
    lineNumber: number;
    showCursor: boolean;
    cursorColumn: number;
    isFocused: boolean;
}

/**
 * LineRenderer - renders a single line with optional cursor
 * Memoized for performance optimization
 */
const LineRenderer = memo(function LineRenderer({
    content,
    lineNumber,
    showCursor,
    cursorColumn,
    isFocused,
}: LineRendererProps) {
    const renderedLine = useMemo(() => {
        if (!showCursor || !isFocused) {
            return content;
        }

        // cursorColumn is character index, but for proper rendering with wide chars,
        // we need to render character-by-character
        const chars = Array.from(content); // Use Array.from to handle surrogate pairs properly

        let result = '';
        let currentIndex = 0;

        for (const char of chars) {
            // Check if this character should have the cursor
            if (currentIndex === cursorColumn) {
                result += chalk.inverse(char || ' ');
            } else {
                result += char;
            }
            currentIndex++;
        }

        // If cursor is at the end of the line
        if (cursorColumn >= chars.length) {
            result += chalk.inverse(' ');
        }

        return result;
    }, [content, showCursor, cursorColumn, isFocused]);

    return <Text>{renderedLine}</Text>;
});

/**
 * MultiLineTextInput - enhanced text input with multi-line support
 * Refactored to use useMultiLineInput hook for pure logic
 */
export function MultiLineTextInput({
    id,
    placeholder = '',
    autoFocus = true,
    showCursor = true,
    value: originalValue,
    onChange,
    onSubmit,
    onHotKey,
    disabled = false,
    maxVisibleLines: maxVisibleLinesProp,
    enableVirtualScroll = true,
}: MultiLineProps) {
    const { isFocused } = useFocus({ autoFocus, id });

    // Track if this update is from external prop change
    const isExternalUpdateRef = useRef(false);
    const previousValueRef = useRef(originalValue);

    // Use the refactored hook for pure logic
    const {
        text,
        lines,
        cursorLine,
        cursorColumn,
        moveLeft,
        moveRight,
        moveUp,
        moveDown,
        moveWordLeft,
        moveWordRight,
        moveToLineStart,
        moveToLineEnd,
        input,
        insertText,
        insertNewline,
        backspace,
        deleteChar,
        backspaceWord,
        deleteWord,
    } = useMultiLineInput(originalValue);

    // Track first visible line for virtual scrolling
    const firstVisibleLineRef = useRef(0);

    // Detect external prop changes
    useEffect(() => {
        // If originalValue changed and it's different from current text
        if (originalValue !== previousValueRef.current && originalValue !== text) {
            isExternalUpdateRef.current = true;
        }
        previousValueRef.current = originalValue;
    }, [originalValue, text]);

    // Sync hook state back to parent component
    useEffect(() => {
        // Skip onChange notification if this is an external update
        if (isExternalUpdateRef.current) {
            isExternalUpdateRef.current = false;
            return;
        }

        // Notify parent of changes
        if (text !== originalValue) {
            onChange?.(text);
        }
    }, [text, onChange, originalValue]);

    // Calculate max visible lines
    const maxVisibleLines = useMemo(() => {
        if (maxVisibleLinesProp) {
            return maxVisibleLinesProp;
        }
        return Math.min(10, lines.length);
    }, [maxVisibleLinesProp, lines.length]);

    // Update viewport to ensure cursor is visible
    useEffect(() => {
        firstVisibleLineRef.current = ensureCursorVisible(
            cursorLine,
            firstVisibleLineRef.current,
            maxVisibleLines,
            lines.length,
        );
    }, [cursorLine, maxVisibleLines, lines.length]);

    // Calculate visible range
    const { start: visibleStart, end: visibleEnd } = useMemo(
        () => calculateVisibleRange(lines.length, firstVisibleLineRef.current, maxVisibleLines),
        [lines.length, firstVisibleLineRef.current, maxVisibleLines],
    );

    // Handle input
    const handleInputChange = useCallback((char: string) => {
        input(char);
    }, [input]);

    // Handle newline
    const handleNewline = useCallback(() => {
        insertNewline();
    }, [insertNewline]);

    // Handle backspace
    const handleBackspace = useCallback(() => {
        backspace();
    }, [backspace]);

    // Handle delete
    const handleDelete = useCallback(() => {
        deleteChar();
    }, [deleteChar]);

    // Handle backspace word
    const handleBackspaceWord = useCallback(() => {
        backspaceWord();
    }, [backspaceWord]);

    // Handle delete word
    const handleDeleteWord = useCallback(() => {
        deleteWord();
    }, [deleteWord]);

    // Handle paste (multi-character or newline-containing input)
    const handlePaste = useCallback((text: string) => {
        insertText(text);
    }, [insertText]);

    useInput((inputStr, key) => {
        if (disabled || !isFocused) {
            return;
        }

        if (onHotKey) {
            const result = onHotKey(inputStr, key);
            if (!result) {
                return;
            }
        }

        // Block certain keys that are handled elsewhere
        if ((key.ctrl && inputStr === 'c') || key.tab || (key.shift && key.tab)) {
            return;
        }

        // Handle Enter key
        if (key.return) {
            // Regular Enter submits
            if (!key.ctrl && !key.alt) {
                onSubmit?.(text);
                return;
            }

            // Ctrl/Cmd + Enter for newline
            handleNewline();
            return;
        }

        // Handle arrow keys
        if (key.leftArrow) {
            if (!showCursor) return;

            if (key.ctrl || key.alt) {
                moveWordLeft();
            } else {
                moveLeft();
            }
            return;
        }

        if (key.rightArrow) {
            if (!showCursor) return;

            if (key.ctrl || key.alt) {
                moveWordRight();
            } else {
                moveRight();
            }
            return;
        }

        if (key.upArrow) {
            if (!showCursor) return;

            if (key.alt || key.ctrl) {
                // Cmd/Ctrl + Up: jump to line start
                moveToLineStart();
            } else {
                // Regular Up: move to previous line
                moveUp();
            }
            return;
        }

        if (key.downArrow) {
            if (!showCursor) return;

            if (key.alt || key.ctrl) {
                // Cmd/Ctrl + Down: jump to line end
                moveToLineEnd();
            } else {
                // Regular Down: move to next line
                moveDown();
            }
            return;
        }

        // Handle Home key (Ctrl+A or Cmd+Left)
        if ((key.ctrl && inputStr === 'a') || (key.alt && key.leftArrow)) {
            if (!showCursor) return;
            moveToLineStart();
            return;
        }

        // Handle End key (Ctrl+E or Cmd+Right)
        if ((key.ctrl && inputStr === 'e') || (key.alt && key.rightArrow)) {
            if (!showCursor) return;
            moveToLineEnd();
            return;
        }

        // Handle Backspace
        if (key.backspace) {
            if (key.ctrl || key.alt) {
                handleBackspaceWord();
            } else {
                handleBackspace();
            }
            return;
        }

        // Handle Delete
        if (key.delete) {
            if (key.ctrl || key.alt) {
                handleDeleteWord();
            } else {
                handleDelete();
            }
            return;
        }

        // Handle regular input or paste (multi-character input)
        if (inputStr) {
            // Detect paste: multi-character input or contains newlines
            if (inputStr.length > 1 || inputStr.includes('\n')) {
                // For paste, use handlePaste to mark as internal update
                handlePaste(inputStr);
            } else {
                handleInputChange(inputStr);
            }
        }
    });

    // Render visible lines
    const visibleLines = useMemo(() => {
        return lines.slice(visibleStart, visibleEnd);
    }, [lines, visibleStart, visibleEnd]);

    // Handle empty state
    const isEmpty = lines.length === 0 || lines.every((line) => line.length === 0);

    if (isEmpty) {
        if (!isFocused || !showCursor) {
            return <Text>{chalk.grey(placeholder)}</Text>;
        }
        return <Text>{chalk.inverse(placeholder[0] || ' ') + chalk.grey(placeholder.slice(1))}</Text>;
    }

    // Render lines with virtual scrolling
    return (
        <Box flexDirection="column">
            {visibleLines.map((line, index) => {
                const actualLineNumber = visibleStart + index;
                return (
                    <LineRenderer
                        key={actualLineNumber}
                        content={line}
                        lineNumber={actualLineNumber}
                        showCursor={showCursor && actualLineNumber === cursorLine}
                        cursorColumn={cursorColumn}
                        isFocused={isFocused}
                    />
                );
            })}
        </Box>
    );
}

export default MultiLineTextInput;
