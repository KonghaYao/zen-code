import { useState, useEffect } from 'react';
import { Text, useFocus, useInput } from 'ink';
import chalk from 'chalk';
import { Key } from 'ink';
import { MultiLineTextInput, MultiLineProps } from './MultiLineTextInput.js';

export type Props = {
    readonly id?: string;
    /**
     * Text to display when `value` is empty.
     */
    readonly placeholder?: string;

    /**
     * Listen to user's input. Useful in case there are multiple input components
     * at the same time and input must be "routed" to a specific component.
     */
    readonly autoFocus?: boolean; // eslint-disable-line react/boolean-prop-naming

    /**
     * Replace all chars and mask the value. Useful for password inputs.
     */
    readonly mask?: string;

    /**
     * Whether to show cursor and allow navigation inside text input with arrow keys.
     */
    readonly showCursor?: boolean; // eslint-disable-line react/boolean-prop-naming

    /**
     * Highlight pasted text
     */
    readonly highlightPastedText?: boolean; // eslint-disable-line react/boolean-prop-naming

    /**
     * Value to display in a text input.
     */
    readonly value: string;

    /**
     * Function to call when value updates.
     */
    readonly onChange?: (value: string) => void;

    readonly onHotKey?: (value: string, key: Key) => boolean;

    /**
     * Function to call when `Enter` is pressed, where first argument is a value of the input.
     */
    readonly onSubmit?: (value: string) => void;

    /**
     * Whether the input is disabled and cannot be edited.
     */
    readonly disabled?: boolean; // eslint-disable-line react/boolean-prop-naming
};

