/**
 * useMcpConfig Hook
 *
 * Manages MCP configuration using TanStack Query.
 * Based on the existing useConfig pattern.
 *
 * Features:
 * - Automatic loading state
 * - Error handling
 * - Cache management
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { MCPConfig } from '@codegraph/config';

interface UseMcpConfigOptions {
    mcpConfig: MCPConfig;
    updateConfig: (config: Partial<{ mcp_config: MCPConfig }>) => Promise<void>;
}

/**
 * Update MCP configuration
 *
 * @param options - Hook options
 * @returns Mutation result
 *
 * Example:
 * ```tsx
 * const { updateMcpConfig } = useMcpConfig({ mcpConfig, updateConfig });
 *
 * const handleAddServer = async () => {
 *   await updateMcpConfig.mutateAsync({
 *     ...mcpConfig,
 *     'new-server': { command: 'npx', args: ['-y', 'server'] }
 *   });
 * };
 * ```
 */
export function useMcpConfig({ mcpConfig, updateConfig }: UseMcpConfigOptions) {
    const queryClient = useQueryClient();

    const updateMcpConfig = useMutation({
        mutationFn: async (newConfig: MCPConfig) => {
            await updateConfig({ mcp_config: newConfig });
            return newConfig;
        },
        onSuccess: (updatedConfig) => {
            // Update MCP config cache
            queryClient.setQueryData(queryKeys.mcp.config(), updatedConfig);
        },
    });

    return {
        mcpConfig,
        updateMcpConfig: updateMcpConfig.mutateAsync,
        isUpdating: updateMcpConfig.isPending,
    };
}
