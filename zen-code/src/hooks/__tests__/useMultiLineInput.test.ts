/**
 * Tests for useMultiLineInput hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiLineInput } from '../useMultiLineInput';

describe('useMultiLineInput - Basic Operations', () => {
    it('should initialize with empty text', () => {
        const { result } = renderHook(() => useMultiLineInput());

        expect(result.current.text).toBe('');
        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should initialize with provided text', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\nWorld'));

        expect(result.current.text).toBe('Hello\nWorld');
        expect(result.current.lines).toEqual(['Hello', 'World']);
    });

    it('should handle single line text', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World'));

        expect(result.current.lines).toEqual(['Hello World']);
        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(11);
    });
});

describe('useMultiLineInput - Character Movement', () => {
    it('should move cursor left within line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.moveLeft();
        });

        expect(result.current.cursorColumn).toBe(4);
        expect(result.current.cursorLine).toBe(0);
    });

    it('should move cursor right within line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.moveLeft();
            result.current.moveRight();
        });

        expect(result.current.cursorColumn).toBe(5);
        expect(result.current.cursorLine).toBe(0);
    });

    it('should move to previous line when moving left from line start', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\nWorld'));

        // Move to line start (5 moves from column 5 to 0)
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.moveLeft();
            }
        });

        expect(result.current.cursorColumn).toBe(0);

        // One more moveLeft should go to previous line end
        act(() => {
            result.current.moveLeft();
        });

        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should move to next line when moving right from line end', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\nWorld'));

        // Move to line start (column 0)
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.moveLeft();
            }
        });

        expect(result.current.cursorColumn).toBe(0);

        // Move right through line (5 moves to get back to end)
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.moveRight();
            }
        });

        expect(result.current.cursorColumn).toBe(5);
        expect(result.current.cursorLine).toBe(1);

        // One more moveRight should go to next line start (but there is no next line)
        act(() => {
            result.current.moveRight();
        });

        // Since there's no line 2, stay at line 1, col 5
        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should not move left from start of text', () => {
        const { result } = renderHook(() => useMultiLineInput('A'));

        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
        });

        expect(result.current.cursorColumn).toBe(0);
        expect(result.current.cursorLine).toBe(0);
    });

    it('should not move right from end of text', () => {
        const { result } = renderHook(() => useMultiLineInput('A'));

        act(() => {
            result.current.moveRight();
        });

        expect(result.current.cursorColumn).toBe(1);
        expect(result.current.cursorLine).toBe(0);
    });
});

describe('useMultiLineInput - Vertical Movement', () => {
    it('should move up to previous line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\nWorld'));

        act(() => {
            result.current.moveUp();
        });

        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should move down to next line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\nWorld'));

        // Move to line start (column 0)
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.moveLeft();
            }
        });

        expect(result.current.cursorColumn).toBe(0);

        // Move down to next line
        act(() => {
            result.current.moveDown();
        });

        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should clamp cursor column when moving to shorter line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World\nHi\nTest'));

        // Move to first line
        act(() => {
            result.current.moveUp();
            result.current.moveUp();
        });
        expect(result.current.cursorLine).toBe(0);

        // Ensure we're at the end of the line (column 11)
        act(() => {
            result.current.moveToLineEnd();
        });
        expect(result.current.cursorColumn).toBe(11);

        // Move down to shorter line 'Hi' (length 2)
        act(() => {
            result.current.moveDown();
        });

        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(2); // Clamped to 'Hi' length
    });

    it('should remember desired column when moving vertically', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World\nHi\nTest'));

        // Move to first line
        act(() => {
            result.current.moveUp();
            result.current.moveUp();
        });
        expect(result.current.cursorLine).toBe(0);

        // Move to column 8 (end of line is 11)
        act(() => {
            result.current.moveToLineEnd();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
        });
        expect(result.current.cursorColumn).toBe(8);

        // Move down to shorter line 'Hi' (length 2)
        act(() => {
            result.current.moveDown();
        });
        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(2); // Clamped

        // Move down to 'Test' (length 4)
        act(() => {
            result.current.moveDown();
        });
        expect(result.current.cursorLine).toBe(2);
        expect(result.current.cursorColumn).toBe(4); // Clamped to Test length

        // Move up to first line (long) - should restore to desired column 8
        act(() => {
            result.current.moveUp();
            result.current.moveUp();
        });
        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(8); // Restored to desired column
    });

    it('should reset desired column on horizontal movement', () => {
        const { result } = renderHook(() => useMultiLineInput('Line 1\nLine 2'));

        // Move to first line end
        act(() => {
            result.current.moveUp();
        });

        // Move down and up to set desired column
        act(() => {
            result.current.moveDown();
            result.current.moveUp();
        });

        expect(result.current.cursorColumn).toBe(6); // 'Line 1' length

        // Move left to reset desired column
        act(() => {
            result.current.moveLeft();
        });

        expect(result.current.cursorColumn).toBe(5);

        // Now move down - desired column should be reset to 5
        act(() => {
            result.current.moveDown();
        });

        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(5); // New desired column (clamped to 'Line 2' length 6)
    });

    it('should not move up from first line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.moveUp();
        });

        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should not move down from last line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.moveDown();
        });

        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5);
    });
});

describe('useMultiLineInput - Word Movement', () => {
    it('should move to start of previous word', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World Test'));

        act(() => {
            result.current.moveWordLeft();
        });

        expect(result.current.cursorColumn).toBe(12); // Start of 'Test'

        act(() => {
            result.current.moveWordLeft();
        });

        expect(result.current.cursorColumn).toBe(6); // Start of 'World'

        act(() => {
            result.current.moveWordLeft();
        });

        expect(result.current.cursorColumn).toBe(0); // Start of 'Hello'
    });

    it('should move to start of next word', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World Test'));

        // Move to column 13 (first 'e' in 'Test')
        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
        });
        expect(result.current.cursorColumn).toBe(13);

        act(() => {
            result.current.moveWordRight();
        });

        expect(result.current.cursorColumn).toBe(16); // End after 'Test'
    });

    it('should skip whitespace when moving words', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello   World'));

        act(() => {
            result.current.moveWordLeft();
        });

        expect(result.current.cursorColumn).toBe(8); // Start of 'World', skipping spaces

        act(() => {
            result.current.moveWordLeft();
        });

        expect(result.current.cursorColumn).toBe(0); // Start of 'Hello'
    });
});

describe('useMultiLineInput - Line Navigation', () => {
    it('should move to start of line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World'));

        act(() => {
            result.current.moveToLineStart();
        });

        expect(result.current.cursorColumn).toBe(0);
    });

    it('should move to end of line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World'));

        act(() => {
            result.current.moveToLineEnd();
        });

        expect(result.current.cursorColumn).toBe(11);
    });
});

describe('useMultiLineInput - Text Input', () => {
    it('should insert character at cursor position', () => {
        const { result } = renderHook(() => useMultiLineInput('Hllo'));

        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.input('e');
        });

        expect(result.current.text).toBe('Hello');
        expect(result.current.cursorColumn).toBe(2); // After 'e'
    });

    it('should append character at end of line', () => {
        const { result } = renderHook(() => useMultiLineInput('Hell'));

        act(() => {
            result.current.input('o');
        });

        expect(result.current.text).toBe('Hello');
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should handle multi-line input', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.insertNewline();
            result.current.insertText('World');
        });

        expect(result.current.lines).toEqual(['Hello', 'World']);
        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should split line at cursor position on newline', () => {
        const { result } = renderHook(() => useMultiLineInput('HelloWorld'));

        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.insertNewline();
        });

        expect(result.current.lines).toEqual(['Hello', 'World']);
        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should paste multi-line text', () => {
        const { result } = renderHook(() => useMultiLineInput('Line 1'));

        act(() => {
            result.current.insertText('Line 2\nLine 3');
        });

        expect(result.current.lines).toEqual(['Line 1Line 2', 'Line 3']);
    });

    it('should paste multi-line text in middle of line', () => {
        const { result } = renderHook(() => useMultiLineInput('Start End'));

        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
        });

        expect(result.current.cursorColumn).toBe(5);

        act(() => {
            result.current.insertText('Line 1\nLine 2\nLine 3');
        });

        expect(result.current.lines).toEqual(['StartLine 1', 'Line 2', 'Line 3 End']);
        expect(result.current.cursorLine).toBe(2);
        expect(result.current.cursorColumn).toBe(6); // 'Line 3'.length
    });

    it('should paste text ending with newline', () => {
        const { result } = renderHook(() => useMultiLineInput('Line 1'));

        act(() => {
            result.current.insertText('Line 2\nLine 3\n');
        });

        expect(result.current.lines).toEqual(['Line 1Line 2', 'Line 3', '']);
        expect(result.current.cursorLine).toBe(2);
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should move cursor after pasting multi-line text', () => {
        const { result } = renderHook(() => useMultiLineInput('Line 1'));

        // Paste multi-line text
        act(() => {
            result.current.insertText('Line 2\nLine 3\nLine 4');
        });

        expect(result.current.lines).toEqual(['Line 1Line 2', 'Line 3', 'Line 4']);
        expect(result.current.cursorLine).toBe(2);
        expect(result.current.cursorColumn).toBe(6); // 'Line 4'.length

        // Move up
        act(() => {
            result.current.moveUp();
        });

        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(6); // 'Line 3'.length

        // Move up again
        act(() => {
            result.current.moveUp();
        });

        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(6); // desiredColumn from previous line (line 1 had length 6)


        // Move down
        act(() => {
            result.current.moveDown();
        });

        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(6); // back to 'Line 3'.length
    });
});

describe('useMultiLineInput - Deletion', () => {
    it('should delete character before cursor (backspace)', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.backspace();
        });

        expect(result.current.text).toBe('Hell');
        expect(result.current.cursorColumn).toBe(4);
    });

    it('should delete character at cursor (delete)', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
        });

        expect(result.current.cursorColumn).toBe(0);

        act(() => {
            result.current.deleteChar();
        });

        expect(result.current.text).toBe('ello');
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should join lines when backspacing at line start', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\nWorld'));

        // Move to start of second line
        act(() => {
            for (let i = 0; i < 5; i++) {
                result.current.moveLeft();
            }
        });

        expect(result.current.cursorColumn).toBe(0);

        act(() => {
            result.current.backspace();
        });

        expect(result.current.text).toBe('HelloWorld');
        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should join lines when deleting at line end', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\nWorld'));

        // Move to end of first line (5 moves to get to line 1 start, +1 to cross to line 0 end)
        act(() => {
            for (let i = 0; i < 6; i++) {
                result.current.moveLeft();
            }
        });

        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5);

        act(() => {
            result.current.deleteChar();
        });

        expect(result.current.text).toBe('HelloWorld');
        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5);
    });

    it('should delete word left (Ctrl+Backspace)', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World Test'));

        act(() => {
            result.current.backspaceWord();
        });

        expect(result.current.text).toBe('Hello World ');
        expect(result.current.cursorColumn).toBe(12);

        act(() => {
            result.current.backspaceWord();
        });

        expect(result.current.text).toBe('Hello ');
        expect(result.current.cursorColumn).toBe(6);
    });

    it('should delete word right (Ctrl+Delete)', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello World Test'));

        // Move to column 6 (start of 'World')
        act(() => {
            for (let i = 0; i < 10; i++) {
                result.current.moveLeft();
            }
        });

        expect(result.current.cursorColumn).toBe(6);

        act(() => {
            result.current.deleteWord();
        });

        expect(result.current.text).toBe('Hello  Test');
        expect(result.current.cursorColumn).toBe(6);
    });

    it('should not backspace at start of text', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.backspace();
        });

        expect(result.current.text).toBe('Hello');
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should not delete at end of text', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello'));

        act(() => {
            result.current.deleteChar();
        });

        expect(result.current.text).toBe('Hello');
    });
});

describe('useMultiLineInput - Edge Cases', () => {
    it('should handle empty text', () => {
        const { result } = renderHook(() => useMultiLineInput(''));

        expect(result.current.lines).toEqual(['']);
        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(0);

        act(() => {
            result.current.input('A');
        });

        expect(result.current.text).toBe('A');
    });

    it('should handle text ending with newline', () => {
        const { result } = renderHook(() => useMultiLineInput('Hello\n'));

        expect(result.current.lines).toEqual(['Hello', '']);
        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should handle multiple consecutive newlines', () => {
        const { result } = renderHook(() => useMultiLineInput('A\n\n\nB'));

        expect(result.current.lines).toEqual(['A', '', '', 'B']);
        expect(result.current.cursorLine).toBe(3);
        expect(result.current.cursorColumn).toBe(1);
    });

    it('should handle only newlines', () => {
        const { result } = renderHook(() => useMultiLineInput('\n\n'));

        expect(result.current.lines).toEqual(['', '', '']);
        expect(result.current.cursorLine).toBe(2);
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should handle unicode characters', () => {
        const { result } = renderHook(() => useMultiLineInput('你好世界'));

        expect(result.current.cursorColumn).toBe(4);

        act(() => {
            result.current.backspace();
        });

        expect(result.current.text).toBe('你好世');
        expect(result.current.cursorColumn).toBe(3);
    });
});

describe('useMultiLineInput - Complex Scenarios', () => {
    it('should handle typing after vertical navigation', () => {
        const { result } = renderHook(() => useMultiLineInput('Long line here\nShort\nAnother long'));

        // Move to first line
        act(() => {
            result.current.moveUp();
            result.current.moveUp();
        });
        expect(result.current.cursorLine).toBe(0);

        // Move to column 10 (end of 'here' is 14, minus 4)
        act(() => {
            result.current.moveToLineEnd();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
        });
        expect(result.current.cursorColumn).toBe(10);

        // Move down to 'Short' (clamped to column 5)
        act(() => {
            result.current.moveDown();
        });
        expect(result.current.cursorColumn).toBe(5);

        // Type something
        act(() => {
            result.current.input('X');
        });

        expect(result.current.lines[1]).toBe('ShortX');
        expect(result.current.cursorColumn).toBe(6);
    });

    it('should maintain desired column across multiple vertical moves', () => {
        const { result } = renderHook(() => useMultiLineInput('Line 1\nLine 2\nLine 3\nLine 4'));

        // Start at column 6 (end of 'Line 1')
        act(() => {
            result.current.moveDown(); // To Line 2
        });
        expect(result.current.cursorColumn).toBe(6);

        act(() => {
            result.current.moveDown(); // To Line 3
        });
        expect(result.current.cursorColumn).toBe(6);

        act(() => {
            result.current.moveDown(); // To Line 4
        });
        expect(result.current.cursorColumn).toBe(6);

        act(() => {
            result.current.moveUp(); // Back to Line 3
        });
        expect(result.current.cursorColumn).toBe(6);
    });

    it('should handle rapid editing operations', () => {
        const { result } = renderHook(() => useMultiLineInput('ABC'));

        act(() => {
            result.current.backspace();
            result.current.backspace();
            result.current.input('X');
            result.current.input('Y');
            result.current.backspace();
        });

        expect(result.current.text).toBe('AX');
        expect(result.current.cursorColumn).toBe(2);
    });

    it('should handle paste with newlines in middle of line', () => {
        const { result } = renderHook(() => useMultiLineInput('Start End'));

        act(() => {
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
            result.current.moveLeft();
        });
        expect(result.current.cursorColumn).toBe(5);

        act(() => {
            result.current.insertText('\n');
        });

        expect(result.current.lines).toEqual(['Start', ' End']);
        expect(result.current.cursorLine).toBe(1);
        expect(result.current.cursorColumn).toBe(0);
    });

    it('should sync with external initialText changes', () => {
        const { result, rerender } = renderHook(
            ({ initialText }) => useMultiLineInput(initialText),
            { initialProps: { initialText: 'Hello' } }
        );

        expect(result.current.text).toBe('Hello');

        // Change internal state
        act(() => {
            result.current.input('X');
        });

        expect(result.current.text).toBe('HelloX');

        // External value changes (e.g., parent component updates prop)
        rerender({ initialText: 'World' });

        expect(result.current.text).toBe('World');
        expect(result.current.cursorLine).toBe(0);
        expect(result.current.cursorColumn).toBe(5); // 'World'.length
    });
});

describe('useMultiLineInput - Cross-Platform Newlines', () => {
    it('should normalize CRLF (\\r\\n) to LF (\\n) on initialization', () => {
        const { result } = renderHook(() => useMultiLineInput('Line1\r\nLine2\r\nLine3'));

        expect(result.current.lines).toEqual(['Line1', 'Line2', 'Line3']);
        expect(result.current.text).toBe('Line1\nLine2\nLine3');
    });

    it('should normalize CR (\\r) to LF (\\n) on initialization', () => {
        const { result } = renderHook(() => useMultiLineInput('Line1\rLine2\rLine3'));

        expect(result.current.lines).toEqual(['Line1', 'Line2', 'Line3']);
        expect(result.current.text).toBe('Line1\nLine2\nLine3');
    });

    it('should normalize mixed newline types on initialization', () => {
        const { result } = renderHook(() => useMultiLineInput('Line1\nLine2\r\nLine3\rLine4'));

        expect(result.current.lines).toEqual(['Line1', 'Line2', 'Line3', 'Line4']);
        expect(result.current.text).toBe('Line1\nLine2\nLine3\nLine4');
    });

    it('should normalize CRLF when pasting text', () => {
        const { result } = renderHook(() => useMultiLineInput('Start'));

        act(() => {
            result.current.insertText('Line1\r\nLine2\r\nLine3');
        });

        expect(result.current.lines).toEqual(['StartLine1', 'Line2', 'Line3']);
        expect(result.current.text).toBe('StartLine1\nLine2\nLine3');
    });

    it('should normalize CR when pasting text', () => {
        const { result } = renderHook(() => useMultiLineInput('Start'));

        act(() => {
            result.current.insertText('Line1\rLine2\rLine3');
        });

        expect(result.current.lines).toEqual(['StartLine1', 'Line2', 'Line3']);
        expect(result.current.text).toBe('StartLine1\nLine2\nLine3');
    });

    it('should handle text ending with CRLF', () => {
        const { result } = renderHook(() => useMultiLineInput('Line1\r\n'));

        expect(result.current.lines).toEqual(['Line1', '']);
        expect(result.current.text).toBe('Line1\n');
    });

    it('should handle text ending with CR', () => {
        const { result } = renderHook(() => useMultiLineInput('Line1\r'));

        expect(result.current.lines).toEqual(['Line1', '']);
        expect(result.current.text).toBe('Line1\n');
    });

    it('should sync external text with CRLF normalized to LF', () => {
        const { result, rerender } = renderHook(
            ({ initialText }) => useMultiLineInput(initialText),
            { initialProps: { initialText: 'Hello' } }
        );

        // External value with CRLF
        rerender({ initialText: 'Line1\r\nLine2\r\n' });

        expect(result.current.lines).toEqual(['Line1', 'Line2', '']);
        expect(result.current.text).toBe('Line1\nLine2\n');
    });

    it('should handle consecutive CRLF sequences', () => {
        const { result } = renderHook(() => useMultiLineInput('A\r\n\r\nB'));

        expect(result.current.lines).toEqual(['A', '', 'B']);
        expect(result.current.text).toBe('A\n\nB');
    });

    it('should handle consecutive CR sequences', () => {
        const { result } = renderHook(() => useMultiLineInput('A\r\rB'));

        expect(result.current.lines).toEqual(['A', '', 'B']);
        expect(result.current.text).toBe('A\n\nB');
    });
});
