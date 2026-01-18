import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Box, Text, useFocus } from 'ink';
import chalk from 'chalk';
import { Key } from 'ink';
import useInput from '../../../utils/use-input';
import {
    splitTextIntoLines,
    joinLinesIntoText,
    calculateVisibleRange,
    ensureCursorVisible,
    clampCursor,
} from './textInputUtils.js';

/**
 * Find word boundary for cursor movement
 * @param line - Current line text
 * @param cursorColumn - Current cursor position
 * @param direction - -1 for left, 1 for right
 * @returns New cursor column position
 */
function findWordBoundary(line: string, cursorColumn: number, direction: -1 | 1): number {
    const length = line.length;

    if (direction === -1) {
        // Moving left - find start of previous word
        if (cursorColumn === 0) return 0;

        let pos = cursorColumn - 1;

        // Skip trailing whitespace
        while (pos > 0 && /\s/.test(line[pos])) {
            pos--;
        }

        // Skip word characters
        while (pos > 0 && !/\s/.test(line[pos])) {
            pos--;
        }

        // Move to first character of the word
        if (pos > 0 || (pos === 0 && !/\s/.test(line[0]))) {
            return pos;
        }
        return 0;
    } else {
        // Moving right - find start of next word
        if (cursorColumn >= length) return length;

        let pos = cursorColumn;

        // Skip word characters
        while (pos < length && !/\s/.test(line[pos])) {
            pos++;
        }

        // Skip whitespace
        while (pos < length && /\s/.test(line[pos])) {
            pos++;
        }

        return pos;
    }
}

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

    // MODIFIED: Track if we're doing internal updates to skip useEffect sync
    const isInternalUpdateRef = useRef(false);
    // MODIFIED: Store previous value to detect real external changes
    const previousValueRef = useRef(originalValue);

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
        // MODIFIED: Skip sync if this is an internal update
        if (isInternalUpdateRef.current) {
            isInternalUpdateRef.current = false; // Reset flag immediately
            previousValueRef.current = originalValue; // Update previous value
            return;
        }

        // MODIFIED: Only sync if value actually changed from previous external value
        if (originalValue === previousValueRef.current) {
            return;
        }

        setState((previousState) => {
            const lines = splitTextIntoLines(originalValue);
            const newValue = joinLinesIntoText(lines);
            const oldValue = joinLinesIntoText(previousState.lines);

            // Only update if value actually changed (avoid cursor reset on every input)
            if (newValue === oldValue) {
                return previousState;
            }

            // Clamp cursor to valid range
            const clamped = clampCursor(lines, previousState.cursorLine, previousState.cursorColumn);

            return {
                ...previousState,
                lines,
                ...clamped,
            };
        });

        previousValueRef.current = originalValue;
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
            // MODIFIED: Mark as internal update before calling onChange
            isInternalUpdateRef.current = true;
            onChange?.(newValue);
        },
        [onChange],
    );

    useInput((input, key) => {
        if (disabled || !isFocused) {
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
            if (!key.ctrl && !key.alt) {
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

            if (key.ctrl || key.alt) {
                // Ctrl (Windows) or Option/Alt (macOS): jump word left
                const currentLine = state.lines[state.cursorLine];
                const newColumn = findWordBoundary(currentLine, state.cursorColumn, -1);
                moveCursor(state.cursorLine, newColumn);
            } else if (state.cursorColumn > 0) {
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

            if (key.ctrl || key.alt) {
                // Ctrl (Windows) or Option/Alt (macOS): jump word right
                const currentLine = state.lines[state.cursorLine];
                const newColumn = findWordBoundary(currentLine, state.cursorColumn, 1);
                moveCursor(state.cursorLine, newColumn);
            } else if (state.cursorColumn < state.lines[state.cursorLine].length) {
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

            if (key.alt || key.ctrl) {
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

            if (key.alt || key.ctrl) {
                // Cmd/Ctrl + Down: jump to line end
                moveCursor(state.cursorLine, state.lines[state.cursorLine].length);
            } else {
                // Regular Down: move to next line
                moveCursor(state.cursorLine + 1, state.cursorColumn);
            }
            return;
        }

        // Handle Home key (Ctrl+A or Cmd+Left)
        if ((key.ctrl && input === 'a') || (key.alt && key.leftArrow)) {
            if (!showCursor) return;
            moveCursor(state.cursorLine, 0);
            return;
        }

        // Handle End key (Ctrl+E or Cmd+Right)
        if ((key.ctrl && input === 'e') || (key.alt && key.rightArrow)) {
            if (!showCursor) return;
            moveCursor(state.cursorLine, state.lines[state.cursorLine].length);
            return;
        }
        // Handle Backspace (delete backward)
        if (key.backspace) {
            // MODIFIED: Clamp cursor to valid range before processing
            // This fixes the issue where cursorColumn > line.length
            const clamped = clampCursor(state.lines, state.cursorLine, state.cursorColumn);
            const needsClamp = clamped.column !== state.cursorColumn || clamped.line !== state.cursorLine;

            // Use clamped cursor position for processing
            const cursorLine = clamped.line;
            const cursorColumn = clamped.column;

            if (key.ctrl || key.alt) {
                // Ctrl+Backspace or Cmd+Backspace: delete word backward
                const currentLine = state.lines[cursorLine];

                if (cursorColumn > 0) {
                    // Find the word boundary to the left
                    const wordStart = findWordBoundary(currentLine, cursorColumn, -1);

                    if (wordStart < cursorColumn) {
                        // Delete from word start to cursor
                        const newLine = currentLine.slice(0, wordStart) + currentLine.slice(cursorColumn);
                        const newLines = [...state.lines];
                        newLines[cursorLine] = newLine;

                        const newValue = joinLinesIntoText(newLines);

                        setState({
                            ...state,
                            lines: newLines,
                            cursorLine: needsClamp ? cursorLine : state.cursorLine,
                            cursorColumn: wordStart,
                        });

                        // MODIFIED: Mark as internal update before calling onChange
                        isInternalUpdateRef.current = true;
                        onChange?.(newValue);
                    }
                } else if (cursorLine > 0) {
                    // At line start - delete newline (merge with previous line)
                    const prevLine = state.lines[cursorLine - 1];
                    const newLines = [...state.lines];
                    newLines[cursorLine - 1] = prevLine + currentLine;
                    newLines.splice(cursorLine, 1);

                    const newValue = joinLinesIntoText(newLines);

                    setState({
                        lines: newLines,
                        cursorLine: cursorLine - 1,
                        cursorColumn: prevLine.length,
                        firstVisibleLine: ensureCursorVisible(
                            cursorLine - 1,
                            state.firstVisibleLine,
                            maxVisibleLines,
                            newLines.length,
                        ),
                    });

                    // MODIFIED: Mark as internal update before calling onChange
                    isInternalUpdateRef.current = true;
                    onChange?.(newValue);
                }
            } else {
                // Regular Backspace: delete single character
                if (cursorColumn > 0) {
                    const currentLine = state.lines[cursorLine];
                    const newLine =
                        currentLine.slice(0, cursorColumn - 1) + currentLine.slice(cursorColumn);

                    const newLines = [...state.lines];
                    newLines[cursorLine] = newLine;

                    const newValue = joinLinesIntoText(newLines);

                    setState({
                        ...state,
                        lines: newLines,
                        cursorLine: needsClamp ? cursorLine : state.cursorLine,
                        cursorColumn: cursorColumn - 1,
                    });

                    // MODIFIED: Mark as internal update before calling onChange
                    isInternalUpdateRef.current = true;
                    onChange?.(newValue);
                } else if (cursorLine > 0) {
                    // At line start - delete newline character (merge lines)
                    const prevLine = state.lines[cursorLine - 1];
                    const currentLine = state.lines[cursorLine];
                    const newLines = [...state.lines];

                    newLines[cursorLine - 1] = prevLine + currentLine;
                    newLines.splice(cursorLine, 1);

                    const newFirstVisibleLine = ensureCursorVisible(
                        cursorLine - 1,
                        state.firstVisibleLine,
                        maxVisibleLines,
                        newLines.length,
                    );

                    const newValue = joinLinesIntoText(newLines);

                    setState({
                        lines: newLines,
                        cursorLine: cursorLine - 1,
                        cursorColumn: prevLine.length,
                        firstVisibleLine: newFirstVisibleLine,
                    });

                    // MODIFIED: Mark as internal update before calling onChange
                    isInternalUpdateRef.current = true;
                    onChange?.(newValue);
                }
            }
            return;
        }

        // Handle Delete (delete forward)
        if (key.delete) {
            const currentLine = state.lines[state.cursorLine];

            if (key.ctrl || key.alt) {
                // Ctrl+Delete or Cmd+Delete: delete word forward
                if (state.cursorColumn < currentLine.length) {
                    // Find the word boundary to the right
                    const wordEnd = findWordBoundary(currentLine, state.cursorColumn, 1);

                    if (wordEnd > state.cursorColumn) {
                        // Delete from cursor to word end
                        const newLine = currentLine.slice(0, state.cursorColumn) + currentLine.slice(wordEnd);
                        const newLines = [...state.lines];
                        newLines[state.cursorLine] = newLine;

                        setState({
                            ...state,
                            lines: newLines,
                        });

                        handleChange(newLines);
                    }
                } else if (state.cursorLine < state.lines.length - 1) {
                    // At line end - merge with next line
                    const nextLine = state.lines[state.cursorLine + 1];
                    const newLines = [...state.lines];

                    newLines[state.cursorLine] = currentLine + nextLine;
                    newLines.splice(state.cursorLine + 1, 1);

                    setState({
                        ...state,
                        lines: newLines,
                    });

                    handleChange(newLines);
                }
            } else {
                // Regular Delete: delete single character
                if (state.cursorColumn < currentLine.length) {
                    const newLine =
                        currentLine.slice(0, state.cursorColumn) + currentLine.slice(state.cursorColumn + 1);

                    const newLines = [...state.lines];
                    newLines[state.cursorLine] = newLine;

                    setState({
                        ...state,
                        lines: newLines,
                    });

                    handleChange(newLines);
                } else if (state.cursorLine < state.lines.length - 1) {
                    // At line end - merge with next line
                    const nextLine = state.lines[state.cursorLine + 1];
                    const newLines = [...state.lines];

                    newLines[state.cursorLine] = currentLine + nextLine;
                    newLines.splice(state.cursorLine + 1, 1);

                    setState({
                        ...state,
                        lines: newLines,
                    });

                    handleChange(newLines);
                }
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

    // Handle empty state - check if all lines are completely empty (length === 0)
    const isEmpty = state.lines.length === 0 || state.lines.every((line) => line.length === 0);

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