function TextInput({
    value: originalValue,
    placeholder = '',
    mask,
    highlightPastedText = false,
    showCursor = true,
    autoFocus = true,
    onChange,
    onSubmit,
    onHotKey,
    disabled = false,
    id,
}: Props) {
    const { isFocused: focus } = useFocus({ autoFocus, id });
    const [state, setState] = useState({
        cursorOffset: (originalValue || '').length,
        cursorWidth: 0,
    });

    const { cursorOffset, cursorWidth } = state;

    useEffect(() => {
        setState((previousState) => {
            if (!focus || !showCursor) {
                return previousState;
            }

            const newValue = originalValue || '';

            // Clamp cursorOffset to valid range [0, newValue.length]
            if (previousState.cursorOffset > newValue.length) {
                return {
                    cursorOffset: newValue.length,
                    cursorWidth: 0,
                };
            }

            return previousState;
        });
    }, [originalValue, focus, showCursor]);

    const cursorActualWidth = highlightPastedText ? cursorWidth : 0;

    const value = mask ? mask.repeat(originalValue.length) : originalValue;
    let renderedValue = value;
    let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

    // Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes
    if (showCursor && focus && !disabled) {
        renderedPlaceholder =
            placeholder.length > 0
                ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
                : chalk.inverse(' ');

        // Initialize with empty string for text content
        renderedValue = '';
        let i = 0;

        // Find actual cursor position when dealing with newlines
        // If cursor is on a newline character (\n, \r, or \r\n), show it on the next character instead
        let actualCursorOffset = cursorOffset;
        if (cursorActualWidth === 0 && cursorOffset < value.length) {
            const char = value[cursorOffset];
            // Check for \n or standalone \r (not part of \r\n)
            if (char === '\n' || (char === '\r' && (cursorOffset + 1 >= value.length || value[cursorOffset + 1] !== '\n'))) {
                actualCursorOffset = cursorOffset + 1;
            }
            // If cursor is on \r in \r\n sequence, skip both characters
            if (char === '\r' && cursorOffset + 1 < value.length && value[cursorOffset + 1] === '\n') {
                actualCursorOffset = cursorOffset + 2;
            }
        }

        for (const char of value) {
            // Check if current position should be highlighted (cursor)
            // When cursorActualWidth > 0 (pasting), highlight the pasted range [cursorCursor - cursorActualWidth, cursorOffset)
            // Otherwise (normal mode), highlight only the character at actualCursorOffset position
            const isCursorActive = cursorActualWidth > 0
                ? (i >= cursorOffset - cursorActualWidth && i < cursorOffset && char !== '\n' && char !== '\r')
                : (i === actualCursorOffset);

            renderedValue += isCursorActive ? chalk.inverse(char) : char;

            i++;
        }

        // Show cursor at end if cursor is at the end of text
        if (actualCursorOffset === value.length) {
            renderedValue += chalk.inverse(' ');
        }
    }

    useInput(
        (input, key) => {
            if (disabled) {
                return;
            }

            if (onHotKey) {
                const result = onHotKey(input, key);
                if (!result) {
                    return;
                }
            }
            // Allow upArrow/downArrow only with meta/ctrl (for jump to line start/end)
            // Otherwise return early for regular up/down navigation
            if (
                (key.upArrow && !key.meta && !key.ctrl) ||
                (key.downArrow && !key.meta && !key.ctrl) ||
                (key.ctrl && input === 'c') ||
                key.tab ||
                (key.shift && key.tab)
            ) {
                return;
            }

            if (key.return) {
                if (onSubmit) {
                    onSubmit(originalValue);
                }

                return;
            }

            let nextCursorOffset = cursorOffset;
            let nextValue = originalValue;
            let nextCursorWidth = 0;

            // Alt + Left/Right: Jump by words
            if (key.leftArrow) {
                if (showCursor) {
                    nextCursorOffset--;
                }
            } else if (key.rightArrow) {
                if (showCursor) {
                    nextCursorOffset++;
                }
            } else if (key.upArrow && (key.meta || key.ctrl)) {
                // Cmd/Ctrl + Up: Jump to line start
                if (showCursor) {
                    nextCursorOffset = 0;
                }
            } else if (key.downArrow && (key.meta || key.ctrl)) {
                // Cmd/Ctrl + Down: Jump to line end
                if (showCursor) {
                    nextCursorOffset = originalValue.length;
                }
            } else if (key.backspace || key.delete) {
                if (cursorOffset > 0) {
                    nextValue =
                        originalValue.slice(0, cursorOffset - 1) +
                        originalValue.slice(cursorOffset, originalValue.length);

                    nextCursorOffset--;
                }
            } else {
                // Insert new input at cursor position
                nextValue =
                    originalValue.slice(0, cursorOffset) +
                    input +
                    originalValue.slice(cursorOffset, originalValue.length);

                // Move cursor to end of inserted text
                nextCursorOffset = cursorOffset + input.length;

                // Set cursor width for multi-character input (pasting, IME)
                if (input.length > 1) {
                    nextCursorWidth = input.length;
                }
            }

            // Clamp cursorOffset to valid range
            if (nextCursorOffset < 0) {
                nextCursorOffset = 0;
            }

            if (nextCursorOffset > nextValue.length) {
                nextCursorOffset = nextValue.length;
            }

            setState({
                cursorOffset: nextCursorOffset,
                cursorWidth: nextCursorWidth,
            });

            if (nextValue !== originalValue) {
                onChange?.(nextValue);
            }
        },
        { isActive: focus && !disabled },
    );

    // Apply dim styling when disabled
    const displayText = disabled ? chalk.dim(renderedValue) : renderedValue;
    const displayPlaceholder = disabled ? chalk.dim(renderedPlaceholder) : renderedPlaceholder;

    return <Text>{placeholder ? (value.length > 0 ? displayText : displayPlaceholder) : displayText}</Text>;
}
export { TextInput as EnhancedTextInput };
export default TextInput;

// Export new MultiLineTextInput as EnhancedTextInputV2
export { MultiLineTextInput as EnhancedTextInputV2 };
export type { MultiLineProps };

type UncontrolledProps = {
    /**
     * Initial value.
     */
    readonly initialValue?: string;
} & Omit<Props, 'value' | 'onChange'>;

export function UncontrolledTextInput({ initialValue = '', disabled = false, ...props }: UncontrolledProps) {
    const [value, setValue] = useState(initialValue);

    return <TextInput {...props} value={value} onChange={setValue} disabled={disabled} />;
}
