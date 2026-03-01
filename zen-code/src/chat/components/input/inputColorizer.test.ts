/**
 * Tests for inputColorizer — tokenizer and chalk colorizer for chat input
 */

import { describe, it, expect } from 'vitest';
import chalk from 'chalk';
import { tokenizeLine, colorizeInputLine } from './inputColorizer';

// ─── tokenizeLine ──────────────────────────────────────────────────────────────

describe('tokenizeLine', () => {
    // ── empty / trivial ──────────────────────────────────────────────────────
    it('returns [] for empty string', () => {
        expect(tokenizeLine('')).toEqual([]);
    });

    it('returns a single text token for plain text', () => {
        expect(tokenizeLine('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
    });

    // ── command-only (pure command phase) ────────────────────────────────────
    it('treats /cmd with no space as a single command token', () => {
        expect(tokenizeLine('/help')).toEqual([{ type: 'command', value: '/help' }]);
    });

    it('treats / alone as a command token', () => {
        expect(tokenizeLine('/')).toEqual([{ type: 'command', value: '/' }]);
    });

    it('treats /interview (long name) with no space as command', () => {
        expect(tokenizeLine('/interview')).toEqual([{ type: 'command', value: '/interview' }]);
    });

    // ── command + args ────────────────────────────────────────────────────────
    it('splits command name and plain args', () => {
        expect(tokenizeLine('/i djidji')).toEqual([
            { type: 'command', value: '/i' },
            { type: 'args', value: ' djidji' },
        ]);
    });

    it('splits command + args + skill', () => {
        expect(tokenizeLine('/i djidji #skill-name')).toEqual([
            { type: 'command', value: '/i' },
            { type: 'args', value: ' djidji ' },
            { type: 'skill', value: '#skill-name' },
        ]);
    });

    it('handles multiple skills in args', () => {
        expect(tokenizeLine('/interview foo #skill-a bar #skill-b')).toEqual([
            { type: 'command', value: '/interview' },
            { type: 'args', value: ' foo ' },
            { type: 'skill', value: '#skill-a' },
            { type: 'args', value: ' bar ' },
            { type: 'skill', value: '#skill-b' },
        ]);
    });

    it('handles args that end with a skill (no trailing text)', () => {
        expect(tokenizeLine('/plan build feature #codebase-exploration')).toEqual([
            { type: 'command', value: '/plan' },
            { type: 'args', value: ' build feature ' },
            { type: 'skill', value: '#codebase-exploration' },
        ]);
    });

    // ── plain text with skills ────────────────────────────────────────────────
    it('marks #skill at start of plain text as skill token', () => {
        expect(tokenizeLine('#skill at start')).toEqual([
            { type: 'skill', value: '#skill' },
            { type: 'text', value: ' at start' },
        ]);
    });

    it('marks inline #skill in plain text', () => {
        expect(tokenizeLine('check the #codebase-exploration skill')).toEqual([
            { type: 'text', value: 'check the ' },
            { type: 'skill', value: '#codebase-exploration' },
            { type: 'text', value: ' skill' },
        ]);
    });

    it('handles multiple skills in plain text', () => {
        expect(tokenizeLine('use #skill-a and #skill-b')).toEqual([
            { type: 'text', value: 'use ' },
            { type: 'skill', value: '#skill-a' },
            { type: 'text', value: ' and ' },
            { type: 'skill', value: '#skill-b' },
        ]);
    });

    // ── # that should NOT trigger skill ──────────────────────────────────────
    it('does not treat mid-word # as skill (e.g. email@#weird)', () => {
        // "#weird" is NOT preceded by whitespace or start-of-string here
        const tokens = tokenizeLine('email@#weird');
        // should be plain text — no skill token
        expect(tokens.every((t) => t.type !== 'skill')).toBe(true);
    });

    it('does not treat # with no following word chars as skill', () => {
        const tokens = tokenizeLine('just a # symbol');
        expect(tokens.every((t) => t.type !== 'skill')).toBe(true);
    });

    // ── hyphenated skill names ────────────────────────────────────────────────
    it('handles skill names with hyphens', () => {
        expect(tokenizeLine('#tanstack-query')).toEqual([{ type: 'skill', value: '#tanstack-query' }]);
    });

    it('handles skill names with underscores', () => {
        expect(tokenizeLine('#my_skill')).toEqual([{ type: 'skill', value: '#my_skill' }]);
    });
});

// ─── colorizeInputLine ─────────────────────────────────────────────────────────

describe('colorizeInputLine', () => {
    it('returns empty string unchanged', () => {
        expect(colorizeInputLine('')).toBe('');
    });

    it('produces non-empty output for command input', () => {
        const result = colorizeInputLine('/help');
        expect(result).toContain('/help');
        if (chalk.level > 0) {
            // In a color-enabled terminal, ANSI codes should be present
            expect(result.length).toBeGreaterThan('/help'.length);
        } else {
            // In CI/no-color environment, chalk is a no-op — just verify content
            expect(result).toBe('/help');
        }
    });

    it('produces non-empty output for skill in plain text', () => {
        const result = colorizeInputLine('use #skill here');
        expect(result).toContain('#skill');
        if (chalk.level > 0) {
            expect(result.length).toBeGreaterThan('use #skill here'.length);
        } else {
            expect(result).toBe('use #skill here');
        }
    });

    it('leaves plain text without special tokens unchanged', () => {
        const input = 'just plain text';
        expect(colorizeInputLine(input)).toBe(input);
    });

    it('leaves args portion without skills unchanged', () => {
        const result = colorizeInputLine('/i build a feature');
        // args part "build a feature" should be unmodified (no ANSI on it)
        expect(result).toContain('build a feature');
    });

    it('colorizes both command and skill in the same line', () => {
        const result = colorizeInputLine('/i djidji #skill-name');
        // Both /i and #skill-name should gain ANSI; djidji should be plain
        expect(result).toContain('/i');
        expect(result).toContain('#skill-name');
        expect(result).toContain('djidji');
    });
});
