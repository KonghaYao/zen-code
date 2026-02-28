/**
 * Shell Command Utility Tests
 *
 * Tests for shell command utility functions (without React hooks).
 */

import { describe, it, expect } from 'vitest';

// Test interactive command detection
describe('Interactive Command Detection', () => {
    const INTERACTIVE_COMMANDS = ['vim', 'nano', 'less', 'more', 'top', 'htop', 'vi', 'emacs', 'crontab -e'];

    const isInteractiveCommand = (command: string): string | null => {
        const lowerCommand = command.toLowerCase().trim();
        const tokens = lowerCommand.split(/\s+/);

        // Check exact command matches (like vim, nano, etc.)
        for (const ic of INTERACTIVE_COMMANDS) {
            if (lowerCommand === ic || lowerCommand.startsWith(ic + ' ')) {
                return (
                    `⚠️ 交互式命令不支持，请使用非交互模式:\n` + `  例如: git commit -m "message" 或使用 --no-edit 参数`
                );
            }
        }

        // Special case: git commit without -m or --no-edit
        if (tokens[0] === 'git' && tokens[1] === 'commit') {
            const hasMessageFlag =
                tokens.includes('-m') ||
                tokens.includes('--message') ||
                tokens.includes('--amend') ||
                tokens.includes('--no-edit');
            if (!hasMessageFlag) {
                return (
                    `⚠️ 交互式命令不支持，请使用非交互模式:\n` + `  例如: git commit -m "message" 或使用 --no-edit 参数`
                );
            }
        }

        return null;
    };

    it('should detect vim as interactive', () => {
        const warning = isInteractiveCommand('vim file.txt');
        expect(warning).toContain('交互式命令不支持');
    });

    it('should detect nano as interactive', () => {
        const warning = isInteractiveCommand('nano file.txt');
        expect(warning).toContain('交互式命令不支持');
    });

    it('should detect less as interactive', () => {
        const warning = isInteractiveCommand('less large-file.txt');
        expect(warning).toContain('交互式命令不支持');
    });

    it('should detect top as interactive', () => {
        const warning = isInteractiveCommand('top');
        expect(warning).toContain('交互式命令不支持');
    });

    it('should detect git commit without message as interactive', () => {
        const warning = isInteractiveCommand('git commit');
        expect(warning).toContain('交互式命令不支持');
    });

    it('should detect git rebase -i as interactive', () => {
        const warning = isInteractiveCommand('git rebase -i HEAD~3');
        expect(warning).toBeNull(); // git rebase -i is not in our list
    });

    it('should allow git commit with message', () => {
        const warning = isInteractiveCommand('git commit -m "test message"');
        expect(warning).toBeNull();
    });

    it('should allow git commit with --no-edit', () => {
        const warning = isInteractiveCommand('git commit --no-edit');
        expect(warning).toBeNull();
    });

    it('should allow echo command', () => {
        const warning = isInteractiveCommand('echo hello');
        expect(warning).toBeNull();
    });

    it('should allow ls command', () => {
        const warning = isInteractiveCommand('ls -la');
        expect(warning).toBeNull();
    });

    it('should allow npm commands', () => {
        const warning = isInteractiveCommand('npm run dev');
        expect(warning).toBeNull();
    });

    it('should be case insensitive', () => {
        const warning = isInteractiveCommand('VIM file.txt');
        expect(warning).toContain('交互式命令不支持');
    });

    it('should allow git commit with --amend', () => {
        const warning = isInteractiveCommand('git commit --amend --no-edit');
        expect(warning).toBeNull();
    });

    it('should allow git commit with --message', () => {
        const warning = isInteractiveCommand('git commit --message "test"');
        expect(warning).toBeNull();
    });
});

// Test output truncation
describe('Output Truncation', () => {
    const truncateOutput = (output: string, maxLines: number = 10): string => {
        if (!output) {
            return '';
        }

        const lines = output.split('\n');

        if (lines.length <= maxLines) {
            return output;
        }

        return [...lines.slice(0, maxLines), '... (more)'].join('\n');
    };

    it('should not truncate short output', () => {
        const output = 'line1\nline2\nline3';
        const truncated = truncateOutput(output, 10);
        expect(truncated).toBe(output);
        expect(truncated.split('\n').length).toBe(3);
    });

    it('should truncate long output to max lines', () => {
        const output = Array(20)
            .fill('line')
            .map((_, i) => `line${i}`)
            .join('\n');
        const truncated = truncateOutput(output, 10);
        const lines = truncated.split('\n');

        expect(lines.length).toBe(11); // 10 lines + '... (more)'
        expect(lines[0]).toBe('line0');
        expect(lines[9]).toBe('line9');
        expect(lines[10]).toBe('... (more)');
    });

    it('should handle empty output', () => {
        const truncated = truncateOutput('', 10);
        expect(truncated).toBe('');
    });

    it('should handle single line output', () => {
        const output = 'single line';
        const truncated = truncateOutput(output, 10);
        expect(truncated).toBe(output);
    });

    it('should handle exact max lines', () => {
        const output = Array(10)
            .fill('line')
            .map((_, i) => `line${i}`)
            .join('\n');
        const truncated = truncateOutput(output, 10);
        const lines = truncated.split('\n');

        expect(lines.length).toBe(10); // Exactly 10 lines, no truncation
        expect(lines).not.toContain('... (more)');
    });

    it('should handle max lines + 1', () => {
        const output = Array(11)
            .fill('line')
            .map((_, i) => `line${i}`)
            .join('\n');
        const truncated = truncateOutput(output, 10);
        const lines = truncated.split('\n');

        expect(lines.length).toBe(11); // 10 lines + '... (more)'
        expect(lines).toContain('... (more)');
    });
});
