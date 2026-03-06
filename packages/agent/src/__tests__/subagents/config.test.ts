/**
 * Subagents Config 测试
 * 测试代理配置加载和验证
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentPackage, MemoryStorage } from '@langgraph-js/standard-agent';
import { loadAgentsList, getDefaultAgentId, validateAgentConfig, type FEAgentConfig } from '../../subagents/config';

// Mock AgentPackage for testing
function createMockAgentPackage(): AgentPackage {
    const storage = new MemoryStorage();
    const pkg = new AgentPackage(storage);

    // Add mock agents to storage
    (async () => {
        await pkg.addModel({
            id: 'glm-4.7',
            model_name: 'glm-4.7',
            provider_id: 'openai',
            stream_usage: true,
            enable_thinking: true,
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        await pkg.addPrompt({ id: 'prompts/default', name: 'default' }, 'Default system prompt');

        await pkg.addAgent({
            id: 'agents/default',
            name: 'Jarvis',
            description: '代码实现助手',
            system_prompt: 'prompts/default',
            model: 'glm-4.7',
            middlewares: {},
        });
    })();

    return pkg;
}

describe('loadAgentsList', () => {
    it('should return a record of agent configs', async () => {
        const pkg = createMockAgentPackage();
        // Wait for async initialization
        await new Promise((resolve) => setTimeout(resolve, 10));
        const configs = await loadAgentsList(pkg);
        expect(typeof configs).toBe('object');
        expect(Array.isArray(configs)).toBe(false);
    });

    it('should include agents from package', async () => {
        const pkg = createMockAgentPackage();
        await new Promise((resolve) => setTimeout(resolve, 10));
        const configs = await loadAgentsList(pkg);
        expect(configs['agents/default']).toBeDefined();
    });

    it('should have valid agent config structure', async () => {
        const pkg = createMockAgentPackage();
        await new Promise((resolve) => setTimeout(resolve, 10));
        const configs = await loadAgentsList(pkg);

        for (const [id, config] of Object.entries(configs)) {
            expect(config.id).toBe(id);
            expect(config.name).toBeDefined();
            expect(typeof config.name).toBe('string');
            expect(config.description).toBeDefined();
            expect(typeof config.description).toBe('string');
            expect(config.system_prompt).toBeDefined();
            expect(typeof config.system_prompt).toBe('string');
            expect(config.model).toBeDefined();
            expect(typeof config.model).toBe('string');
        }
    });

    it('should extract basic agent info correctly', async () => {
        const pkg = createMockAgentPackage();
        await new Promise((resolve) => setTimeout(resolve, 10));
        const configs = await loadAgentsList(pkg);
        const defaultConfig = configs['agents/default'];

        expect(defaultConfig.id).toBe('agents/default');
        expect(defaultConfig.name).toBe('Jarvis');
        expect(defaultConfig.description).toBe('代码实现助手');
        expect(defaultConfig.system_prompt).toBe('prompts/default');
        expect(defaultConfig.model).toBe('glm-4.7');
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
});

describe('validateAgentConfig', () => {
    let mockConfig: FEAgentConfig;

    beforeEach(() => {
        mockConfig = {
            id: 'test-agent',
            name: 'Test Agent',
            description: 'A test agent',
            system_prompt: 'prompts/test',
            model: 'glm-4.7',
        };
    });

    it('should return empty array for valid config', () => {
        const errors = validateAgentConfig(mockConfig);
        expect(errors).toEqual([]);
    });

    it('should validate required fields', () => {
        const invalidConfig = {
            id: '',
            name: '',
            description: '',
            system_prompt: '',
            model: '',
        } as FEAgentConfig;

        const errors = validateAgentConfig(invalidConfig);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error when id is missing', () => {
        mockConfig.id = '';
        const errors = validateAgentConfig(mockConfig);
        expect(errors).toContain('Agent id is required');
    });

    it('should return error when name is missing', () => {
        mockConfig.name = '';
        const errors = validateAgentConfig(mockConfig);
        expect(errors).toContain('Agent name is required');
    });

    it('should return error when description is missing', () => {
        mockConfig.description = '';
        const errors = validateAgentConfig(mockConfig);
        expect(errors).toContain('Agent description is required');
    });

    it('should return error when system_prompt is missing', () => {
        mockConfig.system_prompt = '';
        const errors = validateAgentConfig(mockConfig);
        expect(errors).toContain('Agent system_prompt is required');
    });

    it('should return error when model is missing', () => {
        mockConfig.model = '';
        const errors = validateAgentConfig(mockConfig);
        expect(errors).toContain('Agent model is required');
    });
});

describe('FEAgentConfig interface', () => {
    it('should have required fields', () => {
        const config: FEAgentConfig = {
            id: 'test',
            name: 'Test',
            description: 'Test description',
            system_prompt: 'prompts/test',
            model: 'glm-4.7',
        };

        expect(config.id).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.system_prompt).toBeDefined();
        expect(config.model).toBeDefined();
    });
});
