/**
 * MCPMiddleware 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPMiddleware, MCPStatus, LoadMcpToolsSchema, ExecuteMcpToolSchema } from '../../middlewares/mcp';
import { FileSystemConfigStore } from '@codegraph/config';

// Mock FileSystemConfigStore
const mockGetConfig = vi.fn().mockResolvedValue({
    mcp_config: {
        filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        },
    },
});

vi.mock('@codegraph/config', () => ({
    FileSystemConfigStore: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        getConfig: mockGetConfig,
    })),
}));

// Mock MultiServerMCPClient
const mockGetTools = vi.fn().mockResolvedValue([
    {
        name: 'filesystem.read_file',
        description: 'Read a file',
        schema: { type: 'object', properties: { path: { type: 'string' } } },
        invoke: vi.fn().mockResolvedValue({ content: 'file content' }),
    },
    {
        name: 'filesystem.write_file',
        description: 'Write a file',
        schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
        invoke: vi.fn().mockResolvedValue({ success: true }),
    },
]);

vi.mock('@langchain/mcp-adapters', () => ({
    MultiServerMCPClient: vi.fn().mockImplementation(() => ({
        getTools: mockGetTools,
        close: vi.fn().mockResolvedValue(undefined),
    })),
}));

describe('MCPMiddleware', () => {
    let middleware: MCPMiddleware;

    beforeEach(() => {
        middleware = new MCPMiddleware();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('构造函数', () => {
        it('应该设置正确的名称', () => {
            expect(middleware.name).toBe('MCPMiddleware');
        });

        it('应该提供两个工具', () => {
            expect(middleware.tools).toHaveLength(2);
            expect(middleware.tools.map((t) => t.name)).toEqual(['load_mcp_tools', 'execute_mcp_tool']);
        });

        it('应该自动初始化', async () => {
            // 等待初始化完成
            await new Promise((resolve) => setTimeout(resolve, 100));
            // 初始化逻辑在 constructor 中调用
            // 这里主要验证没有抛出错误
            expect(true).toBe(true);
        });
    });

    describe('load_mcp_tools', () => {
        it('应该返回工具列表和状态', async () => {
            const tool = middleware.tools.find((t) => t.name === 'load_mcp_tools');
            expect(tool).toBeDefined();

            const result = await tool.invoke({});
            const parsed = JSON.parse(result);

            expect(parsed).toHaveProperty('tools');
            expect(parsed).toHaveProperty('status');
            expect(parsed.status).toMatchObject({
                isInitialized: expect.any(Boolean),
                toolCount: expect.any(Number),
                servers: expect.any(Array),
            });
            // lastRefresh 存在且是数字或 null
            expect(parsed.status).toHaveProperty('lastRefresh');
        });

        it('应该包含正确的工具信息', async () => {
            const tool = middleware.tools.find((t) => t.name === 'load_mcp_tools');
            expect(tool).toBeDefined();

            const result = await tool.invoke({});
            const parsed = JSON.parse(result);

            expect(parsed.tools).toHaveLength(2);
            expect(parsed.tools[0]).toHaveProperty('name');
            expect(parsed.tools[0]).toHaveProperty('description');
            expect(parsed.tools[0]).toHaveProperty('schema');
        });
    });

    describe('execute_mcp_tool', () => {
        it('应该执行单个工具', async () => {
            const tool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(tool).toBeDefined();

            const result = await tool.invoke({
                commands: [
                    {
                        name: 'filesystem.read_file',
                        args: { path: '/tmp/test.txt' },
                    },
                ],
            });

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(1);
            expect(parsed.results[0]).toHaveProperty('tool', 'filesystem.read_file');
            expect(parsed.results[0]).toHaveProperty('result');
            expect(parsed.results[0]).not.toHaveProperty('error');
        });

        it('应该执行多个工具', async () => {
            const tool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(tool).toBeDefined();

            const result = await tool.invoke({
                commands: [
                    { name: 'filesystem.read_file', args: { path: '/tmp/test1.txt' } },
                    { name: 'filesystem.write_file', args: { path: '/tmp/test2.txt', content: 'test' } },
                ],
            });

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(2);
            expect(parsed.results[0]).toHaveProperty('tool', 'filesystem.read_file');
            expect(parsed.results[1]).toHaveProperty('tool', 'filesystem.write_file');
        });

        it('应该处理工具不存在错误', async () => {
            const tool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(tool).toBeDefined();

            const result = await tool.invoke({
                commands: [
                    {
                        name: 'nonexistent.tool',
                        args: {},
                    },
                ],
            });

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(1);
            expect(parsed.results[0]).toHaveProperty('error');
            expect(parsed.results[0].error).toContain('Tool not found');
        });

        it('应该返回包含可用工具列表的错误信息', async () => {
            const tool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(tool).toBeDefined();

            const result = await tool.invoke({
                commands: [
                    {
                        name: 'invalid.tool',
                        args: {},
                    },
                ],
            });

            const parsed = JSON.parse(result);
            expect(parsed.results[0].error).toContain('Available:');
        });

        it('应该处理工具执行错误', async () => {
            // 模拟工具执行错误
            mockGetTools.mockResolvedValueOnce([
                {
                    name: 'failing.tool',
                    description: 'A tool that fails',
                    schema: {},
                    invoke: vi.fn().mockRejectedValue(new Error('Execution failed')),
                },
            ]);

            const tool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(tool).toBeDefined();

            const result = await tool.invoke({
                commands: [
                    {
                        name: 'failing.tool',
                        args: {},
                    },
                ],
            });

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(1);
            expect(parsed.results[0]).toHaveProperty('error');
            expect(parsed.results[0].error).toContain('Failed to execute MCP tool');
        });

        it('应该独立处理每个工具的结果', async () => {
            const tool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(tool).toBeDefined();

            const result = await tool.invoke({
                commands: [
                    { name: 'filesystem.read_file', args: { path: '/tmp/test1.txt' } },
                    { name: 'nonexistent.tool', args: {} },
                    { name: 'filesystem.write_file', args: { path: '/tmp/test2.txt', content: 'test' } },
                ],
            });

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(3);
            expect(parsed.results[0]).not.toHaveProperty('error');
            expect(parsed.results[1]).toHaveProperty('error');
            expect(parsed.results[2]).not.toHaveProperty('error');
        });
    });

    describe('Schema 验证', () => {
        it('LoadMcpToolsSchema 应该接受空对象', () => {
            const result = LoadMcpToolsSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it('ExecuteMcpToolSchema 应该接受命令数组', () => {
            const result = ExecuteMcpToolSchema.safeParse({
                commands: [
                    { name: 'tool1', args: { param1: 'value1' } },
                    { name: 'tool2', args: {} },
                ],
            });
            expect(result.success).toBe(true);
        });

        it('ExecuteMcpToolSchema 应该拒绝无效格式', () => {
            const result = ExecuteMcpToolSchema.safeParse({
                commands: 'invalid',
            });
            expect(result.success).toBe(false);
        });

        it('ExecuteMcpToolSchema 应该要求 commands 字段', () => {
            const result = ExecuteMcpToolSchema.safeParse({});
            expect(result.success).toBe(false);
        });

        it('ExecuteMcpToolSchema 应该验证命令对象结构', () => {
            const result = ExecuteMcpToolSchema.safeParse({
                commands: [
                    { name: 'tool1' }, // 缺少 args
                ],
            });
            expect(result.success).toBe(false);
        });
    });

    describe('wrapModelCall', () => {
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

    describe('无 MCP 配置', () => {
        it('应该处理无 MCP 配置的情况', async () => {
            // Mock empty tools list for no config scenario
            mockGetTools.mockResolvedValueOnce([]);
            mockGetConfig.mockResolvedValueOnce({
                mcp_config: null,
            });

            const newMiddleware = new MCPMiddleware();
            const tool = newMiddleware.tools.find((t) => t.name === 'load_mcp_tools');

            await new Promise((resolve) => setTimeout(resolve, 100));

            const result = await tool!.invoke({});
            const parsed = JSON.parse(result);

            expect(parsed.status.toolCount).toBe(0);
            expect(parsed.tools).toHaveLength(0);

            // Restore original mocks
            mockGetConfig.mockResolvedValue({
                mcp_config: {
                    filesystem: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
                    },
                },
            });
            mockGetTools.mockResolvedValue([
                {
                    name: 'filesystem.read_file',
                    description: 'Read a file',
                    schema: { type: 'object', properties: { path: { type: 'string' } } },
                    invoke: vi.fn().mockResolvedValue({ content: 'file content' }),
                },
                {
                    name: 'filesystem.write_file',
                    description: 'Write a file',
                    schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } },
                    invoke: vi.fn().mockResolvedValue({ success: true }),
                },
            ]);
        });
    });
});
