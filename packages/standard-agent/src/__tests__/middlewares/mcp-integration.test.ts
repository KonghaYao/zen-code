/**
 * MCPMiddleware 集成测试 - 模拟 load_mcp_tools 场景
 *
 * 测试场景：
 * - 创建 MCP middleware
 * - 调用 load_mcp_tools 工具（这个场景之前会 hang）
 * - 验证不会无限等待
 * - 验证返回正确结果
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMCPMiddleware, MCPConfig } from '../../middlewares/mcp';

describe('MCPMiddleware Integration Tests', () => {
    describe('load_mcp_tools 工具调用', () => {
        it('应该在合理时间内完成，不会 hang', async () => {
            // Mock 配置提供器 - 返回空配置（无 MCP 服务器）
            const configProvider = vi.fn().mockResolvedValue({
                servers: {},
            });

            const middleware = createMCPMiddleware({ configProvider });

            // 等待初始化完成
            await new Promise((resolve) => setTimeout(resolve, 200));

            // 获取 load_mcp_tools 工具
            const loadMcpToolsTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');
            expect(loadMcpToolsTool).toBeDefined();

            // 调用工具 - 这个调用之前会 hang
            const startTime = Date.now();
            const result = await loadMcpToolsTool!.invoke({});
            const endTime = Date.now();

            // 验证在合理时间内完成
            expect(endTime - startTime).toBeLessThan(5000); // 5 秒内

            // 验证返回结果
            const parsedResult = JSON.parse(result);
            expect(parsedResult).toHaveProperty('tools');
            expect(parsedResult).toHaveProperty('status');
            expect(parsedResult.tools).toBeInstanceOf(Array);
        }, 10000); // 测试本身最多 10 秒

        it('应该正确处理有 MCP 服务器配置的情况', async () => {
            // Mock 配置提供器 - 返回有效的 MCP 服务器配置
            const configProvider = vi.fn().mockResolvedValue({
                servers: {
                    test_server: {
                        command: 'echo',
                        args: ['test'],
                    },
                },
            });

            const middleware = createMCPMiddleware({ configProvider });

            // 等待初始化完成（包括连接尝试）
            await new Promise((resolve) => setTimeout(resolve, 500));

            // 获取 load_mcp_tools 工具
            const loadMcpToolsTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');
            expect(loadMcpToolsTool).toBeDefined();

            // 调用工具
            const result = await loadMcpToolsTool!.invoke({});

            // 验证返回结果
            const parsedResult = JSON.parse(result);
            expect(parsedResult).toHaveProperty('tools');
            expect(parsedResult).toHaveProperty('status');

            // 即使连接失败（因为 echo 命令不是真正的 MCP 服务器），
            // 也应该返回结果而不是 hang
            expect(parsedResult.status).toHaveProperty('isInitialized');
            expect(parsedResult.status).toHaveProperty('servers');
        }, 10000);

        it('应该正确处理配置返回 null 的情况', async () => {
            // Mock 配置提供器 - 返回 null
            const configProvider = vi.fn().mockResolvedValue(null);

            const middleware = createMCPMiddleware({ configProvider });

            // 等待初始化完成
            await new Promise((resolve) => setTimeout(resolve, 200));

            // 获取 load_mcp_tools 工具
            const loadMcpToolsTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');
            expect(loadMcpToolsTool).toBeDefined();

            // 调用工具
            const result = await loadMcpToolsTool!.invoke({});

            // 验证返回结果 - 应该返回空工具列表
            const parsedResult = JSON.parse(result);
            expect(parsedResult.tools).toEqual([]);
            expect(parsedResult.status.toolCount).toBe(0);
        }, 10000);
    });
});
