/**
 * TanStack Query Client Provider
 *
 * Provides QueryClient context to the zen-code application.
 * Configured for TUI (Terminal User Interface) environment.
 *
 * Key configurations for TUI:
 * - Disabled window focus refetching (no window events in terminal)
 * - Disabled network reconnection refetching
 * - Reasonable default stale times for different data types
 * - Development-friendly logging
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * Create global QueryClient with TUI-optimized defaults
 *
 * TUI-specific considerations:
 * - No window focus events → refetchOnWindowFocus: false
 * - No network connection events → refetchOnReconnect: false
 * - Limited screen real estate → prioritize loading indicators
 * - Development workflow → enable logging
 */
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Retry strategy
            retry: (failureCount, error) => {
                // Network errors: retry up to 2 times
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    return failureCount < 2;
                }
                // Business errors: don't retry
                return false;
            },

            // Refetch strategy (TUI-specific)
            refetchOnWindowFocus: false, // No window focus events in terminal
            refetchOnMount: true, // Fetch fresh data on component mount
            refetchOnReconnect: false, // No network events in terminal

            // Cache strategy
            staleTime: 5 * 60 * 1000, // Default 5 minutes
            gcTime: 10 * 60 * 1000, // Default 10 minutes (was cacheTime in v4)

            // Network mode
            networkMode: 'online', // Only fetch when online
        },
        mutations: {
            retry: 1, // Retry mutations once
            networkMode: 'online',
        },
    },

    // Logger for development debugging
    logger: {
        log: console.log,
        warn: console.warn,
        error: console.error,
    },
});

/**
 * Props for QueryClientProvider component
 */
interface TanStackQueryProviderProps {
    children: ReactNode;
}

/**
 * QueryClient Provider Component
 *
 * Wraps the application to provide TanStack Query context.
 * Should be placed at the root of the zen-code component tree.
 *
 * Usage:
 * ```tsx
 * import { TanStackQueryProvider } from './QueryClientProvider';
 *
 * export function App() {
 *   return (
 *     <TanStackQueryProvider>
 *       <Chat />
 *     </TanStackQueryProvider>
 *   );
 * }
 * ```
 */
export function TanStackQueryProvider({ children }: TanStackQueryProviderProps) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Export queryClient for direct access when needed
 * Useful for:
 * - Prefetching data outside React components
 * - Manual cache management
 * - Testing utilities
 */
export { queryClient };
