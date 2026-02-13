import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ErrorBoundaryProps {
    children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box flexDirection="column">
                    <Text color="red">✗ Render error</Text>
                    <Text color="gray" dimColor>
                        {this.state.error?.message || 'Unknown error'}
                    </Text>
                </Box>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
