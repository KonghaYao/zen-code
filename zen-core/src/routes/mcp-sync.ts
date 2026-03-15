/**
 * MCP Sync 端点
 *
 * zen-swarm 启动后将已启用的 MCP 配置推送到 zen-core 进程内存。
 * zen-core 的 MCPManager 从此内存读取配置（不再访问 SQLite）。
 *
 * 流程：
 *   zen-swarm 启动 → bootstrapLocal() → connectToZenCore() →
 *   POST /api/mcp-sync → zen-core 内存更新 → MCPManager 重载
 *
 * 用户修改 MCP 配置后：
 *   zen-swarm mcpStorage 写入 → POST /api/mcp-sync → MCPManager 重载
 */

import type { Hono } from 'hono';

// 进程内 MCP 配置缓存（{ serverName: config }）
let _mcpConfigInMemory: Record<string, unknown> = {};

/**
 * 注册 mcp-sync 端点到 Hono app
 */
export function registerMcpSyncRoute(app: Hono): void {
    // POST /api/mcp-sync
    // Body: { servers: Record<string, unknown> }
    app.post('/api/mcp-sync', async (c) => {
        try {
            const body = await c.req.json<{ servers?: Record<string, unknown> }>();
            _mcpConfigInMemory = body.servers ?? body ?? {};
            console.log(`[mcp-sync] Received ${Object.keys(_mcpConfigInMemory).length} MCP server(s)`);
            return c.json({ ok: true, count: Object.keys(_mcpConfigInMemory).length });
        } catch (err) {
            console.error('[mcp-sync] Failed to parse request body:', err);
            return c.json({ ok: false, error: String(err) }, 400);
        }
    });

    // GET /api/mcp-sync（供调试查询当前缓存）
    app.get('/api/mcp-sync', (c) => {
        return c.json({ servers: _mcpConfigInMemory });
    });
}

/**
 * 获取进程内 MCP 配置（供 MCPMiddleware 使用）
 */
export function getMcpConfigInMemory(): Record<string, unknown> {
    return _mcpConfigInMemory;
}
