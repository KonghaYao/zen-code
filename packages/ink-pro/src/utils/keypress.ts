/**
 * Keypress parsing utilities
 * Cross-platform keyboard event parsing for terminal applications
 * 
 * Copied from https://github.com/enquirer/enquirer/blob/36785f3399a41cd61e9d28d1eb9c2fcd73d69b4c/lib/keypress.js
 */

import { Buffer } from 'node:buffer';

const optionKeyCodeRe = /^(?:\x1b)([a-zA-Z0-9])$/;

const fnKeyRe = /^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

const keyName: Record<string, string> = {
    /* xterm/gnome ESC O letter */
    OP: 'f1',
    OQ: 'f2',
    OR: 'f3',
    OS: 'f4',
    /* xterm/rxvt ESC [ number ~ */
    '[11~': 'f1',
    '[12~': 'f2',
    '[13~': 'f3',
    '[14~': 'f4',
    /* from Cygwin and used in libuv */
    '[[A': 'f1',
    '[[B': 'f2',
    '[[C': 'f3',
    '[[D': 'f4',
    '[[E': 'f5',
    /* common */
    '[15~': 'f5',
    '[17~': 'f6',
    '[18~': 'f7',
    '[19~': 'f8',
    '[20~': 'f9',
    '[21~': 'f10',
    '[23~': 'f11',
    '[24~': 'f12',
    /* xterm ESC [ letter */
    '[A': 'up',
    '[B': 'down',
    '[C': 'right',
    '[D': 'left',
    '[E': 'clear',
    '[F': 'end',
    '[H': 'home',
    /* xterm/gnome ESC O letter */
    OA: 'up',
    OB: 'down',
    OC: 'right',
    OD: 'left',
    OE: 'clear',
    OF: 'end',
    OH: 'home',
    /* xterm/rxvt ESC [ number ~ */
    '[1~': 'home',
    '[2~': 'insert',
    '[3~': 'delete',
    '[4~': 'end',
    '[5~': 'pageup',
    '[6~': 'pagedown',
    /* putty */
    '[[5~': 'pageup',
    '[[6~': 'pagedown',
    /* rxvt */
    '[7~': 'home',
    '[8~': 'end',
    /* rxvt keys with modifiers */
    '[a': 'up',
    '[b': 'down',
    '[c': 'right',
    '[d': 'left',
    '[e': 'clear',

    '[2$': 'insert',
    '[3$': 'delete',
    '[5$': 'pageup',
    '[6$': 'pagedown',
    '[7$': 'home',
    '[8$': 'end',

    Oa: 'up',
    Ob: 'down',
    Oc: 'right',
    Od: 'left',
    Oe: 'clear',

    '[2^': 'insert',
    '[3^': 'delete',
    '[5^': 'pageup',
    '[6^': 'pagedown',
    '[7^': 'home',
    '[8^': 'end',
    /* misc. */
    '[Z': 'tab',
};

export const nonAlphanumericKeys = [...Object.values(keyName), 'backspace'];

const isShiftKey = (code: string) => {
    return ['[a', '[b', '[c', '[d', '[e', '[2$', '[3$', '[5$', '[6$', '[7$', '[8$', '[Z'].includes(code);
};

const isCtrlKey = (code: string) => {
    return ['Oa', 'Ob', 'Oc', 'Od', 'Oe', '[2^', '[3^', '[5^', '[6^', '[7^', '[8^'].includes(code);
};

export type ParsedKey = {
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    option: boolean;
    sequence: string;
    raw: string | undefined;
    code?: string;
};

export const parseKeypress = (s: Buffer | string = ''): ParsedKey => {
    let parts;

    if (Buffer.isBuffer(s)) {
        if (s[0]! > 127 && s[1] === undefined) {
            (s[0] as unknown as number) -= 128;
            s = '\x1b' + String(s);
        } else {
            s = String(s);
        }
    } else if (s !== undefined && typeof s !== 'string') {
        s = String(s);
    } else if (!s) {
        s = '';
    }

    const key: ParsedKey = {
        name: '',
        ctrl: false,
        meta: false,
        shift: false,
        option: false,
        sequence: s,
        raw: s,
    };

    key.sequence = key.sequence || s || key.name;

    const mapper = {
        '\r': {
            raw: undefined,
            name: 'return',
        },
        '\u001b\r': {
            raw: undefined,
            name: 'return',
            option: true,
        },
        '\n': {
            name: 'enter',
        },
        '\t': {
            name: 'tab',
        },
        '\x7f': {
            name: 'backspace',
        },
        '\x1b\x7f': {
            name: 'backspace',
            option: true,
        },
        '\b': {
            name: 'backspace',
        },
        '\x1b\b': {
            name: 'backspace',
            option: true,
        },
        '\x1b': {
            raw: '',
            name: 'escape',
        },
        '\x1b\x1b': {
            raw: '',
            name: 'escape',
            option: true,
        },
        ' ': {
            name: 'space',
        },
        '\x1b ': {
            // macOS 无法触发
            name: 'space',
            meta: true, // ?
        },
        '\u0017': {
            name: 'backspace',
            option: true,
        },
        '\x1Bf': {
            // macOS
            name: 'right',
            option: true,
        },
        '\x1Bb': {
            name: 'left',
            option: true,
        },
        '\x1Bd': {
            name: 'delete',
            option: true,
        },
        '\u001b[1;3B': {
            name: 'down',
            option: true,
        },
        '\u001b[1;3A': {
            name: 'up',
            option: true,
        },
    };
    /** @ts-ignore */
    const mapObject = mapper[s];
    if (mapObject) {
        return Object.assign(key, mapObject);
    }

    if (s.length === 1 && s <= '\x1a') {
        // ctrl+letter
        const code = s.charCodeAt(0);
        const letter = String.fromCharCode(code + 'a'.charCodeAt(0) - 1);

        key.name = letter;
        key.ctrl = true;
    } else if (s.length === 1 && s >= '0' && s <= '9') {
        // number
        // macOS check
        // option x
        key.name = 'number';
    } else if (s.length === 1 && s >= 'a' && s <= 'z') {
        // lowercase letter
        key.name = s;
    } else if (s.length === 1 && s >= 'A' && s <= 'Z') {
        // shift+letter
        key.name = s.toLowerCase();
        key.shift = true;
    } else if ((parts = optionKeyCodeRe.exec(s))) {
        // option + character key
        key.option = true;
        key.shift = /^[A-Z]$/.test(parts[1]!);
    } else if ((parts = fnKeyRe.exec(s))) {
        // ansi escape sequence
        // reassemble the key code leaving out leading \x1b's,
        // the modifier key bitflag and any meaningless "1;" sequence
        const code = [parts[1], parts[2], parts[4], parts[6]].filter(Boolean).join('');

        if (code[0] === '\u001b') {
            key.option = true;
        }

        const modifier = ((parts[3] || parts[5] || 1) as number) - 1;

        // Parse the key modifier
        key.meta = !!(modifier & 10);
        key.code = code;
        key.name = keyName[code]!;
        key.shift = isShiftKey(code) || !!(modifier & 1);
        key.ctrl = isCtrlKey(code) || !!(modifier & 4);
    }

    return key;
};

export default parseKeypress;
