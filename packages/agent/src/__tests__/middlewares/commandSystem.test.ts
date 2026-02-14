/**
 * Command System Middleware 测试
 * 测试 MCP 工具的加载和执行
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandSystemMiddleware, LoadMcpToolsSchema, ExecuteMcpToolSchema } from '../../middlewares/commandSystem';
import { MCPManager } from '../../mcp/MCPManager';

// Mock MCPManager
const mockMCPManager = {
    getStatus: vi.fn().mockResolvedValue({
        isInitialized: true,
        toolCount: 3,
        servers: ['filesystem', 'search'],
    }),
    getAllTools: vi.fn().mockResolvedValue([
        {
            name: 'filesystem.read_file',
            description: 'Read a file',
            schema: { type: 'object', properties: { path: { type: 'string' } } },
        },
        {
            name: 'search.web',
            description: 'Searches web',
            schema: { type: 'object', properties: { query: { type: 'string' } } },
        },
    ]),
    executeTool: vi.fn().mockImplementation(async (name, args) => {
        if (name === 'filesystem.read_file') {
            return { content: 'file content' };
        }
        if (name === 'search.web') {
            return { results: ['result1', 'result2'] };
        }
        throw new Error(`Tool not found: ${name}`);
    }),
};

vi.mock('../../mcp/MCPManager', () => ({
    MCPManager: {
        getInstance: vi.fn().mockReturnValue(mockMCPManager),
    },
}));

describe('CommandSystemMiddleware', () => {
    let middleware: CommandSystemMiddleware;

    beforeEach(() => {
        vi.clearAllMocks();

        middleware = new CommandSystemMiddleware();
    });

    describe('constructor', () => {
        it('should create instance with required properties', () => {
            expect(middleware.name).toBe('CommandSystemMiddleware');
            expect(middleware.tools).toBeDefined();
            expect(Array.isArray(middleware.tools)).toBe(true);
            expect(middleware.tools.length).toBe(2); // load_mcp_tools and execute_mcp_tool
        });

        it('should have load_mcp_tools tool', () => {
            const loadTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');
            expect(loadTool).toBeDefined();
        });

        it('should have execute_mcp_tool tool', () => {
            const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            expect(executeTool).toBeDefined();
        });
    });

    describe('load_mcp_tools execution', () => {
        it('should load and return MCP tools', async () => {
            const loadTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');

            const result = await loadTool!.invoke({});

            expect(mockMCPManager.getStatus).toHaveBeenCalled();
            expect(mockMCPManager.getAllTools).toHaveBeenCalled();

            const parsed = JSON.parse(result);
            expect(parsed.tools).toBeDefined();
            expect(parsed.tools).toHaveLength(2);
            expect(parsed.tools[0].name).toBe('filesystem.read_file');
            expect(parsed.status).toBeDefined();
            expect(parsed.status.toolCount).toBe(3);
        });

        it('should include tool schemas', async () => {
            const loadTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');

            const result = await loadTool!.invoke({});
            const parsed = JSON.parse(result);

            expect(parsed.tools[0].schema).toBeDefined();
            expect(parsed.tools[0].schema.type).toBe('object');
        });

        it('should include status information', async () => {
            const loadTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');

            const result = await loadTool!.invoke({});
            const parsed = JSON.parse(result);

            expect(parsed.status).toBeDefined();
            expect(parsed.status.isInitialized).toBe(true);
            expect(parsed.status.servers).toContain('filesystem');
        });

        it('should handle empty MCP configuration', async () => {
            mockMCPManager.getAllTools.mockResolvedValueOnce([]);

            const loadTool = middleware.tools.find((t) => t.name === 'load_mcp_tools');

            const result = await loadTool!.invoke({});
            const parsed = JSON.parse(result);

            expect(parsed.tools).toHaveLength(0);
        });
    });

    describe('execute_mcp_tool execution', () => {
        it('should execute single MCP tool', async () => {
            const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            const input = {
                commands: [
                    {
                        name: 'filesystem.read_file',
                        args: { path: '/path/to/file' },
                    },
                ],
            };

            const result = await executeTool!.invoke(input);

            expect(mockMCPManager.executeTool).toHaveBeenCalledWith('filesystem.read_file', {
                path: '/path/to/file',
            });

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(1);
            expect(parsed.results[0].tool).toBe('filesystem.read_file');
            expect(parsed.results[0].result).toEqual({ content: 'file content' });
            expect(parsed.results[0].error).toBeUndefined();
        });

        it('should execute multiple MCP tools', async () => {
            const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            const input = {
                commands: [
                    {
                        name: 'filesystem.read_file',
                        args: { path: '/path/to/file' },
                    },
                    {
                        name: 'search.web',
                        args: { query: 'test' },
                    },
                ],
            };

            const result = await executeTool!.invoke(input);

            expect(mockMCPManager.executeTool).toHaveBeenCalledTimes(2);
            expect(mockMCPManager.executeTool).toHaveBeenNthCalledWith(1, 'filesystem.read_file', {
                path: '/path/to/file',
            });
            expect(mockMCPManager.executeTool).toHaveBeenNthCalledWith(2, 'search.web', {
                query: 'test',
            });

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(2);
        });

        it('should handle tool not found error', async () => {
            mockMCPManager.executeTool.mockImplementationOnce(async (name) => {
                throw new Error(`Tool not found: ${name}`);
            });

            const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            const input = {
                commands: [
                    {
                        name: 'unknown_tool',
                        args: {},
                    },
                ],
            };

            const result = await executeTool!.invoke(input);
            const parsed = JSON.parse(result);

            expect(parsed.results[0].tool).toBe('unknown_tool');
            expect(parsed.results[0].result).toBeNull();
            expect(parsed.results[0].error).toContain('Tool not found');
        });

        it('should handle tool execution error', async () => {
            mockMCPManager.executeTool.mockImplementationOnce(async () => {
                throw new Error('Execution failed');
            });

            const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            const input = {
                commands: [
                    {
                        name: 'filesystem.read_file',
                        args: {},
                    },
                ],
            };

            const result = await executeTool!.invoke(input);
            const parsed = JSON.parse(result);

            expect(parsed.results[0].error).toContain('Execution failed');
        });

        it('should handle mixed success and error commands', async () => {
            let callCount = 0;
            mockMCPManager.executeTool.mockImplementation(async (name) => {
                callCount++;
                if (callCount === 1) {
                    return { success: true };
                }
                throw new Error('Second tool failed');
            });

            const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            const input = {
                commands: [
                    {
                        name: 'filesystem.read_file',
                        args: {},
                    },
                    {
                        name: 'search.web',
                        args: {},
                    },
                ],
            };

            const result = await executeTool!.invoke(input);
            const parsed = JSON.parse(result);

            expect(parsed.results[0].error).toBeUndefined();
            expect(parsed.results[1].error).toContain('Second tool failed');
        });

        it('should handle empty commands array', async () => {
            const executeTool = middleware.tools.find((t) => t.name === 'execute_mcp_tool');
            const input = {
                commands: [],
            };

            const result = await executeTool!.invoke(input);

            expect(mockMCPManager.executeTool).not.toHaveBeenCalled();

            const parsed = JSON.parse(result);
            expect(parsed.results).toHaveLength(0);
        });
    });

    describe('LoadMcpToolsSchema', () => {
        it('should validate empty object', () => {
            const validInput = {};

            const result = LoadMcpToolsSchema.safeParse(validInput);
            expect(result.success).toBe(true);
        });
    });

    describe('ExecuteMcpToolSchema', () => {
        it('should validate valid execute command', () => {
            const validInput = {
                commands: [
                    {
                        name: 'test_tool',
                        args: { key: 'value' },
                    },
                ],
            };

            const result = ExecuteMcpToolSchema.safeParse(validInput);
            expect(result.success).toBe(true);
        });

        it('should validate multiple commands', () => {
            const validInput = {
                commands: [
                    { name: 'tool1', args: {} },
                    { name: 'tool2', args: { param: 'value' } },
                ],
            };

            const result = ExecuteMcpToolSchema.safeParse(validInput);
            expect(result.success).toBe(true);
        });

        it('should reject missing commands field', () => {
            const invalidInput = {};

            const result = ExecuteMcpToolSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });

        it('should reject non-array commands', () => {
            const invalidInput = {
                commands: 'not an array',
            };

            const result = ExecuteMcpToolSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });

        it('should reject command without name', () => {
            const invalidInput = {
                commands: [
                    {
                        args: {},
                    },
                ],
            };

            const result = ExecuteMcpToolSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });

        it('should reject command without args', () => {
            const invalidInput = {
                commands: [
                    {
                        name: 'tool',
                    },
                ],
            };

            const result = ExecuteMcpToolSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });
    });

    describe('middleware interface', () => {
        it('should have required middleware properties', () => {
            expect(middleware.name).toBeDefined();
            expect(middleware.tools).toBeDefined();
            expect(Array.isArray(middleware.tools)).toBe(true);
            expect(middleware.stateSchema).toBeUndefined();
            expect(middleware.contextSchema).toBeUndefined();
        });
    });
});
