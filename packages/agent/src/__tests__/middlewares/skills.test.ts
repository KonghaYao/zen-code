/**
 * Skills Middleware 测试
 * 测试技能加载、YAML 解析、系统提示注入
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillsMiddleware } from '@langgraph-js/standard-agent';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

describe('SkillsMiddleware', () => {
    let middleware: SkillsMiddleware;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with minimal options', () => {
            middleware = new SkillsMiddleware();
            expect(middleware.name).toBe('SkillsMiddleware');
            expect(middleware.tools).toEqual([]);
        });

        it('should create instance with user skills directory', () => {
            middleware = new SkillsMiddleware({
                skillsDir: '/test/skills',
                assistantId: 'test-agent',
            });
            expect(middleware.name).toBe('SkillsMiddleware');
        });

        it('should create instance with both user and project skills', () => {
            middleware = new SkillsMiddleware({
                skillsDir: '/user/skills',
                assistantId: 'test-agent',
                projectSkillsDir: './.claude/skills',
            });
            expect(middleware.name).toBe('SkillsMiddleware');
        });
    });

    describe('formatSkillsLocations', () => {
        it('should format user skills location', () => {
            middleware = new SkillsMiddleware({
                skillsDir: '/user/skills',
                assistantId: 'test-agent',
            });
            const locations = (middleware as any).formatSkillsLocations();
            expect(locations).toContain('User Skills');
            // SkillsMiddleware 使用传入的 skillsDir 值作为显示路径
            expect(locations).toContain('/user/skills');
        });

        it('should format project skills location', () => {
            middleware = new SkillsMiddleware({
                projectSkillsDir: './.claude/skills',
            });
            const locations = (middleware as any).formatSkillsLocations();
            expect(locations).toContain('Project Skills');
            expect(locations).toContain('./.claude/skills');
        });

        it('should format both locations when both provided', () => {
            middleware = new SkillsMiddleware({
                skillsDir: '/user/skills',
                assistantId: 'test-agent',
                projectSkillsDir: './.claude/skills',
            });
            const locations = (middleware as any).formatSkillsLocations();
            expect(locations).toContain('User Skills');
            expect(locations).toContain('Project Skills');
        });

        it('should use default project skills location when not provided', () => {
            middleware = new SkillsMiddleware();
            const locations = (middleware as any).formatSkillsLocations();
            // Default project skills dir is './.claude/skills'
            expect(locations).toContain('Project Skills');
            expect(locations).toContain('./.claude/skills');
        });
    });

    describe('formatSkillsList', () => {
        it('should format user skills', () => {
            middleware = new SkillsMiddleware({
                skillsDir: '/user/skills',
                assistantId: 'test-agent',
            });

            const skills = [
                {
                    name: 'web-research',
                    description: 'Research on the web',
                    path: '/user/skills/web-research/SKILL.md',
                    source: 'user' as const,
                },
            ];

            const list = (middleware as any).formatSkillsList(skills);
            expect(list).toContain('**User Skills:**');
            expect(list).toContain('web-research');
            expect(list).toContain('Research on the web');
            expect(list).toContain('/user/skills/web-research/SKILL.md');
        });

        it('should format project skills', () => {
            middleware = new SkillsMiddleware({
                projectSkillsDir: './.claude/skills',
            });

            const skills = [
                {
                    name: 'project-specific',
                    description: 'Project specific skill',
                    path: './.claude/skills/project-specific/SKILL.md',
                    source: 'project' as const,
                },
            ];

            const list = (middleware as any).formatSkillsList(skills);
            expect(list).toContain('**Project Skills:**');
            expect(list).toContain('project-specific');
            expect(list).toContain('Project specific skill');
            expect(list).toContain('./.claude/skills/project-specific/SKILL.md');
        });

        it('should show message when no skills available', () => {
            middleware = new SkillsMiddleware({
                skillsDir: '/user/skills',
                assistantId: 'test-agent',
                projectSkillsDir: './.claude/skills',
            });

            const list = (middleware as any).formatSkillsList([]);
            expect(list).toContain('No skills available yet');
            // 应包含传入的 skillsDir 路径
            expect(list).toContain('/user/skills/');
            expect(list).toContain('./.claude/skills');
        });
    });

    describe('wrapModelCall', () => {
        it('should inject skills section into system prompt', async () => {
            // 使用不存在的路径，避免加载真实技能
            middleware = new SkillsMiddleware({
                skillsDir: '/non-existent-user-skills',
                assistantId: 'test-agent',
                projectSkillsDir: '/non-existent-project-skills',
            });

            const mockHandler = vi.fn().mockResolvedValue(new AIMessage('Response'));
            const request = {
                systemPrompt: 'Original system prompt',
            };

            await middleware.wrapModelCall(request, mockHandler);

            expect(mockHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemMessage: expect.any(SystemMessage),
                }),
            );

            const callArgs = mockHandler.mock.calls[0][0];
            const systemContent = callArgs.systemMessage.content;
            expect(typeof systemContent).toBe('string');
            expect(systemContent).toContain('Skills System');
            expect(systemContent).toContain('Original system prompt');
        });

        it('should create system prompt if none exists', async () => {
            middleware = new SkillsMiddleware();

            const mockHandler = vi.fn().mockResolvedValue(new AIMessage('Response'));
            const request = {};

            await middleware.wrapModelCall(request, mockHandler);

            expect(mockHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemMessage: expect.any(SystemMessage),
                }),
            );

            const callArgs = mockHandler.mock.calls[0][0];
            expect(callArgs.systemMessage).toBeInstanceOf(SystemMessage);
        });

        it('should preserve original system prompt', async () => {
            middleware = new SkillsMiddleware();

            const mockHandler = vi.fn().mockResolvedValue(new AIMessage('Response'));
            const originalPrompt = 'You are a helpful assistant.';
            const request = {
                systemPrompt: originalPrompt,
            };

            await middleware.wrapModelCall(request, mockHandler);

            const callArgs = mockHandler.mock.calls[0][0];
            const systemContent = callArgs.systemMessage.content;
            expect(typeof systemContent).toBe('string');
            expect(systemContent).toContain(originalPrompt);
            expect(systemContent).toContain('Skills System');
        });

        it('should pass through other request properties', async () => {
            middleware = new SkillsMiddleware();

            const mockHandler = vi.fn().mockResolvedValue(new AIMessage('Response'));
            const request = {
                systemPrompt: 'System prompt',
                messages: [new AIMessage('Hello')],
                otherProp: 'value',
            };

            await middleware.wrapModelCall(request, mockHandler);

            expect(mockHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: request.messages,
                    otherProp: 'value',
                }),
            );
        });
    });

    describe('middleware interface', () => {
        it('should have required middleware properties', () => {
            middleware = new SkillsMiddleware();
            expect(middleware.name).toBeDefined();
            expect(middleware.tools).toBeDefined();
            expect(Array.isArray(middleware.tools)).toBe(true);
            expect(middleware.stateSchema).toBeUndefined();
            expect(middleware.contextSchema).toBeUndefined();
        });
    });
});
