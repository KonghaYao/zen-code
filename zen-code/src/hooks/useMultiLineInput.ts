/**
 * Pure logic hook for multi-line text input
 * Handles cursor movement, text editing, and line management
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

export interface MultiLineInputState {
    text: string;
    lines: string[];
    cursorLine: number;
    cursorColumn: number;
}

export interface UseMultiLineInputReturn extends MultiLineInputState {
    // Character movement
    moveLeft: () => void;
    moveRight: () => void;
    moveUp: () => void;
    moveDown: () => void;

    // Word movement
    moveWordLeft: () => void;
    moveWordRight: () => void;

    // Line navigation
    moveToLineStart: () => void;
    moveToLineEnd: () => void;

    // Text editing
    input: (char: string) => void;
    insertText: (text: string) => void;
    insertNewline: () => void;

    // Deletion
    backspace: () => void;
    deleteChar: () => void;
    backspaceWord: () => void;
    deleteWord: () => void;
}

interface InternalState {
    lines: string[];
    cursorLine: number;
    cursorColumn: number;
    desiredColumn: number | null;
}

/**
 * Split text into lines, preserving empty lines
 */
function splitIntoLines(text: string): string[] {
    if (text.length === 0) {
        return [''];
    }

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    // If text ends with \n, split() doesn't add an empty string at the end
    // so we need to add it manually to preserve the trailing newline
    if (normalized.endsWith('\n') && lines[lines.length - 1] !== '') {
        lines.push('');
    }

    return lines;
}

/**
 * Join lines into text with newlines
 */
function joinLines(lines: string[]): string {
    return lines.join('\n');
}

/**
 * Find word boundary for cursor movement
 * For direction -1: returns start of word
 * For direction 1: returns end of next word (position after last character)
 */
function findWordBoundary(line: string, cursorColumn: number, direction: -1 | 1): number {
    const length = line.length;

    if (direction === -1) {
        // Moving left - find start of previous word
        if (cursorColumn === 0) return 0;

        let pos = cursorColumn - 1;

        // Skip trailing whitespace
        while (pos >= 0 && /\s/.test(line[pos])) {
            pos--;
        }

        // Skip word characters
        while (pos >= 0 && !/\s/.test(line[pos])) {
            pos--;
        }

        // pos is now at the character before the word (or -1)
        // Move to first character of the word
        const result = pos + 1;
        return Math.max(0, result);
    } else {
        // Moving right - find end of next word
        if (cursorColumn >= length) return length;

        let pos = cursorColumn;

        // Skip whitespace to find start of next word
        while (pos < length && /\s/.test(line[pos])) {
            pos++;
        }

        // Skip word characters to find end of word
        while (pos < length && !/\s/.test(line[pos])) {
            pos++;
        }

        return pos;
    }
}

/**
 * Initialize state from text
 */
function initializeState(text: string): InternalState {
    const lines = splitIntoLines(text);
    return {
        lines,
        cursorLine: lines.length - 1,
        cursorColumn: lines[lines.length - 1].length,
        desiredColumn: null,
    };
}

/**
 * Hook for multi-line text input with full cursor navigation
 */
