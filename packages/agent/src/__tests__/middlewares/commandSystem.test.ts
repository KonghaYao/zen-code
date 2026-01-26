/**
 * Command System Middleware 测试
 * 测试命令注册、批量执行
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandSystemMiddleware, BatchCommandSchema } from '../../middlewares/commandSystem';
import { StructuredTool } from '@langchain/core/tools';

describe('CommandSystemMiddleware', () => {
  let middleware: CommandSystemMiddleware;
  let mockTool1: StructuredTool;
  let mockTool2: StructuredTool;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock tools
    mockTool1 = {
      name: 'test_tool_1',
      description: 'Test tool 1',
      invoke: vi.fn().mockResolvedValue('Result from tool 1'),
    } as unknown as StructuredTool;

    mockTool2 = {
      name: 'test_tool_2',
      description: 'Test tool 2',
      invoke: vi.fn().mockResolvedValue('Result from tool 2'),
    } as unknown as StructuredTool;

    middleware = new CommandSystemMiddleware();
  });

  describe('constructor', () => {
    it('should create instance with required properties', () => {
      expect(middleware.name).toBe('CommandSystemMiddleware');
      expect(middleware.tools).toBeDefined();
      expect(Array.isArray(middleware.tools)).toBe(true);
      expect(middleware.tools.length).toBe(2); // batch_command and list_available_commands
    });

    it('should have batch_command tool', () => {
      const batchTool = middleware.tools.find((t) => t.name === 'batch_command');
      expect(batchTool).toBeDefined();
    });

    it('should have list_available_commands tool', () => {
      const listTool = middleware.tools.find((t) => t.name === 'list_available_commands');
      expect(listTool).toBeDefined();
    });
  });

  describe('registerTools', () => {
    it('should register a tool', () => {
      middleware.registerTools([mockTool1]);
      const registered = middleware.getRegisteredTools();
      expect(registered.find(t => t.name === 'test_tool_1')).toBe(mockTool1);
    });

    it('should register multiple tools', () => {
      middleware.registerTools([mockTool1, mockTool2]);
      const registered = middleware.getRegisteredTools();

      expect(registered.find(t => t.name === 'test_tool_1')).toBe(mockTool1);
      expect(registered.find(t => t.name === 'test_tool_2')).toBe(mockTool2);
    });

    it('should overwrite existing tool with same name', () => {
      const mockTool1v2 = {
        name: 'test_tool_1',
        description: 'Updated tool 1',
        invoke: vi.fn().mockResolvedValue('Updated result'),
      } as unknown as StructuredTool;

      middleware.registerTools([mockTool1]);
      middleware.registerTools([mockTool1v2]);

      const registered = middleware.getRegisteredTools();
      const tool1 = registered.find(t => t.name === 'test_tool_1');
      expect(tool1).toBe(mockTool1v2);
    });
  });

  describe('batch_command execution', () => {
    beforeEach(() => {
      middleware.registerTools([mockTool1, mockTool2]);
    });

    it('should execute single command', async () => {
      const batchTool = middleware.tools.find((t) => t.name === 'batch_command') as StructuredTool;
      const input = {
        commands: [
          {
            name: 'test_tool_1',
            args: { param: 'value' },
          },
        ],
      };

      const result = await batchTool.invoke(input);

      expect(mockTool1.invoke).toHaveBeenCalledWith({ param: 'value' });
      expect(result).toContain('[test_tool_1]');
    });

    it('should execute multiple commands in batch', async () => {
      const batchTool = middleware.tools.find((t) => t.name === 'batch_command') as StructuredTool;
      const input = {
        commands: [
          {
            name: 'test_tool_1',
            args: { param: 'value1' },
          },
          {
            name: 'test_tool_2',
            args: { param: 'value2' },
          },
        ],
      };

      const result = await batchTool.invoke(input);

      expect(mockTool1.invoke).toHaveBeenCalledWith({ param: 'value1' });
      expect(mockTool2.invoke).toHaveBeenCalledWith({ param: 'value2' });
      expect(result).toContain('[test_tool_1]');
      expect(result).toContain('[test_tool_2]');
    });

    it('should handle unknown command gracefully', async () => {
      const batchTool = middleware.tools.find((t) => t.name === 'batch_command') as StructuredTool;
      const input = {
        commands: [
          {
            name: 'unknown_tool',
            args: {},
          },
        ],
      };

      const result = await batchTool.invoke(input);

      expect(result).toContain('[unknown_tool]');
      expect(result).toContain('错误');
      expect(result).toContain('Unknown Command');
    });

    it('should handle mixed success and error commands', async () => {
      const mockErrorTool = {
        name: 'error_tool',
        description: 'Error tool',
        invoke: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
      } as unknown as StructuredTool;

      middleware.registerTools([mockErrorTool]);

      const batchTool = middleware.tools.find((t) => t.name === 'batch_command') as StructuredTool;
      const input = {
        commands: [
          {
            name: 'test_tool_1',
            args: {},
          },
          {
            name: 'error_tool',
            args: {},
          },
        ],
      };

      const result = await batchTool.invoke(input);

      expect(result).toContain('[test_tool_1]');
      expect(result).toContain('[error_tool]');
      expect(result).toContain('错误');
    });

    it('should handle empty commands array', async () => {
      const batchTool = middleware.tools.find((t) => t.name === 'batch_command') as StructuredTool;
      const input = {
        commands: [],
      };

      const result = await batchTool.invoke(input);

      expect(result).toBe('');
    });
  });

  describe('list_available_commands execution', () => {
    beforeEach(() => {
      middleware.registerTools([mockTool1, mockTool2]);
    });

    it('should list all registered commands', async () => {
      const listTool = middleware.tools.find((t) => t.name === 'list_available_commands') as StructuredTool;

      const result = await listTool.invoke({});

      expect(result).toContain('test_tool_1');
      expect(result).toContain('test_tool_2');
    });

    it('should include tool descriptions', async () => {
      const listTool = middleware.tools.find((t) => t.name === 'list_available_commands') as StructuredTool;

      const result = await listTool.invoke({});

      expect(result).toContain('Test tool 1');
      expect(result).toContain('Test tool 2');
    });
  });

  describe('BatchCommandSchema', () => {
    it('should validate valid batch command', () => {
      const validInput = {
        commands: [
          {
            name: 'test_tool',
            args: { key: 'value' },
          },
        ],
      };

      const result = BatchCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate multiple commands', () => {
      const validInput = {
        commands: [
          { name: 'tool1', args: {} },
          { name: 'tool2', args: { param: 'value' } },
        ],
      };

      const result = BatchCommandSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject missing commands field', () => {
      const invalidInput = {};

      const result = BatchCommandSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject non-array commands', () => {
      const invalidInput = {
        commands: 'not an array',
      };

      const result = BatchCommandSchema.safeParse(invalidInput);
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

      const result = BatchCommandSchema.safeParse(invalidInput);
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

      const result = BatchCommandSchema.safeParse(invalidInput);
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
