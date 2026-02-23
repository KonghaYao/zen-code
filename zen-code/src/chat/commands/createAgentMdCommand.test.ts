/**
 * create-agent-md 命令测试
 * 测试 AGENTS.md 创建命令的功能
 */

import { describe, it, expect, vi } from 'vitest';
import { createAgentMdCommand, initAgentMdCommand, createAgentMdCommands } from './createAgentMdCommand';

describe('createAgentMdCommand', () => {
    it('should have correct command metadata', () => {
        expect(createAgentMdCommand.name).toBe('create-agent-md');
        expect(createAgentMdCommand.description).toBe('Create or update AGENTS.md file with project guidelines');
        expect(createAgentMdCommand.aliases).toEqual(['agentmd', 'am']);
        expect(createAgentMdCommand.usage).toBe('/create-agent-md [description or goal for AGENTS.md]');
        expect(createAgentMdCommand.requiresArgs).toBe(true);
    });

    it('should send enhanced message with correct prefix', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await createAgentMdCommand.execute(['create', 'project', 'overview'], context as any);

        expect(sendMessage).toHaveBeenCalled();
        const calls = sendMessage.mock.calls;
        expect(calls.length).toBe(1);

        const messages = calls[0][0];
        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('human');
        expect(messages[0].content).toContain('[Create AGENTS.md Mode Activated]');
        expect(messages[0].content).toContain('create project overview');
        expect(messages[0].content).toContain('AGENTS.md');
    });

    it('should return success result with message', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await createAgentMdCommand.execute(['test'], context as any);

        expect(result.success).toBe(true);
        expect(result.message).toBe('📝 AGENTS.md creation mode activated');
        expect(result.shouldClearInput).toBe(true);
    });

    it('should return error when no arguments provided', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await createAgentMdCommand.execute([], context as any);

        expect(result.success).toBe(false);
        expect(result.message).toContain('❌');
        expect(result.message).toContain('需要提供描述或目标');
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should trim whitespace from arguments', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        await createAgentMdCommand.execute(['  create   AGENTS.md  '], context as any);

        const calls = sendMessage.mock.calls;
        const messages = calls[0][0];
        expect(messages[0].content).toContain('create   AGENTS.md');
    });

    it('should include all required sections in prefix', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        await createAgentMdCommand.execute(['test'], context as any);

        const calls = sendMessage.mock.calls;
        const content = calls[0][0][0].content;

        expect(content).toContain('**Your Role:**');
        expect(content).toContain('**Process:**');
        expect(content).toContain('**AGENTS.md Format:**');
        expect(content).toContain('**File Location:**');
        expect(content).toContain('Project overview and objectives');
        expect(content).toContain('Architecture and design patterns');
        expect(content).toContain('Coding standards and conventions');
    });
});

describe('initAgentMdCommand', () => {
    it('should have correct command metadata', () => {
        expect(initAgentMdCommand.name).toBe('init-agents-md');
        expect(initAgentMdCommand.description).toBe('快速初始化 AGENTS.md 项目指南文档');
        expect(initAgentMdCommand.aliases).toEqual(['iam', 'init-agents']);
        expect(initAgentMdCommand.usage).toBe('/init-agents-md');
        expect(initAgentMdCommand.requiresArgs).toBe(false);
    });

    it('should send message with default request', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await initAgentMdCommand.execute([], context as any);

        expect(sendMessage).toHaveBeenCalled();
        const calls = sendMessage.mock.calls;
        expect(calls.length).toBe(1);

        const messages = calls[0][0];
        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('human');
        expect(messages[0].content).toContain('[Create AGENTS.md Mode Activated]');
        expect(messages[0].content).toContain('初始化项目 AGENTS.md 指南文档');
    });

    it('should return success result', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await initAgentMdCommand.execute([], context as any);

        expect(result.success).toBe(true);
        expect(result.message).toBe('📝 开始初始化 AGENTS.md...');
        expect(result.shouldClearInput).toBe(true);
    });

    it('should not require arguments', async () => {
        const sendMessage = vi.fn();
        const context = {
            sendMessage,
            extraParams: {},
        };

        const result = await initAgentMdCommand.execute([], context as any);

        expect(result.success).toBe(true);
        expect(sendMessage).toHaveBeenCalled();
    });
});

describe('createAgentMdCommands', () => {
    it('should export both commands', () => {
        expect(createAgentMdCommands).toHaveLength(2);
        expect(createAgentMdCommands[0]).toBe(createAgentMdCommand);
        expect(createAgentMdCommands[1]).toBe(initAgentMdCommand);
    });
});
