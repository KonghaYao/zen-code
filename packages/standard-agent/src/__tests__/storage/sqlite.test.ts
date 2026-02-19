/**
 * BunSqliteStorage Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BunSqliteStorage } from '../../storage/sqlite.js';

// Simple ID generator for tests
function randomId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

describe('BunSqliteStorage', () => {
    let storage: BunSqliteStorage;

    beforeEach(() => {
        // Use in-memory database for tests
        storage = new BunSqliteStorage(':memory:');
    });

    afterEach(async () => {
        await storage.close();
    });

    describe('Lifecycle', () => {
        it('should initialize and create tables', async () => {
            await storage.initialize();

            const models = await storage.getAllModels();
            expect(models).toEqual([]);
        });

        it('should close connection', async () => {
            await storage.initialize();
            await storage.close();
            // Connection closed successfully if no error thrown
        });
    });

    describe('Models', () => {
        it('should insert and retrieve model', async () => {
            await storage.initialize();

            const modelId = randomId('model');
            const model = {
                id: modelId,
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

            await storage.insertModel(model);
            const retrieved = await storage.getModel(modelId);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(modelId);
            expect(retrieved?.model_name).toBe('gpt-4');
        });

        it('should get all models', async () => {
            await storage.initialize();

            await storage.insertModel({
                id: randomId('model'),
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
                id: randomId('model'),
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
        });

        it('should update model', async () => {
            await storage.initialize();

            const modelId = randomId('model');
            const model = {
                id: modelId,
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

            await storage.insertModel(model);

            await storage.updateModel({
                ...model,
                temperature: 0.9,
            });

            const retrieved = await storage.getModel(modelId);
            expect(retrieved?.temperature).toBe(0.9);
        });

        it('should delete model', async () => {
            await storage.initialize();

            const modelId = randomId('model');
            const model = {
                id: modelId,
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

            await storage.insertModel(model);
            await storage.deleteModel(modelId);

            const retrieved = await storage.getModel(modelId);
            expect(retrieved).toBeNull();
        });

        it('should prevent deleting model referenced by agent', async () => {
            await storage.initialize();

            const modelId = randomId('model');
            const promptId = randomId('prompt');
            const agentId = randomId('agent');

            await storage.insertModel({
                id: modelId,
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

            await storage.insertPrompt({ id: promptId, name: 'system-prompt' }, 'You are a helpful assistant');

            await storage.insertAgent({
                id: agentId,
                name: 'Test Agent',
                description: 'Test description',
                system_prompt: promptId,
                model: modelId,
                tools: {},
                middleware: {},
            });

            await expect(storage.deleteModel(modelId)).rejects.toThrow();
        });

        it('should handle model with optional fields (using schema defaults)', async () => {
            await storage.initialize();

            const modelId = randomId('model');
            // Only provide required fields - schema defaults should be used for optional fields
            const model = {
                id: modelId,
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: false, // default
                enable_thinking: false, // default
                temperature: 0.7, // default
                max_tokens: 4096, // default
                top_p: 1.0, // default
                frequency_penalty: 0.0, // default
                presence_penalty: 0.0, // default
            };

            await storage.insertModel(model);
            const retrieved = await storage.getModel(modelId);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(modelId);
            expect(retrieved?.temperature).toBe(0.7);
            expect(retrieved?.max_tokens).toBe(4096);
        });

        it('should support partial updates for model', async () => {
            await storage.initialize();

            const modelId = randomId('model');
            await storage.insertModel({
                id: modelId,
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: false,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            // Only update specific fields - others should remain unchanged
            await storage.updateModel({
                id: modelId,
                model_name: 'gpt-4-turbo',
                temperature: 0.9,
                // All other fields from existing model
                model_provider: 'openai',
                stream_usage: false,
                enable_thinking: false,
                max_tokens: 4096,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            const retrieved = await storage.getModel(modelId);
            expect(retrieved?.model_name).toBe('gpt-4-turbo');
            expect(retrieved?.temperature).toBe(0.9);
            expect(retrieved?.max_tokens).toBe(4096); // unchanged
        });
    });

    describe('Prompts', () => {
        it('should insert and retrieve prompt with initial version', async () => {
            await storage.initialize();

            const promptId = randomId('prompt');
            await storage.insertPrompt(
                { id: promptId, name: 'system-prompt' },
                'You are a helpful assistant',
                'Initial version',
            );

            const retrieved = await storage.getPrompt(promptId);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(promptId);
            expect(retrieved?.name).toBe('system-prompt');
            expect(retrieved?.current_version).toBe(1);
        });

        it('should get prompt with current version content', async () => {
            await storage.initialize();

            const promptId = randomId('prompt');
            await storage.insertPrompt({ id: promptId, name: 'system-prompt' }, 'You are a helpful assistant');

            const withContent = await storage.getPromptWithCurrentVersion(promptId);
            expect(withContent).toBeDefined();
            expect(withContent?.content).toBe('You are a helpful assistant');
        });

        it('should get prompt by name with content', async () => {
            await storage.initialize();

            const promptId = randomId('prompt');
            await storage.insertPrompt({ id: promptId, name: 'system-prompt' }, 'You are a helpful assistant');

            const retrieved = await storage.getPromptWithCurrentVersionByName('system-prompt');
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('system-prompt');
            expect(retrieved?.content).toBe('You are a helpful assistant');
        });

        it('should prevent duplicate prompt names', async () => {
            await storage.initialize();

            await storage.insertPrompt(
                { id: randomId('prompt'), name: 'system-prompt' },
                'You are a helpful assistant',
            );

            await expect(
                storage.insertPrompt({ id: randomId('prompt'), name: 'system-prompt' }, 'You are another assistant'),
            ).rejects.toThrow();
        });
    });

    describe('Prompt Versions', () => {
        it('should create new version and update current_version', async () => {
            await storage.initialize();

            const promptId = randomId('prompt');
            await storage.insertPrompt({ id: promptId, name: 'system-prompt' }, 'Version 1 content');

            const v2 = await storage.createPromptVersion(promptId, 'Version 2 content', 'Added new features');
            expect(v2.version).toBe(2);

            const prompt = await storage.getPrompt(promptId);
            expect(prompt?.current_version).toBe(2);
        });

        it('should get specific version', async () => {
            await storage.initialize();

            const promptId = randomId('prompt');
            await storage.insertPrompt({ id: promptId, name: 'test' }, 'V1');
            await storage.createPromptVersion(promptId, 'V2');

            const v1 = await storage.getPromptVersion(promptId, 1);
            const v2 = await storage.getPromptVersion(promptId, 2);

            expect(v1?.content).toBe('V1');
            expect(v2?.content).toBe('V2');
        });

        it('should rollback to previous version', async () => {
            await storage.initialize();

            const promptId = randomId('prompt');
            await storage.insertPrompt({ id: promptId, name: 'test' }, 'V1');
            await storage.createPromptVersion(promptId, 'V2');
            await storage.createPromptVersion(promptId, 'V3');

            await storage.rollbackPromptVersion(promptId, 1);

            const prompt = await storage.getPrompt(promptId);
            expect(prompt?.current_version).toBe(1);

            const withContent = await storage.getPromptWithCurrentVersion(promptId);
            expect(withContent?.content).toBe('V1');
        });
    });

    describe('Tools', () => {
        it('should insert and retrieve tool', async () => {
            await storage.initialize();

            const toolId = randomId('tool');
            const tool = {
                id: toolId,
                name: 'read-file',
                description: 'Read a file from the filesystem',
            };

            await storage.insertTool(tool);
            const retrieved = await storage.getTool(toolId);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(toolId);
            expect(retrieved?.name).toBe('read-file');
        });
    });

    describe('Middlewares', () => {
        it('should insert and retrieve middleware', async () => {
            await storage.initialize();

            const middlewareId = randomId('middleware');
            const middleware = {
                id: middlewareId,
                name: 'mcp-middleware',
                description: 'MCP server integration',
            };

            await storage.insertMiddleware(middleware);
            const retrieved = await storage.getMiddleware(middlewareId);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(middlewareId);
            expect(retrieved?.name).toBe('mcp-middleware');
        });
    });

    describe('Agents', () => {
        beforeEach(async () => {
            await storage.initialize();

            // Setup dependencies
            const modelId = randomId('model');
            const promptId = randomId('prompt');
            const toolId = randomId('tool');
            const middlewareId = randomId('middleware');

            await storage.insertModel({
                id: modelId,
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

            await storage.insertPrompt({ id: promptId, name: 'system-prompt' }, 'You are a helpful assistant');

            await storage.insertTool({
                id: toolId,
                name: 'read-file',
                description: 'Read a file from the filesystem',
            });

            await storage.insertMiddleware({
                id: middlewareId,
                name: 'mcp-middleware',
                description: 'MCP server integration',
            });
        });

        it('should insert and retrieve agent with tools and middlewares', async () => {
            const modelId = (await storage.getAllModels())[0].id;
            const promptId = (await storage.getAllPrompts())[0].id;
            const toolId = (await storage.getAllTools())[0].id;
            const middlewareId = (await storage.getAllMiddlewares())[0].id;

            const agentId = randomId('agent');
            const agent = {
                id: agentId,
                name: 'Test Agent',
                description: 'Test description',
                system_prompt: promptId,
                model: modelId,
                tools: { [toolId]: true },
                middleware: { [middlewareId]: { priority: 1 } },
            };

            await storage.insertAgent(agent);
            const retrieved = await storage.getAgent(agentId);

            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(agentId);
            expect(retrieved?.tools[toolId]).toBe(true);
            expect(retrieved?.middlewares[middlewareId]).toEqual({ priority: 1 });
        });

        it('should get agent with dependencies', async () => {
            const modelId = (await storage.getAllModels())[0].id;
            const promptId = (await storage.getAllPrompts())[0].id;
            const toolId = (await storage.getAllTools())[0].id;
            const middlewareId = (await storage.getAllMiddlewares())[0].id;

            const agentId = randomId('agent');
            const agent = {
                id: agentId,
                name: 'Test Agent',
                description: 'Test description',
                system_prompt: promptId,
                model: modelId,
                tools: { [toolId]: true },
                middleware: { [middlewareId]: true },
            };

            await storage.insertAgent(agent);
            const retrieved = await storage.getAgentWithDependencies(agentId);

            expect(retrieved).toBeDefined();
            expect(retrieved?.agent.id).toBe(agentId);
            expect(retrieved?.model.id).toBe(modelId);
            expect(retrieved?.systemPrompt.id).toBe(promptId);
        });
    });

    describe('Transactions', () => {
        it('should rollback on error', async () => {
            await storage.initialize();

            const modelId = randomId('model');
            const model = {
                id: modelId,
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

            await expect(
                storage.transaction(() => {
                    storage.insertModel(model);
                    throw new Error('Rollback test');
                }),
            ).rejects.toThrow('Rollback test');

            const models = await storage.getAllModels();
            expect(models).toHaveLength(0);
        });
    });
});
