/**
 * Keypress parsing utilities tests
 */

import { describe, it, expect } from 'vitest';
import { parseKeypress, nonAlphanumericKeys } from './keypress';

describe('parseKeypress', () => {
    describe('special keys', () => {
        it('should parse return key', () => {
            expect(parseKeypress('\r')).toEqual({
                name: 'return',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\r',
                raw: undefined,
            });
        });

        it('should parse enter key', () => {
            expect(parseKeypress('\n')).toEqual({
                name: 'enter',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\n',
                raw: '\n',
            });
        });

        it('should parse tab key', () => {
            expect(parseKeypress('\t')).toEqual({
                name: 'tab',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\t',
                raw: '\t',
            });
        });

        it('should parse backspace key', () => {
            expect(parseKeypress('\x7f')).toEqual({
                name: 'backspace',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x7f',
                raw: '\x7f',
            });
        });

        it('should parse escape key', () => {
            expect(parseKeypress('\x1b')).toEqual({
                name: 'escape',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b',
                raw: '',
            });
        });

        it('should parse space key', () => {
            expect(parseKeypress(' ')).toEqual({
                name: 'space',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: ' ',
                raw: ' ',
            });
        });
    });

    describe('arrow keys', () => {
        it('should parse up arrow', () => {
            expect(parseKeypress('\x1b[A')).toMatchObject({
                name: 'up',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[A',
                raw: '\x1b[A',
            });
        });

        it('should parse down arrow', () => {
            expect(parseKeypress('\x1b[B')).toMatchObject({
                name: 'down',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[B',
                raw: '\x1b[B',
            });
        });

        it('should parse right arrow', () => {
            expect(parseKeypress('\x1b[C')).toMatchObject({
                name: 'right',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[C',
                raw: '\x1b[C',
            });
        });

        it('should parse left arrow', () => {
            expect(parseKeypress('\x1b[D')).toMatchObject({
                name: 'left',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[D',
                raw: '\x1b[D',
            });
        });
    });

    describe('function keys', () => {
        it('should parse F1 key', () => {
            expect(parseKeypress('\x1bOP')).toMatchObject({
                name: 'f1',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1bOP',
                raw: '\x1bOP',
            });
        });

        it('should parse F5 key', () => {
            expect(parseKeypress('\x1b[15~')).toMatchObject({
                name: 'f5',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[15~',
                raw: '\x1b[15~',
            });
        });

        it('should parse F10 key', () => {
            expect(parseKeypress('\x1b[21~')).toMatchObject({
                name: 'f10',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[21~',
                raw: '\x1b[21~',
            });
        });

        it('should parse F12 key', () => {
            expect(parseKeypress('\x1b[24~')).toMatchObject({
                name: 'f12',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[24~',
                raw: '\x1b[24~',
            });
        });
    });

    describe('alphanumeric keys', () => {
        it('should parse lowercase letter', () => {
            expect(parseKeypress('a')).toEqual({
                name: 'a',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: 'a',
                raw: 'a',
            });
        });

        it('should parse uppercase letter (shift)', () => {
            expect(parseKeypress('A')).toEqual({
                name: 'a',
                ctrl: false,
                meta: false,
                shift: true,
                option: false,
                sequence: 'A',
                raw: 'A',
            });
        });

        it('should parse number', () => {
            expect(parseKeypress('5')).toEqual({
                name: 'number',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '5',
                raw: '5',
            });
        });
    });

    describe('control combinations', () => {
        it('should parse ctrl+a', () => {
            expect(parseKeypress('\x01')).toEqual({
                name: 'a',
                ctrl: true,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x01',
                raw: '\x01',
            });
        });

        it('should parse ctrl+z', () => {
            expect(parseKeypress('\x1a')).toEqual({
                name: 'z',
                ctrl: true,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1a',
                raw: '\x1a',
            });
        });
    });

    describe('option/alt combinations', () => {
        it('should parse option+up', () => {
            expect(parseKeypress('\u001b[1;3A')).toEqual({
                name: 'up',
                ctrl: false,
                meta: false,
                shift: false,
                option: true,
                sequence: '\u001b[1;3A',
                raw: '\u001b[1;3A',
            });
        });

        it('should parse option+down', () => {
            expect(parseKeypress('\u001b[1;3B')).toEqual({
                name: 'down',
                ctrl: false,
                meta: false,
                shift: false,
                option: true,
                sequence: '\u001b[1;3B',
                raw: '\u001b[1;3B',
            });
        });

        it('should parse option+right (macOS)', () => {
            expect(parseKeypress('\x1Bf')).toEqual({
                name: 'right',
                ctrl: false,
                meta: false,
                shift: false,
                option: true,
                sequence: '\x1Bf',
                raw: '\x1Bf',
            });
        });

        it('should parse option+left (macOS)', () => {
            expect(parseKeypress('\x1Bb')).toEqual({
                name: 'left',
                ctrl: false,
                meta: false,
                shift: false,
                option: true,
                sequence: '\x1Bb',
                raw: '\x1Bb',
            });
        });
    });

    describe('buffer input', () => {
        it('should handle Buffer input', () => {
            const buf = Buffer.from('\x1b[A');
            expect(parseKeypress(buf)).toMatchObject({
                name: 'up',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '\x1b[A',
                raw: '\x1b[A',
            });
        });

        it('should handle Buffer with high bit set', () => {
            const buf = Buffer.from([0xff]);
            const result = parseKeypress(buf);
            // High bit set (0xff) gets converted to 0x7f with escape prefix
            // which is backspace with option modifier
            expect(result.name).toBe('backspace');
            expect(result.option).toBe(true);
        });
    });

    describe('empty and edge cases', () => {
        it('should handle empty string', () => {
            expect(parseKeypress('')).toEqual({
                name: '',
                ctrl: false,
                meta: false,
                shift: false,
                option: false,
                sequence: '',
                raw: '',
            });
        });

        it('should handle undefined', () => {
            const result = parseKeypress();
            expect(result.name).toBe('');
            expect(result.ctrl).toBe(false);
            expect(result.meta).toBe(false);
            expect(result.shift).toBe(false);
            expect(result.option).toBe(false);
            expect(result.sequence).toBe('');
            // raw can be '' or undefined depending on implementation
            expect(['', undefined]).toContain(result.raw);
        });
    });
});

describe('nonAlphanumericKeys', () => {
    it('should contain arrow keys', () => {
        expect(nonAlphanumericKeys).toContain('up');
        expect(nonAlphanumericKeys).toContain('down');
        expect(nonAlphanumericKeys).toContain('left');
        expect(nonAlphanumericKeys).toContain('right');
    });

    it('should contain common special keys', () => {
        expect(nonAlphanumericKeys).toContain('tab');
        expect(nonAlphanumericKeys).toContain('backspace');
    });

    it('should contain function keys', () => {
        expect(nonAlphanumericKeys).toContain('f1');
        expect(nonAlphanumericKeys).toContain('f12');
    });
});
