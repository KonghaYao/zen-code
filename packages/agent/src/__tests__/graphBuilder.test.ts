/**
 * Graph Builder 测试
 * 测试 LangGraph 构建和编译
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCodeGraph, graph } from '../graphBuilder';

// Mock dependencies
vi.mock('../utils/initChatModel', () => ({
  initChatModel: vi.fn().mockResolvedValue({
    invoke: vi.fn().mockResolvedValue({
      content: 'Mocked response',
      usage: { total_tokens: 100 },
    }),
  }),
}));

vi.mock('../memories/analyze', () => ({
  analyzeAndSaveMemories: vi.fn().mockResolvedValue('Summary of conversation'),
}));

vi.mock('../subagents/config', () => ({
  loadAgentsList: vi.fn().mockResolvedValue({
    default: {
      id: 'default',
      name: 'Jarvis',
      description: 'Full-featured code assistant',
      tools: ['all'],
      middleware: {
        agents_md: true,
        skills: true,
        memories: true,
        mcp: true,
        subagents: true,
      },
    },
    planner: {
      id: 'planner',
      name: 'Planner',
      description: 'Task planning agent',
      tools: ['read_file', 'search-files-rg'],
      middleware: {
        agents_md: true,
        skills: true,
      },
    },
  }),
  getDefaultAgentId: vi.fn().mockReturnValue('default'),
}));

vi.mock('../subagents/factory', () => ({
  createStandardAgent: vi.fn().mockResolvedValue({
    invoke: vi.fn().mockResolvedValue({
      messages: [],
      task_store: {},
    }),
  }),
}));

describe('createCodeGraph', () => {
  it('should create a graph instance', () => {
    const g = createCodeGraph();
    expect(g).toBeDefined();
    expect(g).toHaveProperty('invoke');
  });

  it('should have compiled graph with invoke method', () => {
    const g = createCodeGraph();
    expect(typeof g.invoke).toBe('function');
  });
});

describe('graph (singleton)', () => {
  it('should export a singleton graph instance', () => {
    expect(graph).toBeDefined();
    expect(graph).toHaveProperty('invoke');
  });

  it('should have same structure as createCodeGraph result', () => {
    const newGraph = createCodeGraph();
    // Both should be compiled StateGraph instances with invoke method
    expect(graph).toHaveProperty('invoke');
    expect(newGraph).toHaveProperty('invoke');
    expect(typeof graph.invoke).toBe('function');
    expect(typeof newGraph.invoke).toBe('function');
  });
});

describe('graph execution', () => {
  it('should invoke graph with basic state', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
      main_model: 'gpt-4',
      agent_name: 'Test Agent',
    };

    const result = await g.invoke(state, { recursionLimit: 10 });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('messages');
  });

  it('should handle switch_command for smart_memory', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
      switch_command: 'smart_memory',
    };

    const result = await g.invoke(state, { recursionLimit: 10 });

    expect(result).toBeDefined();
  });

  it('should handle switch_command for specific agent', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
      switch_command: 'planner',
    };

    const result = await g.invoke(state, { recursionLimit: 10 });

    expect(result).toBeDefined();
  });

  it('should use default agent when no switch_command', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
    };

    const result = await g.invoke(state, { recursionLimit: 10 });

    expect(result).toBeDefined();
  });

  it('should return updated state after execution', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
      task_store: { key: 'value' },
    };

    const result = await g.invoke(state, { recursionLimit: 10 });

    expect(result).toHaveProperty('messages');
    expect(result).toHaveProperty('task_store');
    expect(result).toHaveProperty('switch_command');
  });
});

describe('graph behavior', () => {
  it('should reset switch_command after execution', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
      switch_command: 'planner',
    };

    const result = await g.invoke(state, { recursionLimit: 10 });

    // switch_command should be reset to empty string
    expect(result.switch_command).toBe('');
  });

  it('should preserve task_store across invocations', async () => {
    const g = createCodeGraph();
    const initialTaskStore = { data: 'test' };

    const result = await g.invoke(
      {
        messages: [],
        task_store: initialTaskStore,
      },
      { recursionLimit: 10 }
    );

    expect(result.task_store).toBeDefined();
  });

  it('should handle enable_thinking flag', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
      enable_thinking: false,
    };

    const result = await g.invoke(state, { recursionLimit: 10 });

    expect(result).toBeDefined();
  });
});

describe('error handling', () => {
  it('should throw error for unknown agent', async () => {
    const g = createCodeGraph();
    const state = {
      messages: [],
      switch_command: 'unknown_agent',
    };

    await expect(g.invoke(state, { recursionLimit: 10 })).rejects.toThrow('Unknown agent');
  });

  it('should handle missing agent gracefully', async () => {
    const { loadAgentsList } = await import('../subagents/config');
    vi.mocked(loadAgentsList).mockResolvedValueOnce({});

    const g = createCodeGraph();
    const state = {
      messages: [],
      switch_command: 'default',
    };

    const result = await g.invoke(state, { recursionLimit: 10 });
    // When agent config is empty, it should still return a result with default values
    expect(result).toBeDefined();
    expect(result).toHaveProperty('messages');
  });
});
