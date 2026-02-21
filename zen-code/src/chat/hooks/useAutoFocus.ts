/**
 * useAutoFocus Hook
 *
 * Manages auto-focus behavior for chat input.
 * Eliminates useEffect waterfalls by handling focus management in a custom hook.
 *
 * Follows Vercel best practices:
 * - Dependency optimization (rerender-dependencies)
 */

import { useEffect } from 'react';
import { useFocusManager } from 'ink';

interface UseAutoFocusOptions {
    shouldFocus: boolean;
}

/**
 * Auto-focus global input when condition is met
 *
 * @param options - Hook options
 *
 * Example:
 * ```tsx
 * useAutoFocus({ shouldFocus: !loading });
 * ```
 */
export function useAutoFocus({ shouldFocus }: UseAutoFocusOptions) {
    const focusManager = useFocusManager();

    useEffect(() => {
        if (shouldFocus) {
            focusManager.focus('global-input');
        }
    }, [shouldFocus, focusManager]);
}
