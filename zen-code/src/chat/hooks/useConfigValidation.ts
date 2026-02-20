/**
 * useConfigValidation Hook
 *
 * Manages configuration validation state.
 * Eliminates useEffect waterfalls by handling config validation during render.
 *
 * Follows Vercel best practices:
 * - Derived state computation during render (rerender-derived-state-no-effect)
 * - Memoization for expensive computations
 */

import { useMemo } from 'react';
import type { AppConfig } from '@codegraph/config';
import { validateConfig } from '../utils/configValidation';

interface UseConfigValidationOptions {
    config: AppConfig | null;
}

interface ConfigValidationResult {
    validation: ReturnType<typeof validateConfig> | null;
    needsSetup: boolean;
    isValid: boolean;
}

/**
 * Compute validation state during render
 *
 * @param options - Hook options
 * @returns Validation result
 *
 * Example:
 * ```tsx
 * const { needsSetup, isValid } = useConfigValidation({ config });
 *
 * if (needsSetup) {
 *   return <SetupWizard validation={validation} />;
 * }
 * ```
 */
export function useConfigValidation({ config }: UseConfigValidationOptions): ConfigValidationResult {
    return useMemo(() => {
        if (!config) {
            return {
                validation: null,
                needsSetup: true,
                isValid: false,
            };
        }

        const validation = validateConfig(config);

        return {
            validation,
            needsSetup: validation.needsSetup,
            isValid: !validation.needsSetup,
        };
    }, [config]);
}
