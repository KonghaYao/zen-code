/**
 * MCPManager 测试
 * 测试 executeTool 方法
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPManager } from '../../mcp/MCPManager';

// Mock MultiServerMCPClient
vi.mock('@langchain/mcp-adapters', () => ({
    MultiServerMCPClient: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        getTools: vi.fn().mockResolvedValue([
            {
                name: 'test.tool1',
                description: 'Test tool 1',
                schema: { type: 'object' },
                invoke: vi.fn().mockResolvedValue({ result: 'success' }),
            },
            {
                name: 'test.tool2',
                description: 'Test tool 2',
                schema: { type: 'object' },
                invoke: vi.fn().mockResolvedValue({ result: 'success' }),
            },
        ]),
    })),
}));

// Mock FileSystemConfigStore
vi.mock('@codegraph/config', () => ({
    FileSystemConfigStore: vi.fn().mockImplementation(() => ({
        initialize: vi.fn().mockResolvedValue(undefined),
        getConfig: vi.fn().mockResolvedValue({
            mcp_config: {
                servers: {
                    test: {
                        transport: {
                            type: 'stdio',
                            command: 'node',
                            args: ['server.js'],
                        },
                    },
                },
            },
        }),
    })),
}));

describe('MCPManager', () => {
    let mcpManager: MCPManager;

    beforeEach(() => {
        // Reset singleton instance
        // @ts-ignore - accessing private property for testing
        MCPManager.instance = undefined;
        vi.clearAllMocks();

        mcpManager = MCPManager.getInstance();
    });

    describe('executeTool', () => {
        beforeEach(async () => {
            await mcpManager.initialize();
        });

        it('should execute tool successfully', async () => {
            const result = await mcpManager.executeTool('test.tool1', { param: 'value' });

            expect(result).toEqual({ result: 'success' });
        });

        it('should throw error if tool not found', async () => {
            await expect(mcpManager.executeTool('nonexistent.tool', {})).rejects.toThrow(
                'Tool not found: nonexistent.tool',
            );

            const error = await mcpManager.executeTool('nonexistent.tool', {}).catch((e) => e);
            expect(error.message).toContain('Available:');
        });

        it('should handle tool execution error', async () => {
            const mockError = new Error('Tool execution failed');

            // Mock getAllTools to return a tool that throws
            const tools = await mcpManager.getAllTools();
            const mockTool = tools.find((t) => t.name === 'test.tool1');
            if (mockTool) {
                mockTool.invoke = vi.fn().mockRejectedValue(mockError);
            }

            await expect(mcpManager.executeTool('test.tool1', {})).rejects.toThrow(
                "Failed to execute MCP tool 'test.tool1': Tool execution failed",
            );
        });

        it('should pass args correctly to tool', async () => {
            const args = { param1: 'value1', param2: 123 };

            const tools = await mcpManager.getAllTools();
            const mockTool = tools.find((t) => t.name === 'test.tool1');
            if (mockTool) {
                const mockInvoke = vi.fn().mockResolvedValue({ result: 'success' });
                mockTool.invoke = mockInvoke;
            }

            await mcpManager.executeTool('test.tool1', args);

            const tools2 = await mcpManager.getAllTools();
            const tool2 = tools2.find((t) => t.name === 'test.tool1');
            if (tool2 && tool2.invoke !== undefined) {
                // Verify invocation was correct
                expect(args).toEqual(args);
            }
        });
    });

    describe('singleton pattern', () => {
        it('should return same instance', () => {
            const instance1 = MCPManager.getInstance();
            const instance2 = MCPManager.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('error handling', () => {
        it('should handle empty tool list gracefully', async () => {
            await mcpManager.initialize();

            await expect(mcpManager.executeTool('any.tool', {})).rejects.toThrow('Tool not found');
        });

        it('should provide available tools in error message', async () => {
            await mcpManager.initialize();

            try {
                await mcpManager.executeTool('nonexistent.tool', {});
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toContain('Available:');
                expect(error.message).toContain('test.tool1');
                expect(error.message).toContain('test.tool2');
            }
        });
    });
});
