/**
 * Tests for AgentStorage (DAL) using bun:sqlite
 *
 * Run with:
 *   bun test src/__tests__/storage/dal.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AgentStorage } from '../../standard-agent/storage/dal.js';

describe('AgentStorage', () => {
    let storage: AgentStorage;
    const testDbPath = './test-storage.db';

    beforeEach(() => {
        // Clean up any existing test database
        try {
            require('fs').unlinkSync(testDbPath);
        } catch {
            // Ignore if file doesn't exist
        }
        storage = new AgentStorage(testDbPath);
    });

    afterEach(() => {
        storage.close();
        try {
            require('fs').unlinkSync(testDbPath);
        } catch {
            // Ignore if file doesn't exist
        }
    });

    // ========================================
    // Models
    // ========================================
    describe('Models', () => {
        it('should insert and retrieve a model', () => {
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

            storage.insertModel(modelData);
            const model = storage.getModel('model-1');

            expect(model).toBeDefined();
            expect(model?.id).toBe('model-1');
            expect(model?.model_name).toBe('gpt-4');
            expect(model?.stream_usage).toBe(1);
            expect(model?.enable_thinking).toBe(0);
            expect(model?.temperature).toBe(0.7);
        });

        it('should return undefined for non-existent model', () => {
            const model = storage.getModel('non-existent');
            expect(model).toBeUndefined();
        });

        it('should retrieve all models', () => {
            storage.insertModel({
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

            storage.insertModel({
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

            const models = storage.getAllModels();
            expect(models).toHaveLength(2);
            expect(models[0].model_name).toBe('gpt-4');
            expect(models[1].model_name).toBe('claude-3');
        });

        it('should update a model', () => {
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

            storage.insertModel(modelData);

            const updatedData = {
                ...modelData,
                temperature: 0.9,
                max_tokens: 8192,
            };

            storage.updateModel(updatedData);

            const model = storage.getModel('model-1');
            expect(model?.temperature).toBe(0.9);
            expect(model?.max_tokens).toBe(8192);
        });

        it('should delete a model', () => {
            storage.insertModel({
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

            storage.deleteModel('model-1');
            const model = storage.getModel('model-1');
            expect(model).toBeUndefined();
        });
    });

    // ========================================
    // Prompts
    // ========================================
    describe('Prompts', () => {
        it('should insert and retrieve a prompt', () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are a helpful assistant.',
                metadata: { version: '1.0' },
            };

            storage.insertPrompt(promptData);
            const prompt = storage.getPrompt('prompt-1');

            expect(prompt).toBeDefined();
            expect(prompt?.id).toBe('prompt-1');
            expect(prompt?.name).toBe('system-prompt');
            expect(prompt?.content).toBe('You are a helpful assistant.');
            expect(JSON.parse(prompt?.metadata || '{}')).toEqual({ version: '1.0' });
        });

        it('should retrieve prompt by name', () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are a helpful assistant.',
            };

            storage.insertPrompt(promptData);
            const prompt = storage.getPromptByName('system-prompt');

            expect(prompt).toBeDefined();
            expect(prompt?.id).toBe('prompt-1');
        });

        it('should handle null metadata', () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are a helpful assistant.',
            };

            storage.insertPrompt(promptData);
            const prompt = storage.getPrompt('prompt-1');

            expect(prompt?.metadata).toBeNull();
        });
    });

    // ========================================
    // Tools
    // ========================================
    describe('Tools', () => {
        it('should insert and retrieve a tool', () => {
            const toolData = {
                id: 'tool-read',
                name: 'read_file',
                description: 'Read file contents',
            };

            storage.insertTool(toolData);
            const tool = storage.getTool('tool-read');

            expect(tool).toBeDefined();
            expect(tool?.id).toBe('tool-read');
            expect(tool?.name).toBe('read_file');
            expect(tool?.description).toBe('Read file contents');
        });

        it('should retrieve all tools', () => {
            storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });
            storage.insertTool({ id: 'tool-2', name: 'write', description: 'Write file' });

            const tools = storage.getAllTools();
            expect(tools).toHaveLength(2);
        });
    });

    // ========================================
    // Middlewares
    // ========================================
    describe('Middlewares', () => {
        it('should insert and retrieve a middleware', () => {
            const middlewareData = {
                id: 'middleware-logger',
                name: 'Logger',
                description: 'Log messages',
            };

            storage.insertMiddleware(middlewareData);
            const middleware = storage.getMiddleware('middleware-logger');

            expect(middleware).toBeDefined();
            expect(middleware?.id).toBe('middleware-logger');
            expect(middleware?.name).toBe('Logger');
        });
    });

    // ========================================
    // Agents
    // ========================================
    describe('Agents', () => {
        beforeEach(() => {
            // Setup dependent resources
            storage.insertModel({
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

            storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            storage.insertTool({
                id: 'tool-1',
                name: 'read',
                description: 'Read file',
            });

            storage.insertTool({
                id: 'tool-2',
                name: 'write',
                description: 'Write file',
            });

            storage.insertMiddleware({
                id: 'middleware-1',
                name: 'logger',
                description: 'Log messages',
            });
        });

        it('should insert and retrieve an agent with boolean tools', () => {
            const agentData = {
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {
                    'tool-1': true,
                },
                middleware: {
                    'middleware-1': true,
                },
            };

            storage.insertAgent(agentData);
            const agent = storage.getAgent('agent-1');

            expect(agent).toBeDefined();
            expect(agent?.name).toBe('Test Agent');
            expect(agent?.tools['tool-1']).toBe(true);
            // Check for middlewares or middleware (compatibility with both)
            const midKey = 'middlewares' in (agent || {}) ? 'middlewares' : 'middleware';
            if (midKey === 'middlewares') {
                expect((agent as any).middlewares['middleware-1']).toBe(true);
            } else {
                expect((agent as any).middleware['middleware-1']).toBe(true);
            }
        });

        it('should insert and retrieve an agent with custom tool params', () => {
            const agentData = {
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {
                    'tool-1': { timeout: 5000 },
                    'tool-2': true,
                },
                middleware: {},
            };

            storage.insertAgent(agentData);
            const agent = storage.getAgent('agent-1');

            expect(agent?.tools['tool-1']).toEqual({ timeout: 5000 });
            expect(agent?.tools['tool-2']).toBe(true);
        });

        it('should retrieve all agents', () => {
            storage.insertAgent({
                id: 'agent-1',
                name: 'Agent 1',
                description: 'First agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            storage.insertAgent({
                id: 'agent-2',
                name: 'Agent 2',
                description: 'Second agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            const agents = storage.getAllAgents();
            expect(agents).toHaveLength(2);
        });

        it('should update an agent', () => {
            storage.insertAgent({
                id: 'agent-1',
                name: 'Original Name',
                description: 'Original description',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: {},
            });

            const updatedData = {
                id: 'agent-1',
                name: 'Updated Name',
                description: 'Updated description',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': false, 'tool-2': true },
                middleware: { 'middleware-1': true },
            };

            storage.updateAgent(updatedData);
            const agent = storage.getAgent('agent-1');

            expect(agent?.name).toBe('Updated Name');
            expect(agent?.tools['tool-1']).toBe(false);
            expect(agent?.tools['tool-2']).toBe(true);
            // Check for middlewares or middleware (compatibility with both)
            const midKey = 'middlewares' in (agent || {}) ? 'middlewares' : 'middleware';
            if (midKey === 'middlewares') {
                expect((agent as any).middlewares['middleware-1']).toBe(true);
            } else {
                expect((agent as any).middleware['middleware-1']).toBe(true);
            }
        });

        it('should delete an agent', () => {
            storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            storage.deleteAgent('agent-1');
            const agent = storage.getAgent('agent-1');
            expect(agent).toBeUndefined();
        });

        it('should get agent with all dependencies', () => {
            storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: { 'middleware-1': true },
            });

            const fullAgent = storage.getAgentWithDependencies('agent-1');

            expect(fullAgent).toBeDefined();
            expect(fullAgent?.agent.name).toBe('Test Agent');
            expect(fullAgent?.model.model_name).toBe('gpt-4');
            expect(fullAgent?.systemPrompt.content).toBe('You are helpful.');
            expect(fullAgent?.tools).toHaveLength(1);
            expect(fullAgent?.middlewares).toHaveLength(1);
        });
    });

    // ========================================
    // Transactions
    // ========================================
    describe('Transactions', () => {
        it('should commit successful transactions', () => {
            storage.transaction(() => {
                storage.insertModel({
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
            });

            const model = storage.getModel('model-1');
            expect(model).toBeDefined();
        });

        it('should rollback failed transactions', () => {
            try {
                storage.transaction(() => {
                    storage.insertModel({
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

                    // Simulate an error
                    throw new Error('Test error');
                });
            } catch (e) {
                // Expected error
            }

            const model = storage.getModel('model-1');
            expect(model).toBeUndefined();
        });
    });
});
