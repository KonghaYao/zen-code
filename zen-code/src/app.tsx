import { render } from 'ink';
import { Box, Text } from 'ink';
import React from 'react';
import { Chat } from './index';

// Top-level fallback UI for catastrophic errors
const FallbackUI: React.FC<{ error: Error }> = ({ error }) => (
    <Box flexDirection="column" padding={2} borderStyle="double" borderColor="red">
        <Text color="red" bold>
            ✗ Application Crashed
        </Text>
        <Box marginTop={1}>
            <Text color="red">{error.message}</Text>
        </Box>
        <Box marginTop={1}>
            <Text color="gray">Stack: {error.stack?.split('\n').slice(0, 3).join('\n')}</Text>
        </Box>
        <Box marginTop={1}>
            <Text color="blue">Press Ctrl+C to exit</Text>
        </Box>
    </Box>
);

// Render with global error handler
try {
    render(<Chat />, {
        exitOnCtrlC: false,
        // Ink doesn't have built-in error boundary, errors here are caught below
    });
} catch (error) {
    console.error('Critical rendering error:', error);
    // Render a fallback UI if the initial render fails
    render(<FallbackUI error={error as Error} />, { exitOnCtrlC: false });
}

// Also catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Note: Node.js will exit after uncaughtException handler
    // We just log the error for debugging
});
