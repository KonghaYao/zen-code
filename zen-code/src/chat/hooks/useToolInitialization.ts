/**
 * useToolInitialization Hook
 *
 * Manages tools initialization on component mount.
 * Executes only once per app load.
 *
 * Follows Vercel best practices:
 * - Advanced init-once pattern (advanced-init-once)
 * - Dependency optimization (rerender-dependencies)
 */

import { useEffect, useRef } from 'react';

interface UseToolInitializationOptions {
    tools: any[];
    setTools: (tools: any[]) => void;
}

/**
 * Initialize tools once on mount
 *
 * @param options - Hook options
 *
 * Example:
 * ```tsx
 * useToolInitialization({ tools: DefaultTools, setTools });
 * ```
 */
export function useToolInitialization({ tools, setTools }: UseToolInitializationOptions) {
    const initializedRef = useRef(false);

    useEffect(() => {
        // Only initialize once
        if (!initializedRef.current) {
            setTools(tools);
            initializedRef.current = true;
        }
    }, [tools, setTools]);
}
