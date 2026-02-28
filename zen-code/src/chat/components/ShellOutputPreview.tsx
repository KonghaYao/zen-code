/**
 * ShellOutputPreview Component
 *
 * Displays shell command output in a temporary panel above the input box.
 * Supports auto-hide after completion, manual close, and stop button for running commands.
 *
 * ## Features
 *
 * - Displays command output in terminal-style panel
 * - Shows command metadata (PID, status, execution time)
 * - Auto-hides after 5 seconds (completed commands)
 * - Manual close button (×)
 * - Stop button for running commands (⏹)
 * - Truncates output to 10 lines max
 * - Shows status icons (✓, ⏳, ✗)
 */

import React, { memo, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { useShellCommand, type ShellCommandResult } from '../hooks/useShellCommand';

interface ShellOutputPreviewProps {
    commandResult: ShellCommandResult | null;
    onClose: () => void;
    onStop?: () => void;
}

/**
 * Format execution time
 */
const formatDuration = (startTime: number, endTime?: number): string => {
    const duration = (endTime || Date.now()) - startTime;
    if (duration < 1000) {
        return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
};

/**
 * Get status icon and color
 */
const getStatusDisplay = (status: ShellCommandResult['status']): { icon: string; color: string } => {
    switch (status) {
        case 'running':
            return { icon: '⏳', color: 'yellow' };
        case 'completed':
            return { icon: '✓', color: 'green' };
        case 'failed':
            return { icon: '✗', color: 'red' };
    }
};

/**
 * Truncate output to max lines
 */
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

/**
 * ShellOutputPreview Component
 */
export const ShellOutputPreview: React.FC<ShellOutputPreviewProps> = memo(({ commandResult, onClose, onStop }) => {
    const { exit } = useApp();

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyPress = (data: { key: string }) => {
            if (data.key === 'escape') {
                onClose();
            }
        };

        process.stdin.on('keypress', handleKeyPress);
        return () => {
            process.stdin.off('keypress', handleKeyPress);
        };
    }, [onClose]);

    // Early return if no command result
    if (!commandResult) {
        return null;
    }

    const { command, output, status, pid } = commandResult;
    const { icon, color } = getStatusDisplay(status);
    const truncatedOutput = truncateOutput(output, 10);

    // Header with command and controls
    const header = (
        <Box justifyContent="space-between">
            <Box>
                <Text bold color="cyan">
                    📟 $ {command}
                </Text>
            </Box>
            <Box>
                {status === 'running' && onStop && (
                    <Text bold color="red">
                        {' '}
                        [⏹ 停止]
                    </Text>
                )}
                <Text bold color="gray">
                    {' '}
                    [×]
                </Text>
            </Box>
        </Box>
    );

    // Output section
    const outputSection = (
        <Box flexDirection="column" marginTop={0}>
            {truncatedOutput.split('\n').map((line, index) => (
                <Box key={index}>
                    <Text color="gray">{line}</Text>
                </Box>
            ))}
        </Box>
    );

    // Footer with status
    const footer = (
        <Box justifyContent="space-between" marginTop={0}>
            <Text color={color}>
                {icon} {status === 'running' ? 'Running...' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
            {pid && <Text color="gray">PID: {pid}</Text>}
        </Box>
    );

    // Separator line
    const separator = (
        <Box>
            <Text color="gray">────────────────────────────────────────────────────────</Text>
        </Box>
    );

    return (
        <Box flexDirection="column" paddingX={1} paddingY={0} borderStyle="single" borderColor="gray" width="100%">
            {header}
            {separator}
            {truncatedOutput && outputSection}
            {footer}
        </Box>
    );
});

ShellOutputPreview.displayName = 'ShellOutputPreview';
