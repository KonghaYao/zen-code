/**
 * Memories Middleware 测试
 * 测试记忆加载、系统提示注入
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoriesMiddleware } from '../../middlewares/memories';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

// Mock the memories loader
vi.mock('../../memories/load', () => ({
  listMemories: vi.fn(() => [
    {
      name: 'test-memory',
      description: 'A test memory',
      path: '/test/path/MEMORY.md',
      source: 'user',
      category: 'architecture', // Use valid category from categoryOrder
      tags: ['test'],
      priority: 'high',
    },
    {
      name: 'project-memory',
      description: 'A project memory',
      path: '/project/path/MEMORY.md',
      source: 'project',
      category: 'configuration', // Use valid category from categoryOrder
      tags: ['setup'],
      priority: 'medium',
    },
  ]),
}));

describe('MemoriesMiddleware', () => {
  let middleware: MemoriesMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with minimal options', () => {
      middleware = new MemoriesMiddleware();
      expect(middleware.name).toBe('MemoriesMiddleware');
      expect(middleware.tools).toEqual([]);
    });

    it('should create instance with user memories directory', () => {
      middleware = new MemoriesMiddleware({
        memoriesDir: '/test/memories',
        assistantId: 'test-agent',
      });
      expect(middleware.name).toBe('MemoriesMiddleware');
    });

    it('should create instance with both user and project memories', () => {
      middleware = new MemoriesMiddleware({
        memoriesDir: '/user/memories',
        assistantId: 'test-agent',
        projectMemoriesDir: './.claude/memories',
      });
      expect(middleware.name).toBe('MemoriesMiddleware');
    });

    it('should warn when memoriesDir provided without assistantId', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      middleware = new MemoriesMiddleware({
        memoriesDir: '/test/memories',
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'user memories directory is provided, but assistant id is not provided'
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('formatMemoriesLocations', () => {
    it('should format user memories location', () => {
      middleware = new MemoriesMiddleware({
        memoriesDir: '/user/memories',
        assistantId: 'test-agent',
      });
      const locations = (middleware as any).formatMemoriesLocations();
      expect(locations).toContain('User Memories');
      expect(locations).toContain('~/.claude/test-agent/memories');
    });

    it('should format project memories location', () => {
      middleware = new MemoriesMiddleware({
        projectMemoriesDir: './.claude/memories',
      });
      const locations = (middleware as any).formatMemoriesLocations();
      expect(locations).toContain('Project Memories');
      expect(locations).toContain('./.claude/memories');
    });

    it('should use default project memories location when not provided', () => {
      middleware = new MemoriesMiddleware();
      const locations = (middleware as any).formatMemoriesLocations();
      // Default project memories dir is './.claude/memories'
      expect(locations).toContain('Project Memories');
      expect(locations).toContain('./.claude/memories');
    });
  });

  describe('formatMemoriesList', () => {
    it('should format user memories', () => {
      middleware = new MemoriesMiddleware({
        memoriesDir: '/user/memories',
        assistantId: 'test-agent',
      });

      const memories = [
        {
          name: 'bug-fix',
          description: 'Common bug fixes',
          path: '/user/memories/bug-fix/MEMORY.md',
          source: 'user' as const,
          category: 'bug-fix', // Use valid category from categoryOrder
          tags: ['bug', 'fix'],
        },
      ];

      const list = (middleware as any).formatMemoriesList(memories);
      expect(list).toContain('bug-fix');
      expect(list).toContain('Common bug fixes');
      expect(list).toContain('/user/memories/bug-fix/MEMORY.md');
    });

    it('should format project memories', () => {
      middleware = new MemoriesMiddleware({
        projectMemoriesDir: './.claude/memories',
      });

      const memories = [
        {
          name: 'project-setup',
          description: 'Project setup instructions',
          path: './.claude/memories/project-setup/MEMORY.md',
          source: 'project' as const,
          category: 'configuration', // Use valid category from categoryOrder
          tags: ['init'],
        },
      ];

      const list = (middleware as any).formatMemoriesList(memories);
      expect(list).toContain('project-setup');
      expect(list).toContain('Project setup instructions');
      expect(list).toContain('./.claude/memories/project-setup/MEMORY.md');
    });

    it('should show message when no memories available', () => {
      middleware = new MemoriesMiddleware({
        memoriesDir: '/user/memories',
        assistantId: 'test-agent',
        projectMemoriesDir: './.claude/memories',
      });

      const list = (middleware as any).formatMemoriesList([]);
      expect(list).toContain('No memories available yet');
    });
  });

  describe('wrapModelCall', () => {
    it('should inject memories section into system prompt', async () => {
      middleware = new MemoriesMiddleware({
        memoriesDir: '/user/memories',
        assistantId: 'test-agent',
        projectMemoriesDir: './.claude/memories',
      });

      const mockHandler = vi.fn().mockResolvedValue(new AIMessage('Response'));
      const request = {
        systemPrompt: 'Original system prompt',
      };

      await middleware.wrapModelCall(request, mockHandler);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          systemMessage: expect.any(SystemMessage),
        })
      );

      const callArgs = mockHandler.mock.calls[0][0];
      const systemContent = callArgs.systemMessage.content;
      expect(typeof systemContent).toBe('string');
      expect(systemContent).toContain('Memory System');
      expect(systemContent).toContain('test-memory');
      expect(systemContent).toContain('project-memory');
    });

    it('should preserve original system prompt', async () => {
      middleware = new MemoriesMiddleware();

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
      expect(systemContent).toContain('Memory System');
    });
  });

  describe('middleware interface', () => {
    it('should have required middleware properties', () => {
      middleware = new MemoriesMiddleware();
      expect(middleware.name).toBeDefined();
      expect(middleware.tools).toBeDefined();
      expect(Array.isArray(middleware.tools)).toBe(true);
      expect(middleware.stateSchema).toBeUndefined();
      expect(middleware.contextSchema).toBeUndefined();
    });
  });
});
