/**
 * Subagents Config 测试
 * 测试代理配置加载和验证
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadAgentsList,
  getDefaultAgentId,
  validateAgentConfig,
  type AgentConfig,
} from '../../subagents/config';

describe('loadAgentsList', () => {
  it('should return a record of agent configs', async () => {
    const configs = await loadAgentsList();
    expect(typeof configs).toBe('object');
    expect(Array.isArray(configs)).toBe(false);
  });

  it('should include default agent', async () => {
    const configs = await loadAgentsList();
    expect(configs['default']).toBeDefined();
  });

  it('should have valid default agent config', async () => {
    const configs = await loadAgentsList();
    const defaultConfig = configs['default'];

    expect(defaultConfig.id).toBe('default');
    expect(defaultConfig.name).toBeDefined();
    expect(defaultConfig.description).toBeDefined();
    expect(Array.isArray(defaultConfig.tools)).toBe(true);
    expect(typeof defaultConfig.middleware).toBe('object');
  });

  it('should have middleware enabled for default agent', async () => {
    const configs = await loadAgentsList();
    const defaultConfig = configs['default'];

    expect(defaultConfig.middleware.agents_md).toBe(true);
    expect(defaultConfig.middleware.skills).toBe(true);
    expect(defaultConfig.middleware.memories).toBe(true);
    expect(defaultConfig.middleware.mcp).toBe(true);
    expect(defaultConfig.middleware.subagents).toBe(true);
  });

  it('should have "all" tools for default agent', async () => {
    const configs = await loadAgentsList();
    const defaultConfig = configs['default'];

    expect(defaultConfig.tools).toContain('all');
  });

  it('should have unique agent IDs', async () => {
    const configs = await loadAgentsList();
    const ids = Object.keys(configs);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should have valid agent config structure', async () => {
    const configs = await loadAgentsList();

    for (const [id, config] of Object.entries(configs)) {
      expect(config.id).toBe(id);
      expect(config.name).toBeDefined();
      expect(typeof config.name).toBe('string');
      expect(config.description).toBeDefined();
      expect(typeof config.description).toBe('string');
      expect(Array.isArray(config.tools)).toBe(true);
      expect(typeof config.middleware).toBe('object');
    }
  });
});

describe('getDefaultAgentId', () => {
  it('should return "default"', () => {
    const defaultId = getDefaultAgentId();
    expect(defaultId).toBe('default');
  });

  it('should return a string', () => {
    const defaultId = getDefaultAgentId();
    expect(typeof defaultId).toBe('string');
  });

  it('should match an agent in loadAgentsList', async () => {
    const defaultId = getDefaultAgentId();
    const configs = await loadAgentsList();

    expect(configs[defaultId]).toBeDefined();
  });
});

describe('validateAgentConfig', () => {
  let mockConfig: AgentConfig;
  let mockAvailableTools: Set<string>;

  beforeEach(() => {
    mockConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      tools: ['read_file', 'write_file', 'glob_files'],
      middleware: {
        agents_md: true,
        skills: true,
      },
    };

    mockAvailableTools = new Set([
      'read_file',
      'write_file',
      'glob_files',
      'search-files-rg',
      'edit_file',
    ]);
  });

  it('should return empty array for valid config', () => {
    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toEqual([]);
  });

  it('should reject unknown tools', () => {
    mockConfig.tools = ['read_file', 'unknown_tool', 'write_file'];

    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toContain('Unknown tool: unknown_tool');
  });

  it('should accept "all" as a valid tool', () => {
    mockConfig.tools = ['all'];

    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toEqual([]);
  });

  it('should reject multiple unknown tools', () => {
    mockConfig.tools = ['unknown_1', 'unknown_2'];

    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toContain('Unknown tool: unknown_1');
    expect(errors).toContain('Unknown tool: unknown_2');
  });

  it('should handle empty tools array', () => {
    mockConfig.tools = [];

    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toEqual([]);
  });

  it('should handle empty available tools set', () => {
    mockConfig.tools = ['read_file'];
    mockAvailableTools = new Set();

    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toContain('Unknown tool: read_file');
  });

  it('should allow "all" with other tools', () => {
    mockConfig.tools = ['all', 'read_file', 'write_file'];

    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toEqual([]);
  });

  it('should not validate middleware settings', () => {
    mockConfig.middleware = {
      agents_md: false,
      skills: false,
      memories: false,
      mcp: false,
      subagents: false,
    };

    const errors = validateAgentConfig(mockConfig, mockAvailableTools);
    expect(errors).toEqual([]);
  });
});

describe('AgentConfig interface', () => {
  it('should have required fields', () => {
    const config: AgentConfig = {
      id: 'test',
      name: 'Test',
      description: 'Test description',
      tools: [],
      middleware: {},
    };

    expect(config.id).toBeDefined();
    expect(config.name).toBeDefined();
    expect(config.description).toBeDefined();
    expect(config.tools).toBeDefined();
    expect(config.middleware).toBeDefined();
  });

  it('should have optional systemPrompt', () => {
    const config1: AgentConfig = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tools: [],
      middleware: {},
      systemPrompt: 'Static prompt',
    };

    const config2: AgentConfig = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      tools: [],
      middleware: {},
      systemPrompt: (state: any) => `Dynamic: ${state.input}`,
    };

    expect(typeof config1.systemPrompt).toBe('string');
    expect(typeof config2.systemPrompt).toBe('function');
  });
});
