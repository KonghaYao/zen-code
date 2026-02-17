/**
 * MCP Middleware with Config Integration
 *
 * Project-specific MCP middleware that integrates with FileSystemConfigStore.
 * Extends the base MCPMiddleware from standard-agent with project configuration loading.
 *
 * ## Usage
 *
 * ```typescript
 * import { MCPWithConfigMiddleware } from '@codegraph/agent';
 *
 * // Auto-load from default config store
 * const mcpMiddleware = new MCPWithConfigMiddleware();
 *
 * const agent = createAgent({
 *   model,
 *   systemPrompt,
 *   tools,
 *   middleware: [mcpMiddleware]
 * });
 * ```
 */

import { MCPMiddleware, MCPConfig } from '@langgraph-js/standard-agent';
import { FileSystemConfigStore } from '@codegraph/config';

/**
 * MCP Middleware with Config Integration
 *
 * Extends base MCPMiddleware to load MCP configuration from FileSystemConfigStore.
 * Automatically loads ~/.zen-code/settings.json for MCP server configuration.
 */
export class MCPWithConfigMiddleware extends MCPMiddleware {
    constructor(cache?: { ttl?: number; reconnectDelay?: number }) {
        super({
            configProvider: async () => MCPWithConfigMiddleware.loadConfigFromStore(),
            cache,
        });
    }

    /**
     * Load MCP configuration from FileSystemConfigStore
     *
     * Reads ~/.zen-code/settings.json and extracts mcp_config section
     */
    private static async loadConfigFromStore(): Promise<MCPConfig | null> {
        try {
            const store = new FileSystemConfigStore();
            await store.initialize();
            const globalConfig = await store.getConfig();

            if (!globalConfig.mcp_config || Object.keys(globalConfig.mcp_config).length === 0) {
                return null;
            }

            // Transform to MCPConfig format
            return {
                servers: globalConfig.mcp_config as any,
            };
        } catch (error) {
            console.error('Failed to load MCP config from store:', error);
            return null;
        }
    }
}
