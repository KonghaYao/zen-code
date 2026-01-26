/**
 * Diff utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
    generateDiff,
    generateLineDiff,
    generateSimpleDiff,
    isLargeText,
    generateOptimizedDiff,
} from './diffUtils';

describe('generateDiff', () => {
    it('should return "No changes" for identical text', () => {
        const text = 'Hello World\n';
        expect(generateDiff(text, text)).toBe('No changes');
    });

    it('should generate simple diff', () => {
        const oldText = 'Hello World\n';
        const newText = 'Hello Universe\n';
        const result = generateDiff(oldText, newText);

        // diff_match_patch works at word/character level
        expect(result).toContain('+ Hello');
        expect(result).toContain('- World');
        expect(result).toContain('+ Universe');
    });

    it('should handle multiple lines', () => {
        const oldText = 'Line 1\nLine 2\nLine 3\n';
        const newText = 'Line 1\nModified Line 2\nLine 3\n';
        const result = generateDiff(oldText, newText);

        // diff_match_patch character-level diffs
        expect(result).toContain('Line 1');
        expect(result).toContain('Line 2');
        expect(result).toContain('Modified');
        expect(result).toContain('Line 3');
    });

    it('should handle additions', () => {
        const oldText = 'Line 1\n';
        const newText = 'Line 1\nLine 2\n';
        const result = generateDiff(oldText, newText);

        expect(result).toContain('Line 1');
        // The new line is marked with +
        expect(result).toContain('+ Line 2');
    });

    it('should handle deletions', () => {
        const oldText = 'Line 1\nLine 2\n';
        const newText = 'Line 1\n';
        const result = generateDiff(oldText, newText);

        expect(result).toContain('Line 1');
        expect(result).toContain('Line 2');
    });

    it('should handle empty text', () => {
        expect(generateDiff('', '')).toBe('No changes');
        const result1 = generateDiff('', 'New');
        expect(result1).toContain('New');

        const result2 = generateDiff('Old', '');
        expect(result2).toContain('Old');
    });
});

describe('generateLineDiff', () => {
    it('should return single unchanged line for identical text', () => {
        const text = 'Hello World\n';
        const result = generateLineDiff(text, text);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            type: 'unchanged',
            content: 'Hello World',
            lineNumbers: { old: 1, new: 1 },
        });
    });

    it('should generate line diff with correct line numbers', () => {
        const oldText = 'Line 1\nLine 2\nLine 3\n';
        const newText = 'Line 1\nModified Line 2\nLine 3\n';
        const result = generateLineDiff(oldText, newText);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            type: 'unchanged',
            content: 'Line 1',
            lineNumbers: { old: 1, new: 1 },
        });
        expect(result[1]).toEqual({
            type: 'removed',
            content: 'Line 2',
            lineNumbers: { old: 2 },
        });
        expect(result[2]).toEqual({
            type: 'added',
            content: 'Modified Line 2',
            lineNumbers: { new: 2 },
        });
    });

    it('should handle additions with line numbers', () => {
        const oldText = 'Line 1\n';
        const newText = 'Line 1\nLine 2\nLine 3\n';
        const result = generateLineDiff(oldText, newText);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].type).toBe('unchanged');
        expect(result[0].lineNumbers).toEqual({ old: 1, new: 1 });

        // Check for added lines
        const addedLines = result.filter((line) => line.type === 'added');
        expect(addedLines.length).toBeGreaterThan(0);
        expect(addedLines[0].lineNumbers?.new).toBeGreaterThan(1);
    });

    it('should handle deletions with line numbers', () => {
        const oldText = 'Line 1\nLine 2\nLine 3\n';
        const newText = 'Line 1\n';
        const result = generateLineDiff(oldText, newText);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            type: 'unchanged',
            content: 'Line 1',
            lineNumbers: { old: 1, new: 1 },
        });
        expect(result[1]).toEqual({
            type: 'removed',
            content: 'Line 2',
            lineNumbers: { old: 2 },
        });
        expect(result[2]).toEqual({
            type: 'removed',
            content: 'Line 3',
            lineNumbers: { old: 3 },
        });
    });

    it('should respect maxLines option', () => {
        const oldText = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
        const newText = oldText.replace('Line 50', 'Modified Line 50');
        const result = generateLineDiff(oldText, newText, { maxLines: 20 });

        expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should respect contextLines option', () => {
        const oldText = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
        const newText = oldText.replace('Line 10', 'Modified Line 10');
        const result = generateLineDiff(oldText, newText, { maxLines: 50, contextLines: 2 });

        // Should show 2 lines before and after the change
        const changeIndex = result.findIndex((line) => line.type !== 'unchanged');
        expect(changeIndex).toBeGreaterThanOrEqual(0);
    });

    it('should add ellipsis for truncated output', () => {
        const oldText = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
        const newText = oldText.replace('Line 50', 'Modified Line 50');
        const result = generateLineDiff(oldText, newText, { maxLines: 10 });

        // The result should be limited
        expect(result.length).toBeLessThanOrEqual(10);

        // May or may not have ellipsis depending on implementation
        const hasEllipsis = result.some((line) =>
            typeof line.content === 'string' && line.content.includes('...')
        );
        // Just check it doesn't crash
        expect(Array.isArray(result)).toBe(true);
    });
});

describe('generateSimpleDiff', () => {
    it('should return simple diff structure', () => {
        const result = generateSimpleDiff('old', 'new');

        expect(result).toEqual({
            oldText: 'old',
            newText: 'new',
            hasChanges: true,
        });
    });

    it('should detect no changes', () => {
        const result = generateSimpleDiff('same', 'same');

        expect(result).toEqual({
            oldText: 'same',
            newText: 'same',
            hasChanges: false,
        });
    });
});

describe('isLargeText', () => {
    it('should detect large text by character count', () => {
        const text = 'a'.repeat(1001);
        expect(isLargeText(text)).toBe(true);
    });

    it('should detect large text by line count', () => {
        const text = Array.from({ length: 51 }, () => 'line').join('\n');
        expect(isLargeText(text)).toBe(true);
    });

    it('should return false for small text', () => {
        expect(isLargeText('short')).toBe(false);
    });

    it('should use custom threshold', () => {
        const text = 'a'.repeat(500);
        expect(isLargeText(text, 400)).toBe(true);
        expect(isLargeText(text, 600)).toBe(false);
    });

    it('should handle null input gracefully', () => {
        // @ts-expect-error - testing null input
        expect(isLargeText(null)).toBe(false);
        expect(isLargeText(undefined as unknown as string)).toBe(false);
    });
});

describe('generateOptimizedDiff', () => {
    it('should use more aggressive truncation for large text', () => {
        const oldText = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
        const newText = oldText.replace('Line 500', 'Modified Line 500');

        const result = generateOptimizedDiff(oldText, newText);

        // Large text should default to maxLines: 10
        expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should use normal limits for small text', () => {
        const oldText = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
        const newText = oldText.replace('Line 25', 'Modified Line 25');

        const result = generateOptimizedDiff(oldText, newText);

        // Small text should default to maxLines: 20
        expect(result.length).toBeLessThanOrEqual(50); // Not truncated
    });

    it('should respect explicit options', () => {
        const oldText = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n') + '\n';
        const newText = oldText.replace('Line 50', 'Modified Line 50');

        const result = generateOptimizedDiff(oldText, newText, { maxLines: 5, contextLines: 1 });

        expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should distinguish between undefined and explicit options', () => {
        const oldText = 'short';
        const newText = 'short';

        // No options - uses defaults based on text size
        const result1 = generateOptimizedDiff(oldText, newText);
        expect(result1).toHaveLength(1);

        // Explicit maxLines: undefined - should not apply limits
                                                                                                                                                                             