export function useMultiLineInput(initialText: string = ''): UseMultiLineInputReturn {
    // Single state object to avoid batching issues
    const [state, setState] = useState<InternalState>(() => initializeState(initialText));

    // Track previous initialText to detect external changes
    const prevInitialTextRef = useRef(initialText);

    // Sync with external initialText changes (when controlled by parent)
    useEffect(() => {
        // Skip if initialText hasn't changed
        if (initialText === prevInitialTextRef.current) {
            return;
        }

        // Use functional setState to get fresh state
        setState(prevState => {
            const currentText = joinLines(prevState.lines);

            // Only update if external value differs from current state
            if (initialText !== currentText) {
                return initializeState(initialText);
            }

            return prevState;
        });

        prevInitialTextRef.current = initialText;
    }, [initialText]); // Only depend on initialText, using functional update

    // Helper: clamp cursor to valid position
    const clampCursor = useCallback((line: number, column: number) => {
        const clampedLine = Math.max(0, Math.min(line, state.lines.length - 1));
        const clampedColumn = Math.max(0, Math.min(column, state.lines[clampedLine]?.length || 0));
        return { line: clampedLine, column: clampedColumn };
    }, [state.lines]);

    // Character movement
    const moveLeft = useCallback(() => {
        setState(prev => {
            if (prev.cursorColumn > 0) {
                // Move left within line
                return { ...prev, cursorColumn: prev.cursorColumn - 1, desiredColumn: null };
            } else if (prev.cursorLine > 0) {
                // Move to end of previous line
                const prevLineLength = prev.lines[prev.cursorLine - 1].length;
                return {
                    ...prev,
                    cursorLine: prev.cursorLine - 1,
                    cursorColumn: prevLineLength,
                    desiredColumn: null,
                };
            }
            // At start of text, force state update
            return { ...prev, desiredColumn: null };
        });
    }, []);

    const moveRight = useCallback(() => {
        setState(prev => {
            if (prev.cursorColumn < prev.lines[prev.cursorLine].length) {
                // Move right within line
                return { ...prev, cursorColumn: prev.cursorColumn + 1, desiredColumn: null };
            } else if (prev.cursorLine < prev.lines.length - 1) {
                // Move to start of next line
                return {
                    ...prev,
                    cursorLine: prev.cursorLine + 1,
                    cursorColumn: 0,
                    desiredColumn: null,
                };
            }
            return { ...prev, desiredColumn: null };
        });
    }, []);

    const moveUp = useCallback(() => {
        setState(prev => {
            const targetLine = prev.cursorLine - 1;
            const targetColumn = prev.desiredColumn ?? prev.cursorColumn;

            if (targetLine < 0) {
                // Already at first line, stay there
                return prev.desiredColumn !== null
                    ? { ...prev, desiredColumn: targetColumn }
                    : { ...prev, desiredColumn: prev.cursorColumn };
            }

            const clampedLine = Math.max(0, Math.min(targetLine, prev.lines.length - 1));
            const maxColumn = prev.lines[clampedLine]?.length || 0;
            const clampedColumn = Math.min(targetColumn, maxColumn);

            return {
                ...prev,
                cursorLine: clampedLine,
                cursorColumn: clampedColumn,
                desiredColumn: prev.desiredColumn !== null ? prev.desiredColumn : targetColumn,
            };
        });
    }, []);

    const moveDown = useCallback(() => {
        setState(prev => {
            const targetLine = prev.cursorLine + 1;
            const targetColumn = prev.desiredColumn ?? prev.cursorColumn;

            if (targetLine >= prev.lines.length) {
                // Already at last line, stay there
                return prev.desiredColumn !== null
                    ? { ...prev, desiredColumn: targetColumn }
                    : { ...prev, desiredColumn: prev.cursorColumn };
            }

            const clampedLine = Math.max(0, Math.min(targetLine, prev.lines.length - 1));
            const maxColumn = prev.lines[clampedLine]?.length || 0;
            const clampedColumn = Math.min(targetColumn, maxColumn);

            return {
                ...prev,
                cursorLine: clampedLine,
                cursorColumn: clampedColumn,
                desiredColumn: prev.desiredColumn !== null ? prev.desiredColumn : targetColumn,
            };
        });
    }, []);

    // Word movement
    const moveWordLeft = useCallback(() => {
        setState(prev => {
            if (prev.cursorColumn > 0) {
                const currentLine = prev.lines[prev.cursorLine];

                // Check if we're at the start of a word
                const atWordStart = prev.cursorColumn > 0 &&
                    !/\s/.test(currentLine[prev.cursorColumn]) &&
                    (prev.cursorColumn === 0 || /\s/.test(currentLine[prev.cursorColumn - 1]));

                if (atWordStart) {
                    // Already at word start, move to previous word
                    const prevWordColumn = findWordBoundary(currentLine, prev.cursorColumn, -1);
                    return { ...prev, cursorColumn: prevWordColumn, desiredColumn: null };
                }

                // Move to start of current/next word
                const newColumn = findWordBoundary(currentLine, prev.cursorColumn, -1);
                return { ...prev, cursorColumn: newColumn, desiredColumn: null };
            } else if (prev.cursorLine > 0) {
                const prevLineLength = prev.lines[prev.cursorLine - 1].length;
                return {
                    ...prev,
                    cursorLine: prev.cursorLine - 1,
                    cursorColumn: prevLineLength,
                    desiredColumn: null,
                };
            }
            return { ...prev, desiredColumn: null };
        });
    }, []);

    const moveWordRight = useCallback(() => {
        setState(prev => {
            if (prev.cursorColumn < prev.lines[prev.cursorLine].length) {
                const newColumn = findWordBoundary(prev.lines[prev.cursorLine], prev.cursorColumn, 1);
                return { ...prev, cursorColumn: newColumn, desiredColumn: null };
            } else if (prev.cursorLine < prev.lines.length - 1) {
                return {
                    ...prev,
                    cursorLine: prev.cursorLine + 1,
                    cursorColumn: 0,
                    desiredColumn: null,
                };
            }
            return { ...prev, desiredColumn: null };
        });
    }, []);

    // Line navigation
    const moveToLineStart = useCallback(() => {
        setState(prev => ({ ...prev, cursorColumn: 0, desiredColumn: null }));
    }, []);

    const moveToLineEnd = useCallback(() => {
        setState(prev => ({
            ...prev,
            cursorColumn: prev.lines[prev.cursorLine].length,
            desiredColumn: null,
        }));
    }, []);

    // Text editing
    const input = useCallback((char: string) => {
        setState(prev => {
            // Handle \n as newline (ignore \r, will be handled by text normalization)
            if (char === '\n') {
                // Insert newline at cursor position
                const currentLine = prev.lines[prev.cursorLine];
                const beforeCursor = currentLine.slice(0, prev.cursorColumn);
                const afterCursor = currentLine.slice(prev.cursorColumn);

                const newLines = [...prev.lines];
                newLines[prev.cursorLine] = beforeCursor;
                newLines.splice(prev.cursorLine + 1, 0, afterCursor);

                return {
                    ...prev,
                    lines: newLines,
                    cursorLine: prev.cursorLine + 1,
                    cursorColumn: 0,
                    desiredColumn: null,
                };
            }

            const currentLine = prev.lines[prev.cursorLine];
            // Insert character BEFORE cursor position
            const newLine = currentLine.slice(0, prev.cursorColumn) + char + currentLine.slice(prev.cursorColumn);

            const newLines = [...prev.lines];
            newLines[prev.cursorLine] = newLine;

            return {
                ...prev,
                lines: newLines,
                cursorColumn: prev.cursorColumn + 1, // Move after inserted char
                desiredColumn: null,
            };
        });
    }, []);

    const insertText = useCallback((textToInsert: string) => {
        setState(prev => {
            // Check for any newline character (\n, \r, or \r\n)
            const hasNewline = textToInsert.includes('\n') || textToInsert.includes('\r');

            if (!hasNewline) {
                // Single line insert
                const currentLine = prev.lines[prev.cursorLine];
                const newLine = currentLine.slice(0, prev.cursorColumn) + textToInsert + currentLine.slice(prev.cursorColumn);

                const newLines = [...prev.lines];
                newLines[prev.cursorLine] = newLine;

                return {
                    ...prev,
                    lines: newLines,
                    cursorColumn: prev.cursorColumn + textToInsert.length,
                    desiredColumn: null,
                };
            } else {
                // Multi-line insert - splitIntoLines will normalize \r\n and \r to \n
                const insertLines = splitIntoLines(textToInsert);
                const currentLine = prev.lines[prev.cursorLine];
                const beforeCursor = currentLine.slice(0, prev.cursorColumn);
                const afterCursor = currentLine.slice(prev.cursorColumn);

                // Build new lines array: preserve lines before, replace current line, add inserted lines, preserve lines after
                const newLines = [
                    ...prev.lines.slice(0, prev.cursorLine),
                    beforeCursor + insertLines[0],
                    ...insertLines.slice(1, -1),
                    insertLines[insertLines.length - 1] + afterCursor,
                    ...prev.lines.slice(prev.cursorLine + 1),
                ];

                const newCursorLine = prev.cursorLine + insertLines.length - 1;
                const newCursorColumn = insertLines[insertLines.length - 1].length;

                return {
                    ...prev,
                    lines: newLines,
                    cursorLine: newCursorLine,
                    cursorColumn: newCursorColumn,
                    desiredColumn: null,
                };
            }
        });
    }, []);

    const insertNewline = useCallback(() => {
        setState(prev => {
            const currentLine = prev.lines[prev.cursorLine];
            const beforeCursor = currentLine.slice(0, prev.cursorColumn);
            const afterCursor = currentLine.slice(prev.cursorColumn);

            const newLines = [...prev.lines];
            newLines[prev.cursorLine] = beforeCursor;
            newLines.splice(prev.cursorLine + 1, 0, afterCursor);

            return {
                ...prev,
                lines: newLines,
                cursorLine: prev.cursorLine + 1,
                cursorColumn: 0,
                desiredColumn: null,
            };
        });
    }, []);

    // Deletion
    const backspace = useCallback(() => {
        setState(prev => {
            if (prev.cursorColumn > 0) {
                // Delete character within line
                const currentLine = prev.lines[prev.cursorLine];
                const newLine = currentLine.slice(0, prev.cursorColumn - 1) + currentLine.slice(prev.cursorColumn);

                const newLines = [...prev.lines];
                newLines[prev.cursorLine] = newLine;

                return {
                    ...prev,
                    lines: newLines,
                    cursorColumn: prev.cursorColumn - 1,
                    desiredColumn: null,
                };
            } else if (prev.cursorLine > 0) {
                // Join with previous line
                const prevLine = prev.lines[prev.cursorLine - 1];
                const currentLine = prev.lines[prev.cursorLine];

                const newLines = [...prev.lines];
                newLines[prev.cursorLine - 1] = prevLine + currentLine;
                newLines.splice(prev.cursorLine, 1);

                return {
                    ...prev,
                    lines: newLines,
                    cursorLine: prev.cursorLine - 1,
                    cursorColumn: prevLine.length,
                    desiredColumn: null,
                };
            }
            return { ...prev, desiredColumn: null };
        });
    }, []);

    const deleteChar = useCallback(() => {
        setState(prev => {
            const currentLine = prev.lines[prev.cursorLine];

            if (prev.cursorColumn < currentLine.length) {
                // Delete character within line
                const newLine = currentLine.slice(0, prev.cursorColumn) + currentLine.slice(prev.cursorColumn + 1);

                const newLines = [...prev.lines];
                newLines[prev.cursorLine] = newLine;

                return { ...prev, lines: newLines, desiredColumn: null };
            } else if (prev.cursorLine < prev.lines.length - 1) {
                // Join with next line
                const nextLine = prev.lines[prev.cursorLine + 1];

                const newLines = [...prev.lines];
                newLines[prev.cursorLine] = currentLine + nextLine;
                newLines.splice(prev.cursorLine + 1, 1);

                return { ...prev, lines: newLines, desiredColumn: null };
            }
            return { ...prev, desiredColumn: null };
        });
    }, []);

    const backspaceWord = useCallback(() => {
        setState(prev => {
            const currentLine = prev.lines[prev.cursorLine];

            if (prev.cursorColumn > 0) {
                // Find word boundary
                const wordStart = findWordBoundary(currentLine, prev.cursorColumn, -1);

                if (wordStart < prev.cursorColumn) {
                    const newLine = currentLine.slice(0, wordStart) + currentLine.slice(prev.cursorColumn);
                    const newLines = [...prev.lines];
                    newLines[prev.cursorLine] = newLine;

                    return {
                        ...prev,
                        lines: newLines,
                        cursorColumn: wordStart,
                        desiredColumn: null,
                    };
                }
                return { ...prev, desiredColumn: null };
            } else if (prev.cursorLine > 0) {
                // At line start, delete newline (merge with previous line)
                const prevLine = prev.lines[prev.cursorLine - 1];
                const newLines = [...prev.lines];
                newLines[prev.cursorLine - 1] = prevLine + currentLine;
                newLines.splice(prev.cursorLine, 1);

                return {
                    ...prev,
                    lines: newLines,
                    cursorLine: prev.cursorLine - 1,
                    cursorColumn: prevLine.length,
                    desiredColumn: null,
                };
            }
            return { ...prev, desiredColumn: null };
        });
    }, []);

    const deleteWord = useCallback(() => {
        setState(prev => {
            const currentLine = prev.lines[prev.cursorLine];

            if (prev.cursorColumn < currentLine.length) {
                // Find word boundary
                const wordEnd = findWordBoundary(currentLine, prev.cursorColumn, 1);

                if (wordEnd > prev.cursorColumn) {
                    const newLine = currentLine.slice(0, prev.cursorColumn) + currentLine.slice(wordEnd);
                    const newLines = [...prev.lines];
                    newLines[prev.cursorLine] = newLine;

                    return { ...prev, lines: newLines, desiredColumn: null };
                }
                return { ...prev, desiredColumn: null };
            } else if (prev.cursorLine < prev.lines.length - 1) {
                // At line end, merge with next line
                const nextLine = prev.lines[prev.cursorLine + 1];
                const newLines = [...prev.lines];
                newLines[prev.cursorLine] = currentLine + nextLine;
                newLines.splice(prev.cursorLine + 1, 1);

                return { ...prev, lines: newLines, desiredColumn: null };
            }
            return { ...prev, desiredColumn: null };
        });
    }, []);

    // Computed text
    const text = useMemo(() => joinLines(state.lines), [state.lines]);

    return {
        text,
        lines: state.lines,
        cursorLine: state.cursorLine,
        cursorColumn: state.cursorColumn,
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
    };
}
