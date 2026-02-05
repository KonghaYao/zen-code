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
        it('should insert and retrieve a model', async () => {
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

            await storage.insertModel(modelData);
            const model = await storage.getModel('model-1');

            expect(model).toBeDefined();
            expect(model?.id).toBe('model-1');
            expect(model?.model_name).toBe('gpt-4');
            expect(model?.stream_usage).toBe(1);
            expect(model?.enable_thinking).toBe(0);
            expect(model?.temperature).toBe(0.7);
        });

        it('should throw error when inserting duplicate model', async () => {
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

            await storage.insertModel(modelData);

            expect(() => storage.insertModel(modelData)).toThrow('Model with id model-1 already exists');
        });

        it('should return undefined for non-existent model', async () => {
            const model = await storage.getModel('non-existent');
            expect(model).toBeUndefined();
        });

        it('should retrieve all models', async () => {
            await storage.insertModel({
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

            await storage.insertModel({
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

            const models = await storage.getAllModels();
            expect(models).toHaveLength(2);
            expect(models[0].model_name).toBe('gpt-4');
            expect(models[1].model_name).toBe('claude-3');
        });

        it('should update a model', async () => {
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

            await storage.insertModel(modelData);

            const updatedData = {
                ...modelData,
                temperature: 0.9,
                max_tokens: 8192,
            };

            await storage.updateModel(updatedData);

            const model = await storage.getModel('model-1');
            expect(model?.temperature).toBe(0.9);
            expect(model?.max_tokens).toBe(8192);
        });

        it('should throw error when updating non-existent model', async () => {
            await expect(
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
                }),
            ).rejects.toThrow('Model with id non-existent not found');
        });

        it('should delete a model', async () => {
            await storage.insertModel({
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

            await storage.deleteModel('model-1');
            const model = await storage.getModel('model-1');
            expect(model).toBeUndefined();
        });

        it('should throw error when deleting model referenced by agent', async () => {
            await storage.insertModel({
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

            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await expect(storage.deleteModel('model-1')).rejects.toThrow(
                'Cannot delete model model-1: it is referenced by agent agent-1',
            );
        });
    });

    // ========================================
    // Prompts
    // ========================================
    describe('Prompts', () => {
        it('should insert and retrieve a prompt', async () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are a helpful assistant.',
                metadata: { version: '1.0' },
            };

            await storage.insertPrompt(promptData);
            const prompt = await storage.getPrompt('prompt-1');

            expect(prompt).toBeDefined();
            expect(prompt?.id).toBe('prompt-1');
            expect(prompt?.name).toBe('system-prompt');
            expect(prompt?.content).toBe('You are a helpful assistant.');
            expect(JSON.parse(prompt?.metadata || '{}')).toEqual({ version: '1.0' });
        });

        it('should throw error when inserting duplicate prompt by id', async () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are helpful.',
            };

            await storage.insertPrompt(promptData);

            expect(() => storage.insertPrompt(promptData)).toThrow('Prompt with id prompt-1 already exists');
        });

        it('should throw error when inserting duplicate prompt by name', async () => {
            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are helpful.',
            });

            await expect(
                storage.insertPrompt({
                    id: 'prompt-2',
                    name: 'system-prompt',
                    content: 'Another content.',
                }),
            ).rejects.toThrow('Prompt with name system-prompt already exists');
        });

        it('should retrieve prompt by name', async () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are a helpful assistant.',
            };

            await storage.insertPrompt(promptData);
            const prompt = await storage.getPromptByName('system-prompt');

            expect(prompt).toBeDefined();
            expect(prompt?.id).toBe('prompt-1');
        });

        it('should return undefined for non-existent prompt by name', async () => {
            const prompt = await storage.getPromptByName('non-existent');
            expect(prompt).toBeUndefined();
        });

        it('should handle null metadata', async () => {
            const promptData = {
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are a helpful assistant.',
            };

            await storage.insertPrompt(promptData);
            const prompt = await storage.getPrompt('prompt-1');

            expect(prompt?.metadata).toBeNull();
        });

        it('should update a prompt', async () => {
            const promptData = {
                id: 'prompt-1',
                name: 'original-name',
                content: 'Original content.',
            };

            await storage.insertPrompt(promptData);

            await storage.updatePrompt({
                id: 'prompt-1',
                name: 'updated-name',
                content: 'Updated content.',
            });

            const prompt = await storage.getPrompt('prompt-1');
            expect(prompt?.name).toBe('updated-name');
            expect(prompt?.content).toBe('Updated content.');

            // Name index should also be updated
            const promptByName = await storage.getPromptByName('updated-name');
            expect(promptByName).toBeDefined();
            const oldPromptByName = await storage.getPromptByName('original-name');
            expect(oldPromptByName).toBeUndefined();
        });

        it('should delete a prompt', async () => {
            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system-prompt',
                content: 'You are helpful.',
            });

            await storage.deletePrompt('prompt-1');
            const prompt = await storage.getPrompt('prompt-1');
            expect(prompt).toBeUndefined();
            const promptByName = await storage.getPromptByName('system-prompt');
            expect(promptByName).toBeUndefined();
        });

        it('should throw error when deleting non-existent prompt', async () => {
            await expect(storage.deletePrompt('non-existent')).rejects.toThrow(
                'Prompt with id non-existent not found',
            );
        });

        it('should throw error when deleting prompt referenced by agent', async () => {
            await storage.insertModel({
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

            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await expect(storage.deletePrompt('prompt-1')).rejects.toThrow(
                'Cannot delete prompt prompt-1: it is referenced by agent agent-1',
            );
        });
    });

    // ========================================
    // Tools
    // ========================================
    describe('Tools', () => {
        it('should insert and retrieve a tool', async () => {
            const toolData = {
                id: 'tool-read',
                name: 'read_file',
                description: 'Read file contents',
            };

            await storage.insertTool(toolData);
            const tool = await storage.getTool('tool-read');

            expect(tool).toBeDefined();
            expect(tool?.id).toBe('tool-read');
            expect(tool?.name).toBe('read_file');
            expect(tool?.description).toBe('Read file contents');
        });

        it('should throw error when inserting duplicate tool', async () => {
            const toolData = {
                id: 'tool-1',
                name: 'read',
                description: 'Read file',
            };

            await storage.insertTool(toolData);

            expect(() => storage.insertTool(toolData)).toThrow('Tool with id tool-1 already exists');
        });

        it('should retrieve all tools', async () => {
            await storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });
            await storage.insertTool({ id: 'tool-2', name: 'write', description: 'Write file' });

            const tools = await storage.getAllTools();
            expect(tools).toHaveLength(2);
        });

        it('should update a tool', async () => {
            await storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            await storage.updateTool({ id: 'tool-1', name: 'read_file', description: 'Read file contents' });

            const tool = await storage.getTool('tool-1');
            expect(tool?.name).toBe('read_file');
            expect(tool?.description).toBe('Read file contents');
        });

        it('should throw error when updating non-existent tool', async () => {
            await expect(
                storage.updateTool({ id: 'non-existent', name: 'read', description: 'Read' }),
            ).rejects.toThrow('Tool with id non-existent not found');
        });

        it('should delete a tool', async () => {
            await storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            await storage.deleteTool('tool-1');
            const tool = await storage.getTool('tool-1');
            expect(tool).toBeUndefined();
        });

        it('should remove tool from agent tools when deleting', async () => {
            await storage.insertModel({
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

            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            await storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: {},
            });

            await storage.deleteTool('tool-1');
            const agent = storage.getAgent('agent-1');
            expect((await agent)?.tools['tool-1']).toBeUndefined();
        });
    });

    // ========================================
    // Middlewares
    // ========================================
    describe('Middlewares', () => {
        it('should insert and retrieve a middleware', async () => {
            const middlewareData = {
                id: 'middleware-logger',
                name: 'Logger',
                description: 'Log messages',
            };

            await storage.insertMiddleware(middlewareData);
            const middleware = await storage.getMiddleware('middleware-logger');

            expect(middleware).toBeDefined();
            expect(middleware?.id).toBe('middleware-logger');
            expect(middleware?.name).toBe('Logger');
        });

        it('should throw error when inserting duplicate middleware', async () => {
            const middlewareData = {
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            };

            await storage.insertMiddleware(middlewareData);

            expect(() => storage.insertMiddleware(middlewareData)).toThrow(
                'Middleware with id middleware-1 already exists',
            );
        });

        it('should retrieve all middlewares', async () => {
            await storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });
            await storage.insertMiddleware({
                id: 'middleware-2',
                name: 'Auth',
                description: 'Authenticate requests',
            });

            const middlewares = await storage.getAllMiddlewares();
            expect(middlewares).toHaveLength(2);
        });

        it('should update a middleware', async () => {
            await storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            await storage.updateMiddleware({
                id: 'middleware-1',
                name: 'LoggerV2',
                description: 'Log messages with details',
            });

            const middleware = await storage.getMiddleware('middleware-1');
            expect(middleware?.name).toBe('LoggerV2');
            expect(middleware?.description).toBe('Log messages with details');
        });

        it('should throw error when updating non-existent middleware', async () => {
            await expect(
                storage.updateMiddleware({ id: 'non-existent', name: 'Logger', description: 'Log' }),
            ).rejects.toThrow('Middleware with id non-existent not found');
        });

        it('should delete a middleware', async () => {
            await storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            await storage.deleteMiddleware('middleware-1');
            const middleware = await storage.getMiddleware('middleware-1');
            expect(middleware).toBeUndefined();
        });

        it('should remove middleware from agent middlewares when deleting', async () => {
            await storage.insertModel({
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

            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            await storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: { 'middleware-1': true },
            });

            await storage.deleteMiddleware('middleware-1');
            const agent = storage.getAgent('agent-1');
            expect((await agent)?.middlewares['middleware-1']).toBeUndefined();
        });
    });

    // ========================================
    // Agents
    // ========================================
    describe('Agents', () => {
        beforeEach(async () => {
            // Setup dependent resources
            await storage.insertModel({
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

            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            await storage.insertTool({
                id: 'tool-1',
                name: 'read',
                description: 'Read file',
            });

            await storage.insertTool({
                id: 'tool-2',
                name: 'write',
                description: 'Write file',
            });

            await storage.insertMiddleware({
                id: 'middleware-1',
                name: 'logger',
                description: 'Log messages',
            });
        });

        it('should insert and retrieve an agent with boolean tools', async () => {
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

            await storage.insertAgent(agentData);
            const agent = await storage.getAgent('agent-1');

            expect(agent).toBeDefined();
            expect(agent?.name).toBe('Test Agent');
            expect(agent?.tools['tool-1']).toBe(true);
            expect(agent?.middlewares['middleware-1']).toBe(true);
        });

        it('should throw error when inserting duplicate agent', async () => {
            const agentData = {
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            };

            await storage.insertAgent(agentData);

            expect(() => storage.insertAgent(agentData)).toThrow('Agent with id agent-1 already exists');
        });

        it('should throw error when inserting agent with non-existent model', async () => {
            await expect(
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'prompt-1',
                    model: 'non-existent-model',
                    tools: {},
                    middleware: {},
                }),
            ).rejects.toThrow('Model non-existent-model not found');
        });

        it('should throw error when inserting agent with non-existent prompt', async () => {
            await expect(
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'non-existent-prompt',
                    model: 'model-1',
                    tools: {},
                    middleware: {},
                }),
            ).rejects.toThrow('Prompt non-existent-prompt not found');
        });

        it('should throw error when inserting agent with non-existent tool', async () => {
            await expect(
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: { 'non-existent-tool': true },
                    middleware: {},
                }),
            ).rejects.toThrow('Tool non-existent-tool not found');
        });

        it('should throw error when inserting agent with non-existent middleware', async () => {
            await expect(
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test Agent',
                    description: 'A test agent',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: {},
                    middleware: { 'non-existent-middleware': true },
                }),
            ).rejects.toThrow('Middleware non-existent-middleware not found');
        });

        it('should insert and retrieve an agent with custom tool params', async () => {
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

            await storage.insertAgent(agentData);
            const agent = await storage.getAgent('agent-1');

            expect(agent?.tools['tool-1']).toEqual({ timeout: 5000 });
            expect(agent?.tools['tool-2']).toBe(true);
        });

        it('should return undefined for non-existent agent', async () => {
            const agent = await storage.getAgent('non-existent');
            expect(agent).toBeUndefined();
        });

        it('should retrieve all agents', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Agent 1',
                description: 'First agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await storage.insertAgent({
                id: 'agent-2',
                name: 'Agent 2',
                description: 'Second agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            const agents = await storage.getAllAgents();
            expect(agents).toHaveLength(2);
        });

        it('should update an agent', async () => {
            await storage.insertAgent({
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

            await storage.updateAgent(updatedData);
            const agent = await storage.getAgent('agent-1');

            expect(agent?.name).toBe('Updated Name');
            expect(agent?.tools['tool-1']).toBe(false);
            expect(agent?.tools['tool-2']).toBe(true);
            expect(agent?.middlewares['middleware-1']).toBe(true);
        });

        it('should throw error when updating non-existent agent', async () => {
            await expect(
                storage.updateAgent({
                    id: 'non-existent',
                    name: 'Agent',
                    description: 'Desc',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: {},
                    middleware: {},
                }),
            ).rejects.toThrow('Agent with id non-existent not found');
        });

        it('should throw error when updating agent with non-existent tool', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Agent',
                description: 'Desc',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await expect(
                storage.updateAgent({
                    id: 'agent-1',
                    name: 'Agent',
                    description: 'Desc',
                    system_prompt: 'prompt-1',
                    model: 'model-1',
                    tools: { 'non-existent-tool': true },
                    middleware: {},
                }),
            ).rejects.toThrow('Tool non-existent-tool not found');
        });

        it('should delete an agent', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await storage.deleteAgent('agent-1');
            const agent = await storage.getAgent('agent-1');
            expect(agent).toBeUndefined();
        });

        it('should get agent with all dependencies', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: { 'middleware-1': true },
            });

            const fullAgent = await storage.getAgentWithDependencies('agent-1');

            expect(fullAgent).toBeDefined();
            expect(fullAgent?.agent.name).toBe('Test Agent');
            expect(fullAgent?.model.model_name).toBe('gpt-4');
            expect(fullAgent?.systemPrompt.content).toBe('You are helpful.');
            expect(fullAgent?.tools).toHaveLength(1);
            expect(fullAgent?.middlewares).toHaveLength(1);
        });

        it('should return undefined for non-existent agent with dependencies', async () => {
            const fullAgent = await storage.getAgentWithDependencies('non-existent');
            expect(fullAgent).toBeUndefined();
        });

        it('should get agent with custom tool params in dependencies', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': { timeout: 5000 } },
                middleware: {},
            });

            const fullAgent = await storage.getAgentWithDependencies('agent-1');

            expect(fullAgent?.tools[0].enabled).toBe(true);
            expect(fullAgent?.tools[0].customParams).toEqual({ timeout: 5000 });
        });
    });

    // ========================================
    // Transactions
    // ========================================
    describe('Transactions', () => {
        it('should commit successful transactions', async () => {
            await storage.transaction(async () => {
                await storage.insertModel({
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

            const model = await storage.getModel('model-1');
            expect(model).toBeDefined();
        });

        it('should rollback failed transactions', async () => {
            try {
                await storage.transaction(async () => {
                    await storage.insertModel({
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

            const model = await storage.getModel('model-1');
            expect(model).toBeUndefined();
        });
    });

    // ========================================
    // Lifecycle
    // ========================================
    describe('Lifecycle', () => {
        it('should clear all data when close is called', async () => {
            await storage.insertModel({
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

            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful.',
            });

            await storage.insertTool({ id: 'tool-1', name: 'read', description: 'Read file' });

            await storage.insertMiddleware({
                id: 'middleware-1',
                name: 'Logger',
                description: 'Log messages',
            });

            await storage.close();

            expect(await storage.getAllModels()).toHaveLength(0);
            expect(await storage.getAllPrompts()).toHaveLength(0);
            expect(await storage.getAllTools()).toHaveLength(0);
            expect(await storage.getAllMiddlewares()).toHaveLength(0);
        });
    });
});
