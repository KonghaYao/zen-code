/**
 * Tests for MemoryStorage (in-memory storage implementation)
 *
 * Run with:
 *   bun test src/__tests__/storage/memory.test.ts
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MemoryStorage } from '../../standard-agent/storage/memory.js';

describe('MemoryStorage', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
        storage = new MemoryStorage();
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

        it('should throw error when inserting duplicate model', () => {
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

            expect(() => storage.insertModel(modelData)).toThrow(
                'Model with id model-1 already exists'
            );
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

        it('should throw error when updating non-existent model', () => {
            expect(() =>
                storage.updateModel({
                    id: 'non-existent',
                    model_name: 'gpt-4',
                    model_provider: 'openai',
                    stream_usage: true,
                    enable_thinking: false,
                    temperature: 0.7,
                    max_tokens: 4096,
                    top_p: 1.0,
                    frequency_penalty: 0.0,
                    presence_penalty: 0.0,
                })
            ).toThrow('Model with id non-existent not found');
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

        it('should throw error when deleting model referenced by agent', () => {
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

            storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            expect(() => storage.deleteModel('model-1')).toThrow(
                'Cannot delete model model-1: it is referenced by agent agent-1'
            );
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

        it('should throw error when inserting duplicate prompt by id', () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are helpful.',
            };

            storage.insertPrompt(promptData);

            expect(() => storage.insertPrompt(promptData)).toThrow(
                'Prompt with id prompt-1 already exists'
            );
        });

        it('should throw error when inserting duplicate prompt by name', () => {
            storage.insertPrompt({
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are helpful.',
            });

            expect(() =>
                storage.insertPrompt({
                    id: 'prompt-2',
                    name: 'system-prompt',
                    content: 'Another content.',
                })
            ).toThrow('Prompt with name system-prompt already exists');
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

        it('should return undefined for non-existent prompt by name', () => {
            const prompt = storage.getPromptByName('non-existent');
            expect(prompt).toBeUndefined();
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

        it('should update a prompt', () => {
            const promptData = {
                id: 'prompt-1',
                name: 'original-name',
                content: 'Original content.',
            };

            storage.insertPrompt(promptData);

            storage.updatePrompt({
                id: 'prompt-1',
                name: 'updated-name',
                content: 'Updated content.',
            });

            const prompt = storage.getPrompt('prompt-1');
            expect(prompt?.name).toBe('updated-name');
            expect(prompt?.content).toBe('Updated content.');

            // Name index should also be updated
            const promptByName = storage.getPromptByName('updated-name');
            expect(promptByName).toBeDefined();
            expect(storage.getPromptByName('original-name')).toBeUndefined();
        });

        it('should delete a prompt', () => {
            storage.insertPrompt({
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are helpful.',
            });

            storage.deletePrompt('prompt-1');
            const prompt = storage.getPrompt('prompt-1');
            expect(prompt).toBeUndefined();
            expect(storage.getPromptByName('system-prompt')).toBeUndefined();
        });

        it('should throw error when deleting non-existent prompt', () => {
            expect(() => storage.deletePrompt('non-existent')).toThrow(
                'Prompt with id non-existent not found'
            );
        });

        it('should throw error when deleting prompt referenced by agent', () => {
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

            storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            expect(() => storage.deletePrompt('prompt-1')).toThrow(
                'Cannot delete prompt prompt-1: it is referenced by agent agent-1'
            );
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

        it('should throw error when inserting duplicate tool', () => {
            const toolData = {
                id: 'tool-1',
                name: 'read',
                description: 'Read file',
            };

            storage.insertTool(toolData);

            expect(() => storage.insertTool(toolData)).toThrow(
                'Tool with id tool-1 already exists'
            );
        });

        it('should retrieve all tools', () => {
            storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });
            storage.insertTool({ id: 'tool-2', name: 'write', description: 'Write file' });

            const tools = storage.getAllTools();
            expect(tools).toHaveLength(2);
        });

        it('should update a tool', () => {
            storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            storage.updateTool({ id: 'tool-1', name: 'read_file', description: 'Read file contents' });

            const tool = storage.getTool('tool-1');
            expect(tool?.name).toBe('read_file');
            expect(tool?.description).toBe('Read file contents');
        });

        it('should throw error when updating non-existent tool', () => {
            expect(() =>
                storage.updateTool({ id: 'non-existent', name: 'read', description: 'Read' })
            ).toThrow('Tool with id non-existent not found');
        });

        it('should delete a tool', () => {
            storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            storage.deleteTool('tool-1');
            const tool = storage.getTool('tool-1');
            expect(tool).toBeUndefined();
        });

        it('should remove tool from agent tools when deleting', () => {
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

            storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: {},
            });

            storage.deleteTool('tool-1');
            const agent = storage.getAgent('agent-1');
            expect(agent?.tools['tool-1']).toBeUndefined();
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

        it('should throw error when inserting duplicate middleware', () => {
            const middlewareData = {
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            };

            storage.insertMiddleware(middlewareData);

            expect(() => storage.insertMiddleware(middlewareData)).toThrow(
                'Middleware with id middleware-1 already exists'
            );
        });

        it('should retrieve all middlewares', () => {
            storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });
            storage.insertMiddleware({
                id: 'middleware-2',
                name: 'Auth',
                description: 'Authenticate requests',
            });

            const middlewares = storage.getAllMiddlewares();
            expect(middlewares).toHaveLength(2);
        });

        it('should update a middleware', () => {
            storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            storage.updateMiddleware({
                id: 'middleware-1',
                name: 'LoggerV2',
                description: 'Log messages with details',
            });

            const middleware = storage.getMiddleware('middleware-1');
            expect(middleware?.name).toBe('LoggerV2');
            expect(middleware?.description).toBe('Log messages with details');
        });

        it('should throw error when updating non-existent middleware', () => {
            expect(() =>
                storage.updateMiddleware({ id: 'non-existent', name: 'Logger', description: 'Log' })
            ).toThrow('Middleware with id non-existent not found');
        });

        it('should delete a middleware', () => {
            storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            storage.deleteMiddleware('middleware-1');
            const middleware = storage.getMiddleware('middleware-1');
            expect(middleware).toBeUndefined();
        });

        it('should remove middleware from agent middlewares when deleting', () => {
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

            storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: { 'middleware-1': true },
            });

            storage.deleteMiddleware('middleware-1');
            const agent = storage.getAgent('agent-1');
            expect(agent?.middlewares['middleware-1']).toBeUndefined();
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
            expect(agent?.middlewares['middleware-1']).toBe(true);
        });

        it('should throw error when inserting duplicate agent', () => {
            const agentData = {
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            };

            storage.insertAgent(agentData);

            expect(() => storage.insertAgent(agentData)).toThrow(
                'Agent with id agent-1 already exists'
            );
        });

        it('should throw error when inserting agent with non-existent model', () => {
            expect(() =>
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'prompt-1',
                    model: 'non-existent-model',
                    tools: {},
                    middleware: {},
                })
            ).toThrow('Model non-existent-model not found');
        });

        it('should throw error when inserting agent with non-existent prompt', () => {
            expect(() =>
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'non-existent-prompt',
                    model: 'model-1',
                    tools: {},
                    middleware: {},
                })
            ).toThrow('Prompt non-existent-prompt not found');
        });

        it('should throw error when inserting agent with non-existent tool', () => {
            expect(() =>
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: { 'non-existent-tool': true },
                    middleware: {},
                })
            ).toThrow('Tool non-existent-tool not found');
        });

        it('should throw error when inserting agent with non-existent middleware', () => {
            expect(() =>
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: {},
                    middleware: { 'non-existent-middleware': true },
                })
            ).toThrow('Middleware non-existent-middleware not found');
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

        it('should return undefined for non-existent agent', () => {
            const agent = storage.getAgent('non-existent');
            expect(agent).toBeUndefined();
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
            expect(agent?.middlewares['middleware-1']).toBe(true);
        });

        it('should throw error when updating non-existent agent', () => {
            expect(() =>
                storage.updateAgent({
                    id: 'non-existent',
                    name: 'Agent',
                    description: 'Desc',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: {},
                    middleware: {},
                })
            ).toThrow('Agent with id non-existent not found');
        });

        it('should throw error when updating agent with non-existent tool', () => {
            storage.insertAgent({
                id: 'agent-1',
                name: 'Agent',
                description: 'Desc',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            expect(() =>
                storage.updateAgent({
                    id: 'agent-1',
                    name: 'Agent',
                    description: 'Desc',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: { 'non-existent-tool': true },
                    middleware: {},
                })
            ).toThrow('Tool non-existent-tool not found');
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

        it('should return undefined for non-existent agent with dependencies', () => {
            const fullAgent = storage.getAgentWithDependencies('non-existent');
            expect(fullAgent).toBeUndefined();
        });

        it('should get agent with custom tool params in dependencies', () => {
            storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': { timeout: 5000 } },
                middleware: {},
            });

            const fullAgent = storage.getAgentWithDependencies('agent-1');

            expect(fullAgent?.tools[0].enabled).toBe(true);
            expect(fullAgent?.tools[0].customParams).toEqual({ timeout: 5000 });
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

    // ========================================
    // Lifecycle
    // ========================================
    describe('Lifecycle', () => {
        it('should clear all data when close is called', () => {
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

            storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            storage.close();

            expect(storage.getAllModels()).toHaveLength(0);
            expect(storage.getAllPrompts()).toHaveLength(0);
            expect(storage.getAllTools()).toHaveLength(0);
            expect(storage.getAllMiddlewares()).toHaveLength(0);
        });
    });
});
