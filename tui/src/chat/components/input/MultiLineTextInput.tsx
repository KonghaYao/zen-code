import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Box, Text, useFocus, useInput } from 'ink';
import chalk from 'chalk';
import { Key } from 'ink';
import stringWidth from 'string-width';
import {
    splitTextIntoLines,
    joinLinesIntoText,
    calculateVisibleRange,
    ensureCursorVisible,
    clampCursor,
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
 * Internal state for multi-line text input
 */
interface TextInputState {
    lines: string[];
    cursorLine: number;
    cursorColumn: number;
    firstVisibleLine: number;
}

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

    // Initialize state from value
    const [state, setState] = useState<TextInputState>(() => {
        const lines = splitTextIntoLines(originalValue);
        return {
            lines,
            cursorLine: lines.length - 1,
            cursorColumn: lines[lines.length - 1].length,
            firstVisibleLine: 0,
        };
    });

    // Sync state with external value changes
    useEffect(() => {
        setState((previousState) => {
            const lines = splitTextIntoLines(originalValue);

            // Clamp cursor to valid range
            const clamped = clampCursor(lines, previousState.cursorLine, previousState.cursorColumn);

            return {
                ...previousState,
                lines,
                ...clamped,
            };
        });
    }, [originalValue]);

    // Calculate max visible lines (terminal height - some padding)
    const maxVisibleLines = useMemo(() => {
        if (maxVisibleLinesProp) {
            return maxVisibleLinesProp;
        }
        // Default: show 10 lines or total lines, whichever is smaller
        return Math.min(10, state.lines.length);
    }, [maxVisibleLinesProp, state.lines.length]);

    // Calculate visible range
    const { start: visibleStart, end: visibleEnd } = useMemo(
        () => calculateVisibleRange(state.lines.length, state.firstVisibleLine, maxVisibleLines),
        [state.lines.length, state.firstVisibleLine, maxVisibleLines],
    );

    // Handle cursor move with viewport sync
    const moveCursor = useCallback(
        (newLine: number, newColumn: number) => {
            const clamped = clampCursor(state.lines, newLine, newColumn);
            const newFirstVisibleLine = ensureCursorVisible(
                clamped.line,
                state.firstVisibleLine,
                maxVisibleLines,
                state.lines.length,
            );

            setState({
                ...state,
                cursorLine: clamped.line,
                cursorColumn: clamped.column,
                firstVisibleLine: newFirstVisibleLine,
            });
        },
        [state, maxVisibleLines],
    );

    // Handle text change
    const handleChange = useCallback(
        (newLines: string[]) => {
            const newValue = joinLinesIntoText(newLines);
            onChange?.(newValue);
        },
        [onChange],
    );

    useInput((input, key) => {
        if (disabled) {
            return;
        }

        if (onHotKey) {
            const result = onHotKey(input, key);
            if (!result) {
                return;
            }
        }

        // Block certain keys that are handled elsewhere
        if ((key.ctrl && input === 'c') || key.tab || (key.shift && key.tab)) {
            return;
        }

        // Handle Enter key
        if (key.return) {
            // MODIFIED: Regular Enter submits (swapped from original)
            if (!key.ctrl && !key.meta) {
                onSubmit?.(joinLinesIntoText(state.lines));
                return;
            }

            // Ctrl/Cmd + Enter for newline
            const currentLine = state.lines[state.cursorLine];
            const beforeCursor = currentLine.slice(0, state.cursorColumn);
            const afterCursor = currentLine.slice(state.cursorColumn);

            const newLines = [...state.lines];
            newLines[state.cursorLine] = beforeCursor;
            newLines.splice(state.cursorLine + 1, 0, afterCursor);

            setState({
                lines: newLines,
                cursorLine: state.cursorLine + 1,
                cursorColumn: 0,
                firstVisibleLine: ensureCursorVisible(
                    state.cursorLine + 1,
                    state.firstVisibleLine,
                    maxVisibleLines,
                    newLines.length,
                ),
            });

            handleChange(newLines);
            return;
        }

        // Handle arrow keys
        if (key.leftArrow) {
            if (!showCursor) return;

            if (state.cursorColumn > 0) {
                // Move left within line
                moveCursor(state.cursorLine, state.cursorColumn - 1);
            } else if (state.cursorLine > 0) {
                // Move to end of previous line
                const prevLineLength = state.lines[state.cursorLine - 1].length;
                moveCursor(state.cursorLine - 1, prevLineLength);
            }
            return;
        }

        if (key.rightArrow) {
            if (!showCursor) return;

            if (state.cursorColumn < state.lines[state.cursorLine].length) {
                // Move right within line
                moveCursor(state.cursorLine, state.cursorColumn + 1);
            } else if (state.cursorLine < state.lines.length - 1) {
                // Move to start of next line
                moveCursor(state.cursorLine + 1, 0);
            }
            return;
        }

        if (key.upArrow) {
            if (!showCursor) return;

            if (key.meta || key.ctrl) {
                // Cmd/Ctrl + Up: jump to line start
                moveCursor(state.cursorLine, 0);
            } else {
                // Regular Up: move to previous line
                moveCursor(state.cursorLine - 1, state.cursorColumn);
            }
            return;
        }

        if (key.downArrow) {
            if (!showCursor) return;

            if (key.meta || key.ctrl) {
                // Cmd/Ctrl + Down: jump to line end
                moveCursor(state.cursorLine, state.lines[state.cursorLine].length);
            } else {
                // Regular Down: move to next line
                moveCursor(state.cursorLine + 1, state.cursorColumn);
            }
            return;
        }

        // Handle Home key (Ctrl+A or Cmd+Left)
        if ((key.ctrl && input === 'a') || (key.meta && key.leftArrow)) {
            if (!showCursor) return;
            moveCursor(state.cursorLine, 0);
            return;
        }

        // Handle End key (Ctrl+E or Cmd+Right)
        if ((key.ctrl && input === 'e') || (key.meta && key.rightArrow)) {
            if (!showCursor) return;
            moveCursor(state.cursorLine, state.lines[state.cursorLine].length);
            return;
        }

        // Handle Backspace
        if (key.backspace || key.delete) {
            if (state.cursorColumn > 0) {
                // Delete within line
                const currentLine = state.lines[state.cursorLine];
                const newLine = currentLine.slice(0, state.cursorColumn - 1) + currentLine.slice(state.cursorColumn);

                const newLines = [...state.lines];
                newLines[state.cursorLine] = newLine;

                setState({
                    ...state,
                    lines: newLines,
                    cursorColumn: state.cursorColumn - 1,
                });

                handleChange(newLines);
            } else if (state.cursorLine > 0) {
                // Merge with previous line
                const prevLineLength = state.lines[state.cursorLine - 1].length;
                const newLines = [...state.lines];
                newLines[state.cursorLine - 1] += newLines[state.cursorLine];
                newLines.splice(state.cursorLine, 1);

                setState({
                    lines: newLines,
                    cursorLine: state.cursorLine - 1,
                    cursorColumn: prevLineLength,
                    firstVisibleLine: ensureCursorVisible(
                        state.cursorLine - 1,
                        state.firstVisibleLine,
                        maxVisibleLines,
                        newLines.length,
                    ),
                });

                handleChange(newLines);
            }
            return;
        }

        // Handle regular input
        if (input) {
            // Check if input contains newlines (paste operation)
            if (input.includes('\n')) {
                // Multi-line paste
                const newLinesFromPaste = splitTextIntoLines(input);

                if (newLinesFromPaste.length === 1) {
                    // Single line (shouldn't happen with the check above, but handle anyway)
                    const currentLine = state.lines[state.cursorLine];
                    const newLine =
                        currentLine.slice(0, state.cursorColumn) + input + currentLine.slice(state.cursorColumn);

                    const newLines = [...state.lines];
                    newLines[state.cursorLine] = newLine;

                    setState({
                        ...state,
                        lines: newLines,
                        cursorColumn: state.cursorColumn + input.length,
                    });

                    handleChange(newLines);
                } else {
                    // Multi-line paste
                    const currentLine = state.lines[state.cursorLine];
                    const beforeCursor = currentLine.slice(0, state.cursorColumn);
                    const afterCursor = currentLine.slice(state.cursorColumn);

                    const newLines = [...state.lines];

                    // Replace current line with beforeCursor + first pasted line
                    newLines[state.cursorLine] = beforeCursor + newLinesFromPaste[0];

                    // Insert middle lines
                    const middleLines = newLinesFromPaste.slice(1, -1);
                    newLines.splice(state.cursorLine + 1, 0, ...middleLines);

                    // Insert last line + afterCursor
                    const lastLine = newLinesFromPaste[newLinesFromPaste.length - 1] + afterCursor;
                    newLines.splice(state.cursorLine + middleLines.length + 1, 0, lastLine);

                    const newCursorLine = state.cursorLine + newLinesFromPaste.length - 1;
                    const newCursorColumn = newLinesFromPaste[newLinesFromPaste.length - 1].length;

                    setState({
                        lines: newLines,
                        cursorLine: newCursorLine,
                        cursorColumn: newCursorColumn,
                        firstVisibleLine: ensureCursorVisible(
                            newCursorLine,
                            state.firstVisibleLine,
                            maxVisibleLines,
                            newLines.length,
                        ),
                    });

                    handleChange(newLines);
                }
            } else {
                // Single character/line input
                const currentLine = state.lines[state.cursorLine];
                const newLine =
                    currentLine.slice(0, state.cursorColumn) + input + currentLine.slice(state.cursorColumn);

                const newLines = [...state.lines];
                newLines[state.cursorLine] = newLine;

                setState({
                    ...state,
                    lines: newLines,
                    cursorColumn: state.cursorColumn + input.length,
                });

                handleChange(newLines);
            }
        }
    });

    // Render visible lines
    const visibleLines = useMemo(() => {
        return state.lines.slice(visibleStart, visibleEnd);
    }, [state.lines, visibleStart, visibleEnd]);

    // Handle empty state
    if (state.lines.length === 0 || (state.lines.length === 1 && state.lines[0] === '')) {
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
                        showCursor={showCursor && actualLineNumber === state.cursorLine}
                        cursorColumn={state.cursorColumn}
                        isFocused={isFocused}
                    />
                );
            })}
        </Box>
    );
}

export default MultiLineTextInput;
