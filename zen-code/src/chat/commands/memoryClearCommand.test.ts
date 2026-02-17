/**
 * Test for memoryCommand
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { commandRegistry } from './registry';
import { memoryClearCommand } from './memoryClearCommand';

describe('memoryCommand', () => {
    beforeEach(() => {
        // 在每个测试前注册命令
        commandRegistry.register(memoryClearCommand);
    });

    it('should register correctly', () => {
        const command = commandRegistry.getCommand('memory-clear');
        expect(command).toBeDefined();
        expect(command?.name).toBe('memory-clear');
    });

    it('should have correct aliases', () => {
        const command1 = commandRegistry.getCommand('mem-clean');
        expect(command1).toBeDefined();
        expect(command1?.name).toBe('memory-clear');

        const command2 = commandRegistry.getCommand('clean-memory');
        expect(command2).toBeDefined();
        expect(command2?.name).toBe('memory-clear');
    });

    it('should return success message', async () => {
        const context = {
            sendMessage: async () => {},
            extraParams: {},
        };

        const result = await memoryClearCommand.execute([], context);
        expect(result.success).toBe(true);
        expect(result.message).toContain('记忆整理模式');
        expect(result.shouldClearInput).toBe(true);
    });

    it('should include user request in message', async () => {
        const context = {
            sendMessage: async (messages) => {
                expect(messages[0].content).toContain('Additional context');
                expect(messages[0].content).toContain('test request');
            },
            extraParams: {},
        };

        await memoryClearCommand.execute(['test', 'request'], context);
    });
});
