/**
 * MCPMiddleware 测试 - 基础测试（无 mock）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMCPMiddleware, MCPConfig } from '../../middlewares/mcp';

describe('MCPMiddleware (standard-agent)', () => {
    describe('类型和导出', () => {
        it('应该正确导出 MCPMiddleware 类', () => {
            const configProvider: () => Promise<MCPConfig | null> = vi.fn().mockResolvedValue(null);
            const middleware = createMCPMiddleware({ configProvider });

            expect(middleware.name).toBe('MCPMiddleware');
            expect(middleware.tools).toHaveLength(2);
            expect(middleware.tools.map((t) => t.name)).toEqual(['load_mcp_tools', 'execute_mcp_tool']);
        });

        it('应该接受配置选项', () => {
            const configProvider = vi.fn().mockResolvedValue(null);
            const middleware = createMCPMiddleware({
                configProvider,
                cache: {
                    ttl: 600,
                    reconnectDelay: 10000,
                },
            });

            expect(middleware).toBeDefined();
            expect(middleware.name).toBe('MCPMiddleware');
        });

        it('应该处理空配置', () => {
            const nullConfigProvider = vi.fn().mockResolvedValue(null);
            const middleware = createMCPMiddleware({
                configProvider: nullConfigProvider,
            });

            expect(middleware.name).toBe('MCPMiddleware');
            expect(middleware.tools).toHaveLength(2);
        });
    });

    describe('工具结构', () => {
        let middleware: ReturnType<typeof createMCPMiddleware>;

        beforeEach(() => {
            const configProvider = vi.fn().mockResolvedValue(null);
            middleware = createMCPMiddleware({ configProvider });
        });

        it('load_mcp_tools 工具应该有正确的 schema', () => {
            const tool = middleware.tools.find((t) => t.name === 'load_mcp_tools');
            expect(tool).toBeDefined();
            expect(tool?.name).toBe('load_mcp_tools');
            expect(tool?.description).toBeDefined();
        });

        it('execute_mcp_tool 工具应该有正确的 schema', () => {
            const tool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(tool).toBeDefined();
            expect(tool?.name).toBe('execute_mcp_tool');
            expect(tool?.description).toBeDefined();
        });
    });

    describe('Schema 导出', () => {
        it('应该导出 LoadMcpToolsSchema', async () => {
            const { LoadMcpToolsSchema } = await import('../../middlewares/mcp');
            const result = LoadMcpToolsSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it('应该导出 ExecuteMcpToolSchema', async () => {
            const { ExecuteMcpToolSchema } = await import('../../middlewares/mcp');
            const result = ExecuteMcpToolSchema.safeParse({
                commands: [
                    { name: 'tool1', args: { param1: 'value1' } },
                    { name: 'tool2', args: {} },
                ],
            });
            expect(result.success).toBe(true);
        });

        it('ExecuteMcpToolSchema 应该拒绝无效格式', async () => {
            const { ExecuteMcpToolSchema } = await import('../../middlewares/mcp');
            const result = ExecuteMcpToolSchema.safeParse({
                commands: 'invalid',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('wrapModelCall（默认模式）', () => {
        let middleware: ReturnType<typeof createMCPMiddleware>;

        beforeEach(() => {
            const configProvider = vi.fn().mockResolvedValue(null);
            middleware = createMCPMiddleware({ configProvider });
        });

        it('应该添加 MCP 系统提示词', async () => {
            const handler = vi.fn().mockResolvedValue({});
            const request = {
                systemPrompt: 'Original prompt',
            };

            await middleware.wrapModelCall(request, handler);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('MCP Tools'),
                }),
            );
        });

        it('应该在没有系统提示词时创建新的', async () => {
            const handler = vi.fn().mockResolvedValue({});
            const request = {};

            await middleware.wrapModelCall(request, handler);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('MCP Tools'),
                }),
            );
        });

        it('应该保留原有系统提示词', async () => {
            const handler = vi.fn().mockResolvedValue({});
            const request = {
                systemPrompt: 'Original prompt',
            };

            await middleware.wrapModelCall(request, handler);

            const call = handler.mock.calls[0][0];
            expect(call.systemPrompt).toContain('Original prompt');
        });

        it('应该包含 load_mcp_tools 说明', async () => {
            const handler = vi.fn().mockResolvedValue({});
            const request = {};

            await middleware.wrapModelCall(request, handler);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('load_mcp_tools'),
                }),
            );
        });

        it('应该包含 execute_mcp_tool 说明', async () => {
            const handler = vi.fn().mockResolvedValue({});
            const request = {};

            await middleware.wrapModelCall(request, handler);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('execute_mcp_tool'),
                }),
            );
        });
    });

    describe('directInject 模式', () => {
        it('directInject: false（默认）时 tools 返回 load_mcp_tools + execute_mcp_tool', () => {
            const configProvider = vi.fn().mockResolvedValue(null);
            const middleware = createMCPMiddleware({ configProvider });

            expect(middleware.tools).toHaveLength(2);
            expect(middleware.tools.map((t) => t.name)).toEqual(['load_mcp_tools', 'execute_mcp_tool']);
        });

        it('directInject: true 时，初始化前 tools 返回空数组（cacheTools 尚未加载）', () => {
            const configProvider = vi.fn().mockResolvedValue(null);
            const middleware = createMCPMiddleware({ configProvider, directInject: true });

            expect(middleware.tools).toHaveLength(0);
        });

        it('directInject: false 时 wrapModelCall 应注入 MCP 说明', async () => {
            const configProvider = vi.fn().mockResolvedValue(null);
            const middleware = createMCPMiddleware({ configProvider, directInject: false });
            const handler = vi.fn().mockResolvedValue({});

            await middleware.wrapModelCall({ systemPrompt: 'base' }, handler);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemPrompt: expect.stringContaining('load_mcp_tools'),
                }),
            );
        });

        it('directInject: true 时 wrapModelCall 应直接透传 request，不注入 MCP 说明', async () => {
            const configProvider = vi.fn().mockResolvedValue(null);
            const middleware = createMCPMiddleware({ configProvider, directInject: true });
            const handler = vi.fn().mockResolvedValue({});
            const request = { systemPrompt: 'original' };

            await middleware.wrapModelCall(request, handler);

            expect(handler).toHaveBeenCalledWith(request);
            const call = handler.mock.calls[0][0];
            expect(call.systemPrompt).toBe('original');
            expect(call.systemPrompt).not.toContain('load_mcp_tools');
        });
    });
});
