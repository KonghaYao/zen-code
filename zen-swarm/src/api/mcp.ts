/**
 * MCP Config API Routes
 *
 * 提供 MCP 配置的 CRUD 操作
 */

import { router, publicProcedure, handleNotFound } from './trpc.js';
import { z } from 'zod';
import { mcpStorage } from '../config/loader.js';
import { McpConfigData } from '../config/storage.js';
import { v7 as uuidv7 } from 'uuid';

/**
 * Simple ID generator using UUID v7
 */
function randomId(prefix: string): string {
    return `${prefix}-${uuidv7()}`;
}

/**
 * MCP Config Input Schema (zod v4: two-parameter record)
 */
export const McpConfigInputSchema = z.object({
    id: z.string().optional(),
    name: z.string().describe('MCP config name'),
    config: z.record(z.string(), z.any()).describe('MCP server configuration'),
    enabled: z.boolean().default(true),
});

export const UpdateMcpConfigSchema = McpConfigInputSchema.partial().extend({
    id: z.string(),
});

/**
 * MCP Config Routes
 */
export const mcpRouter = router({
    /**
     * List all MCP configs
     */
    list: publicProcedure.query(async () => {
        const rows = await mcpStorage.getAllMcpConfigs();
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            config: JSON.parse(row.config),
            enabled: row.enabled === 1,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));
    }),

    /**
     * Get MCP config by ID
     */
    get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
        const row = await mcpStorage.getMcpConfig(input.id);
        if (!row) {
            handleNotFound('MCP config', input.id);
        }
        return {
            id: row.id,
            name: row.name,
            config: JSON.parse(row.config),
            enabled: row.enabled === 1,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }),

    /**
     * Get MCP config by name
     */
    getByName: publicProcedure.input(z.object({ name: z.string() })).query(async ({ input }) => {
        const row = await mcpStorage.getMcpConfigByName(input.name);
        if (!row) {
            handleNotFound('MCP config', input.name);
        }
        return {
            id: row.id,
            name: row.name,
            config: JSON.parse(row.config),
            enabled: row.enabled === 1,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }),

    /**
     * Get enabled MCP configs (as object format)
     */
    getEnabled: publicProcedure.query(async () => {
        return await mcpStorage.getMcpConfigAsObject();
    }),

    /**
     * Create MCP config
     */
    create: publicProcedure.input(McpConfigInputSchema).mutation(async ({ input }) => {
        const id = input.id || randomId('mcp');
        const data: McpConfigData = {
            id,
            name: input.name,
            config: input.config,
            enabled: input.enabled ?? true,
        };

        await mcpStorage.insertMcpConfig(data);
        return data;
    }),

    /**
     * Update MCP config
     */
    update: publicProcedure.input(UpdateMcpConfigSchema).mutation(async ({ input }) => {
        const data: McpConfigData = {
            id: input.id,
            name: input.name!,
            config: input.config!,
            enabled: input.enabled ?? true,
        };

        await mcpStorage.updateMcpConfig(data);
        return data;
    }),

    /**
     * Delete MCP config
     */
    delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
        await mcpStorage.deleteMcpConfig(input.id);
        return { success: true };
    }),
});
