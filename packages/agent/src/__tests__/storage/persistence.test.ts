/**
 * Tests for InjectedAgentPackage (Persistence Layer)
 *
 * Run with:
 *   bun test src/__tests__/storage/persistence.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createInjectedAgentPackage } from '../../standard-agent/storage/persistence.js';
import { ToolImplementation, MiddlewareImplementation } from '../../standard-agent/index.js';

describe('InjectedAgentPackage', () => {
    let pkg: any;
    const testDbPath = './test-persistence.db';

    beforeEach(() => {
        // Clean up any existing test database
        try {
            require('fs').unlinkSync(testDbPath);
        } catch {
            // Ignore if file doesn't exist
        }
        pkg = createInjectedAgentPackage(testDbPath);
    });

    afterEach(() => {
        pkg.close();
        try {
            require('fs').unlinkSync(testDbPath);
        } catch {
            // Ignore if file doesn't exist
        }
    });

    // ========================================
    // Schema Persistence
    // ========================================
    describe('Schema Persistence', () => {
        it('should persist and load models', () => {
            const modelData = {
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            };

            pkg.persistModel(modelData);

            const model = pkg.getModel('model-1');
            expect(model).toBeDefined();
            // Model entity uses getter: modelName not model_name
            expect(model?.modelName).toBe('gpt-4');
        });

        it('should persist and load prompts', () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
                metadata: { version: '1.0' },
            };

            pkg.persistPrompt(promptData);

            const prompt = pkg.getPrompt('prompt-1');
            expect(prompt).toBeDefined();
            expect(prompt?.content).toBe('You are helpful.');
            expect(prompt?.metadata).toEqual({ version: '1.0' });
        });

        it('should persist and load tools', () => {
            const toolData = {
                id: 'tool-1',
                name: 'read_file',
                description: 'Read file contents',
            };

            pkg.persistTool(toolData);

            const tool = pkg.getTool('tool-1');
            expect(tool).toBeDefined();
            expect(tool?.name).toBe('read_file');
        });

        it('should persist and load middlewares', () => {
            const middlewareData = {
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            };

            pkg.persistMiddleware(middlewareData);

            const middleware = pkg.getMiddleware('middleware-1');
            expect(middleware).toBeDefined();
            expect(middleware?.name).toBe('Logger');
        });

        it('should persist and load agents', () => {
            // Setup dependencies
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            pkg.persistTool({
                id: 'tool-1',
                name: 'read',
                description: 'Read file',
            });

            // Persist agent
            pkg.persistAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: {},
            });

            const agent = pkg.getAgent('agent-1');
            expect(agent).toBeDefined();
            expect(agent?.name).toBe('Test Agent');
            // Agent uses ToolConfig objects with enabled property
            expect(agent?.tools['tool-1']?.enabled).toBe(true);
        });
    });

    // ========================================
    // Schema Updates
    // ========================================
    describe('Schema Updates', () => {
        it('should update a model', () => {
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.updateModel({
                id: 'model-1',
                model_name: 'gpt-4-turbo',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.8,
                max_tokens: 8192,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            const model = pkg.getModel('model-1');
            // Model entity uses getter: modelName not model_name
            expect(model?.modelName).toBe('gpt-4-turbo');
            expect(model?.temperature).toBe(0.8);
        });

        it('should update a prompt', () => {
            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'Original content',
            });

            pkg.updatePrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'Updated content',
                metadata: { version: '2.0' },
            });

            const prompt = pkg.getPrompt('prompt-1');
            expect(prompt?.content).toBe('Updated content');
            expect(prompt?.metadata).toEqual({ version: '2.0' });
        });

        it('should update an agent', () => {
            // Setup dependencies
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            pkg.persistTool({ id: 'tool-1', name: 'read', description: 'Read' });
            pkg.persistTool({ id: 'tool-2', name: 'write', description: 'Write' });

            pkg.persistAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: {},
            });

            pkg.updateAgent({
                id: 'agent-1',
                name: 'Updated Agent',
                description: 'An updated agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': false, 'tool-2': true },
                middleware: {},
            });

            const agent = pkg.getAgent('agent-1');
            expect(agent?.name).toBe('Updated Agent');
            // Agent uses ToolConfig objects with enabled property
            expect(agent?.tools['tool-1']?.enabled).toBe(false);
            expect(agent?.tools['tool-2']?.enabled).toBe(true);
        });
    });

    // ========================================
    // Schema Deletion
    // ========================================
    describe('Schema Deletion', () => {
        it('should delete a model', () => {
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.deleteModel('model-1');

            const model = pkg.getModel('model-1');
            expect(model).toBeUndefined();
        });

        it('should delete a tool', () => {
            pkg.persistTool({ id: 'tool-1', name: 'read', description: 'Read' });

            pkg.deleteTool('tool-1');

            const tool = pkg.getTool('tool-1');
            expect(tool).toBeUndefined();
        });

        it('should delete an agent', () => {
            // Setup dependencies
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            pkg.persistAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            pkg.deleteAgent('agent-1');

            const agent = pkg.getAgent('agent-1');
            expect(agent).toBeUndefined();
        });
    });

    // ========================================
    // Reload Schemas
    // ========================================
    describe('Reload Schemas', () => {
        it('should reload schemas from database', () => {
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            // Reload schemas
            pkg.reloadSchemas();

            const model = pkg.getModel('model-1');
            const prompt = pkg.getPrompt('prompt-1');

            expect(model).toBeDefined();
            expect(prompt).toBeDefined();
        });
    });

    // ========================================
    // Implementation Registration
    // ========================================
    describe('Implementation Registration', () => {
        it('should register and execute tool implementations', async () => {
            const mockTool: ToolImplementation = {
                id: 'tool-mock',
                name: 'Mock Tool',
                description: 'A mock tool for testing',
                async execute() {
                    return 'mock result';
                },
            };

            pkg.registerToolImplementation(mockTool);

            // Execute the tool
            const result = await pkg.tools.execute('tool-mock', {});
            expect(result).toBe('mock result');
        });

        it('should register and execute middleware implementations', async () => {
            const mockMiddleware: MiddlewareImplementation = {
                id: 'middleware-mock',
                name: 'Mock Middleware',
                description: 'A mock middleware for testing',
                async execute() {
                    return 'middleware result';
                },
            };

            pkg.registerMiddlewareImplementation(mockMiddleware);

            // Execute the middleware
            const result = await pkg.middlewares.execute('middleware-mock', {});
            expect(result).toBe('middleware result');
        });
    });

    // ========================================
    // Import/Export
    // ========================================
    describe('Import/Export', () => {
        it('should import an AgentPackage', () => {
            const { AgentPackage } = require('../../standard-agent/index.js');

            const memoryPkg = new AgentPackage({
                models: [
                    {
                        id: 'model-1',
                        model_name: 'gpt-4',
                        model_provider: 'openai',
                        stream_usage: true,
                        enable_thinking: false,
                        temperature: 0.7,
                        max_tokens: 4096,
                        top_p: 1.0,
                        frequency_penalty: 0.0,
                        presence_penalty: 0.0,
                    },
                ],
                prompts: [
                    {
                        id: 'prompt-1',
                        name: 'system',
                        content: 'You are helpful.',
                    },
                ],
                agents: [],
            });

            pkg.importAgentPackage(memoryPkg);

            const model = pkg.getModel('model-1');
            const prompt = pkg.getPrompt('prompt-1');

            expect(model).toBeDefined();
            expect(prompt).toBeDefined();
        });

        it('should export to AgentPackage', () => {
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            const { AgentPackage } = require('../../standard-agent/index.js');
            const exported = pkg.exportToAgentPackage();

            expect(exported).toBeInstanceOf(AgentPackage);
            expect(exported.listModels()).toHaveLength(1);
            expect(exported.listPrompts()).toHaveLength(1);
        });
    });

    // ========================================
    // Agent Validation
    // ========================================
    describe('Agent Validation', () => {
        it('should validate a valid agent', () => {
            // Setup
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            pkg.persistTool({ id: 'tool-1', name: 'read', description: 'Read' });

            pkg.persistAgent({
                id: 'agent-1',
                name: 'Valid Agent',
                description: 'A valid agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: {},
            });

            const validation = pkg.validateAgent('agent-1');
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it('should validate all agents', () => {
            // Setup multiple agents
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistModel({
                id: 'model-2',
                model_name: 'gpt-3.5',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            pkg.persistAgent({
                id: 'agent-1',
                name: 'Valid Agent',
                description: 'A valid agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            pkg.persistAgent({
                id: 'agent-2',
                name: 'Another Valid Agent',
                description: 'Another valid agent',
                system_prompt: 'prompt-1',
                model: 'model-2',
                tools: {},
                middleware: {},
            });

            const validationResults = pkg.validateAll();

            expect(validationResults.get('agent-1')?.valid).toBe(true);
            expect(validationResults.get('agent-2')?.valid).toBe(true);
        });
    });

    // ========================================
    // List Operations
    // ========================================
    describe('List Operations', () => {
        it('should list all models', () => {
            pkg.persistModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            pkg.persistModel({
                id: 'model-2',
                model_name: 'claude-3',
                model_provider: 'anthropic',
                stream_usage: false,
                enable_thinking: true,
                temperature: 0.5,
                max_tokens: 8192,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
            });

            const models = pkg.listModels();
            expect(models).toHaveLength(2);
        });

        it('should list all prompts', () => {
            pkg.persistPrompt({
                id: 'prompt-1',
                name: 'system1',
                content: 'Content 1',
            });

            pkg.persistPrompt({
                id: 'prompt-2',
                name: 'system2',
                content: 'Content 2',
            });

            const prompts = pkg.listPrompts();
            expect(prompts).toHaveLength(2);
        });
    });
});
