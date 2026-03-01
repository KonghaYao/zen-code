/**
 * inputColorizer.ts
 *
 * Syntax-highlighting for the chat input line.
 *
 * Token types:
 *   command  — the /name part of a slash command (e.g. `/interview`)
 *   args     — everything after the first space in a slash command
 *   skill    — the #name part of a skill reference (e.g. `#codebase-exploration`)
 *   text     — plain text
 *
 * Color scheme:
 *   command  → cyan bold
 *   args     → white (default terminal color)
 *   skill    → green bold
 *   text     → white (default)
 */

import chalk from 'chalk';

type TokenType = 'command' | 'args' | 'skill' | 'text';

interface Token {
    type: TokenType;
    value: string;
}

/**
 * Tokenize a single input line into typed segments.
 *
 * Rules (applied left-to-right, non-overlapping):
 * 1. If the line starts with `/` and has no space yet → whole line is `command`
 * 2. If the line starts with `/` and has a space →
 *      - `/commandName` part is `command`
 *      - The rest (including the space) is scanned char-by-char for skills and plain args
 * 3. In the "args" region (or in a plain message) any `#word` preceded by start-of-string
 *    or whitespace is a `skill` token; everything else is `text`/`args`
 */
export function tokenizeLine(line: string): Token[] {
    if (line.length === 0) return [];

    const tokens: Token[] = [];

    if (line.startsWith('/')) {
        const spaceIdx = line.indexOf(' ');

        if (spaceIdx === -1) {
            // Pure command phase — no args yet
            tokens.push({ type: 'command', value: line });
            return tokens;
        }

        // Split into command name + rest
        const commandPart = line.slice(0, spaceIdx); // e.g. "/interview"
        const argsPart = line.slice(spaceIdx); // e.g. " djidji #skill"

        tokens.push({ type: 'command', value: commandPart });

        // Scan the args part for skill tokens
        tokens.push(...tokenizeArgsOrText(argsPart, 'args'));
        return tokens;
    }

    // Plain message — scan for skill tokens
    tokens.push(...tokenizeArgsOrText(line, 'text'));
    return tokens;
}

/**
 * Scan a string (args region or plain text) and split out `#skill` tokens.
 * Everything that isn't a skill token gets the `baseType` ('args' or 'text').
 */
function tokenizeArgsOrText(input: string, baseType: 'args' | 'text'): Token[] {
    const tokens: Token[] = [];

    // Regex: match `#word` that is preceded by start-of-string or whitespace
    // \b doesn't work well with #, so we use a lookahead on the char before
    const skillRe = /(^|(?<=\s))(#[\w-]+)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = skillRe.exec(input)) !== null) {
        const skillFull = match[2]; // the `#name` part
        const matchStart = match.index + match[1].length; // position of '#'

        // Text before the skill
        if (matchStart > lastIndex) {
            tokens.push({ type: baseType, value: input.slice(lastIndex, matchStart) });
        }

        tokens.push({ type: 'skill', value: skillFull });
        lastIndex = matchStart + skillFull.length;
    }

    // Remaining text after last skill
    if (lastIndex < input.length) {
        tokens.push({ type: baseType, value: input.slice(lastIndex) });
    }

    return tokens;
}

/**
 * Apply chalk colors to a token array and return a single colored string.
 */
function renderTokens(tokens: Token[]): string {
    return tokens
        .map(({ type, value }) => {
            switch (type) {
                case 'command':
                    return chalk.cyan.bold(value);
                case 'args':
                    return value; // keep terminal default color
                case 'skill':
                    return chalk.green.bold(value);
                case 'text':
                    return value; // keep terminal default color
            }
        })
        .join('');
}

/**
 * Main entry point: takes a raw input line and returns a chalk-colored string.
 * Safe to pass as `colorizeContent` to `MultiLineTextInput`.
 */
export function colorizeInputLine(line: string): string {
    if (line.length === 0) return line;
    const tokens = tokenizeLine(line);
    return renderTokens(tokens);
}
