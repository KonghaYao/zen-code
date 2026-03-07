/**
 * plan 命令测试
 * 测试规划模式命令的功能
 */

import { describe, it, expect, vi } from 'vitest';
import { planCommand } from './planCommand';

describe('planCommand', () => {
    it('should have correct command metadata', () => {
        expect(planCommand.name).toBe('plan');
        expect(planCommand.description).toBe('Enter Plan mode to create detailed implementation plans');
        expect(planCommand.aliases).toEqual(['p']);
        expect(planCommand.usage).toBe('/plan [your task description]');
        expect(planCommand.requiresArgs).toBe(true);
    });

    it('should send enhanced message with correct prefix', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await planCommand.execute(['create', 'login', 'feature'], context as any);

        expect(sendMessage).toHaveBeenCalled();
        const calls = sendMessage.mock.calls;
        expect(calls.length).toBe(1);

        const messages = calls[0][0];
        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('human');
        expect(messages[0].content).toContain('[Plan Mode Activated]');
        expect(messages[0].content).toContain('create login feature');
    });

    it('should return success result with message', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await planCommand.execute(['test'], context as any);

        expect(result.success).toBe(true);
        expect(result.message).toBe('📋 Plan mode activated');
        expect(result.shouldClearInput).toBe(true);
    });

    it('should require arguments', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await planCommand.execute([], context as any);

        expect(result.success).toBe(false);
        expect(result.message).toContain('❌');
        expect(result.message).toContain('需要提供任务描述');
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should trim whitespace from arguments', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        await planCommand.execute(['  create   feature  '], context as any);

        const calls = sendMessage.mock.calls;
        const messages = calls[0][0];
        expect(messages[0].content).toContain('create   feature');
    });

    it('should include all required sections in prefix', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        await planCommand.execute(['test'], context as any);

        const calls = sendMessage.mock.calls;
        const content = calls[0][0][0].content;

        expect(content).toContain('**Your Role:**');
        expect(content).toContain('**Process:**');
        expect(content).toContain('**Plan Format Requirements:**');
        expect(content).toContain('Ask clarifying questions');
        expect(content).toContain('Gather context');
        expect(content).toContain('docs/plans/');
    });
});
