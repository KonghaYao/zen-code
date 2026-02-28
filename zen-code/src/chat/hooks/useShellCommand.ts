/**
 * useShellCommand Hook
 *
 * Hook for executing shell commands from zen-code TUI.
 * Provides command execution, output display, and process management.
 *
 * ## Features
 *
 * - Detects interactive commands and warns user
 * - Executes commands in background
 * - Streams output in real-time
 * - Auto-hides output after 5 seconds
 * - Registers processes with background manager
 * - Truncates output to 10 lines max
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { executeBashCommand } from '@codegraph/agent/src/server/bash_command';

// Interactive commands that should be rejected
const INTERACTIVE_COMMANDS = [
    'vim',
    'nano',
    'less',
    'more',
    'top',
    'htop',
    'git commit',
    'git rebase -i',
    'crontab -e',
    'vi',
    'emacs',
];

export interface ShellCommandResult {
    id: string;
    command: string;
    output: string;
    status: 'running' | 'completed' | 'failed';
    exitCode?: number;
    pid?: number;
}

export interface UseShellCommandReturn {
    executeCommand: (command: string) => Promise<ShellCommandResult | null>;
    activeCommand: ShellCommandResult | null;
    clearOutput: () => void;
    isExecuting: boolean;
}

/**
 * Check if a command is interactive
 */
const isInteractiveCommand = (command: string): string | null => {
    const lowerCommand = command.toLowerCase().trim();
    const tokens = lowerCommand.split(/\s+/);

    // Check exact command matches (like vim, nano, etc.)
    for (const ic of INTERACTIVE_COMMANDS) {
        if (lowerCommand === ic || lowerCommand.startsWith(ic + ' ')) {
            return `⚠️ 交互式命令不支持，请使用非交互模式:\n` + `  例如: git commit -m "message" 或使用 --no-edit 参数`;
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
            return `⚠️ 交互式命令不支持，请使用非交互模式:\n` + `  例如: git commit -m "message" 或使用 --no-edit 参数`;
        }
    }

    return null;
};

/**
 * Truncate output to max lines
 */
const truncateOutput = (output: string, maxLines: number = 10): string => {
    const lines = output.split('\n');

    if (lines.length <= maxLines) {
        return output;
    }

    return [...lines.slice(0, maxLines), '... (more)'].join('\n');
};

/**
 * Hook for executing shell commands
 */
export const useShellCommand = (): UseShellCommandReturn => {
    const [activeCommand, setActiveCommand] = useState<ShellCommandResult | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Ref for auto-hide timer
    const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Clear auto-hide timer on unmount
    useEffect(() => {
        return () => {
            if (autoHideTimerRef.current) {
                clearTimeout(autoHideTimerRef.current);
            }
        };
    }, []);

    // Clear output and reset state
    const clearOutput = useCallback(() => {
        setActiveCommand(null);
        setIsExecuting(false);
        if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
            autoHideTimerRef.current = null;
        }
    }, []);

    // Execute shell command
    const executeCommand = useCallback(
        async (command: string): Promise<ShellCommandResult | null> => {
            // Trim command
            const trimmedCommand = command.trim();

            // Check for empty command
            if (!trimmedCommand) {
                return null;
            }

            // Check for interactive command
            const interactiveWarning = isInteractiveCommand(trimmedCommand);
            if (interactiveWarning) {
                setActiveCommand({
                    id: '',
                    command: trimmedCommand,
                    output: interactiveWarning,
                    status: 'failed',
                });
                setIsExecuting(false);
                return activeCommand;
            }

            setIsExecuting(true);

            try {
                // Call bash_command API endpoint using executeBashCommand from @codegraph/agent
                // This ensures consistent communication with the agent backend
                const result = await executeBashCommand({
                    command: trimmedCommand,
                    cwd: process.cwd(),
                });

                // Create shell command result
                const shellResult: ShellCommandResult = {
                    id: result.id,
                    command: trimmedCommand,
                    output: result.output || '',
                    status: result.status || 'completed',
                    exitCode: result.exitCode,
                    pid: result.pid,
                };

                // Set active command
                setActiveCommand(shellResult);
                setIsExecuting(false);

                // Auto-hide after 5 seconds if command completed successfully
                if (shellResult.status === 'completed' || shellResult.status === 'failed') {
                    autoHideTimerRef.current = setTimeout(() => {
                        clearOutput();
                    }, 5000);
                }

                return shellResult;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const errorResult: ShellCommandResult = {
                    id: '',
                    command: trimmedCommand,
                    output: `Error executing command: ${errorMessage}`,
                    status: 'failed',
                };

                setActiveCommand(errorResult);
                setIsExecuting(false);

                // Auto-hide error messages after 5 seconds
                autoHideTimerRef.current = setTimeout(() => {
                    clearOutput();
                }, 5000);

                return errorResult;
            }
        },
        [clearOutput, activeCommand],
    );

    return {
        executeCommand,
        activeCommand,
        clearOutput,
        isExecuting,
    };
};
