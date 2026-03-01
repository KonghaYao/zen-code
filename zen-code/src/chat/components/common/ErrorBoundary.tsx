import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
    children: ReactNode;
    name?: string;
    fallback?: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const { name = 'ErrorBoundary' } = this.props;

        console.error(`\n========================================`);
        console.error(`[${name}] React Error Caught`);
        console.error(`========================================`);
        console.error(`Error:`, error.message);
        console.error(`Stack:`, error.stack);
        console.error(`Component Stack:`, errorInfo.componentStack);
        console.error(`========================================\n`);

        // 记录到错误日志
        import('../../services/ErrorInterceptor')
            .then(({ logAgentError }) => {
                logAgentError(name, error);
            })
            .catch((err) => {
                console.warn('Failed to log React error:', err);
            });

        // Update state with error info for rendering
        this.setState({ errorInfo });
    }

    render() {
        const { hasError, error, errorInfo } = this.state;
        const { name = 'ErrorBoundary', fallback, children } = this.props;

        if (hasError) {
            // Custom fallback if provided
            if (fallback) {
                return <>{fallback}</>;
            }

            // Default error UI
            return (
                <Box flexDirection="column" padding={1} borderStyle="double" borderColor="red">
                    <Box marginBottom={1}>
                        <Text color="red" bold>
                            ✗ [{name}] Render Error
                        </Text>
                    </Box>

                    <Box marginBottom={1}>
                        <Text color="red">Message: {error?.message || 'Unknown error'}</Text>
                    </Box>

                    {error?.stack && (
                        <Box flexDirection="column" marginBottom={1}>
                            <Text color="yellow" bold>
                                Stack Trace:
                            </Text>
                            <Text color="gray">{error.stack.split('\n').slice(0, 5).join('\n')}</Text>
                        </Box>
                    )}

                    {errorInfo?.componentStack && (
                        <Box flexDirection="column">
                            <Text color="yellow" bold>
                                Component Stack:
                            </Text>
                            <Text color="gray" dimColor>
                                {errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}
                            </Text>
                        </Box>
                    )}

                    <Box marginTop={1}>
                        <Text color="blue" dimColor>
                            Press Ctrl+C to exit
                        </Text>
                    </Box>
                </Box>
            );
        }

        return <>{children}</>;
    }
}

export default ErrorBoundary;
