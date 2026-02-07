import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../storage/memory.js';

describe('MemoryStorage', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
        storage = new MemoryStorage();
    });

    describe('Models', () => {
        const mockModel = {
            id: 'model-1',
            model_name: 'gpt-4',
            model_provider: 'openai',
            stream_usage: true,
            enable_thinking: false,
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        };

        it('should insert a model', async () => {
            await storage.insertModel(mockModel);
            const result = await storage.getModel('model-1');
            expect(result).toBeDefined();
            expect(result?.model_name).toBe('gpt-4');
        });

        it('should throw on duplicate model id', async () => {
            await storage.insertModel(mockModel);
            await expect(storage.insertModel(mockModel)).rejects.toThrow('already exists');
        });

        it('should get all models', async () => {
            await storage.insertModel(mockModel);
            await storage.insertModel({ ...mockModel, id: 'model-2', model_name: 'gpt-3.5' });
            const models = await storage.getAllModels();
            expect(models).toHaveLength(2);
        });

        it('should update a model', async () => {
            await storage.insertModel(mockModel);
            await storage.updateModel({ ...mockModel, temperature: 0.9 });
            const result = await storage.getModel('model-1');
            expect(result?.temperature).toBe(0.9);
        });

        it('should delete a model', async () => {
            await storage.insertModel(mockModel);
            await storage.deleteModel('model-1');
            const result = await storage.getModel('model-1');
            expect(result).toBeUndefined();
        });

        it('should prevent deleting referenced model', async () => {
            await storage.insertModel(mockModel);
            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'test-prompt',
                content: 'test',
            });
            await storage.insertAgent({
                id: 'agent-1',
                name: 'test-agent',
                description: 'test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await expect(storage.deleteModel('model-1')).rejects.toThrow('is referenced by agent');
        });
    });

    describe('Prompts', () => {
        const mockPrompt = {
            id: 'prompt-1',
            name: 'system-prompt',
            content: 'You are a helpful assistant',
            metadata: { version: 1 },
        };

        it('should insert a prompt', async () => {
            await storage.insertPrompt(mockPrompt);
            const result = await storage.getPrompt('prompt-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('system-prompt');
        });

        it('should get prompt by name', async () => {
            await storage.insertPrompt(mockPrompt);
            const result = await storage.getPromptByName('system-prompt');
            expect(result).toBeDefined();
            expect(result?.id).toBe('prompt-1');
        });

        it('should throw on duplicate prompt name', async () => {
            await storage.insertPrompt(mockPrompt);
            await expect(storage.insertPrompt({ ...mockPrompt, id: 'prompt-2' })).rejects.toThrow(
                'name system-prompt already exists',
            );
        });

        it('should update prompt and name index', async () => {
            await storage.insertPrompt(mockPrompt);
            await storage.updatePrompt({ ...mockPrompt, name: 'new-name' });
            const result = await storage.getPromptByName('new-name');
            expect(result).toBeDefined();
            const oldResult = await storage.getPromptByName('system-prompt');
            expect(oldResult).toBeUndefined();
        });

        it('should delete a prompt', async () => {
            await storage.insertPrompt(mockPrompt);
            await storage.deletePrompt('prompt-1');
            const result = await storage.getPrompt('prompt-1');
            expect(result).toBeUndefined();
        });

        it('should prevent deleting referenced prompt', async () => {
            await storage.insertModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await storage.insertPrompt(mockPrompt);
            await storage.insertAgent({
                id: 'agent-1',
                name: 'test-agent',
                description: 'test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await expect(storage.deletePrompt('prompt-1')).rejects.toThrow('is referenced by agent');
        });
    });

    describe('Tools', () => {
        const mockTool = {
            id: 'tool-1',
            name: 'read_file',
            description: 'Read a file',
        };

        it('should insert a tool', async () => {
            await storage.insertTool(mockTool);
            const result = await storage.getTool('tool-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('read_file');
        });

        it('should get all tools', async () => {
            await storage.insertTool(mockTool);
            await storage.insertTool({ ...mockTool, id: 'tool-2', name: 'write_file' });
            const tools = await storage.getAllTools();
            expect(tools).toHaveLength(2);
        });

        it('should update a tool', async () => {
            await storage.insertTool(mockTool);
            await storage.updateTool({ ...mockTool, description: 'Updated description' });
            const result = await storage.getTool('tool-1');
            expect(result?.description).toBe('Updated description');
        });

        it('should delete a tool', async () => {
            await storage.insertTool(mockTool);
            await storage.deleteTool('tool-1');
            const result = await storage.getTool('tool-1');
            expect(result).toBeUndefined();
        });
    });

    describe('Middlewares', () => {
        const mockMiddleware = {
            id: 'mid-1',
            name: 'auth',
            description: 'Authentication middleware',
        };

        it('should insert a middleware', async () => {
            await storage.insertMiddleware(mockMiddleware);
            const result = await storage.getMiddleware('mid-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('auth');
        });

        it('should get all middlewares', async () => {
            await storage.insertMiddleware(mockMiddleware);
            await storage.insertMiddleware({ ...mockMiddleware, id: 'mid-2', name: 'logging' });
            const middlewares = await storage.getAllMiddlewares();
            expect(middlewares).toHaveLength(2);
        });

        it('should update a middleware', async () => {
            await storage.insertMiddleware(mockMiddleware);
            await storage.updateMiddleware({ ...mockMiddleware, description: 'Updated' });
            const result = await storage.getMiddleware('mid-1');
            expect(result?.description).toBe('Updated');
        });

        it('should delete a middleware', async () => {
            await storage.insertMiddleware(mockMiddleware);
            await storage.deleteMiddleware('mid-1');
            const result = await storage.getMiddleware('mid-1');
            expect(result).toBeUndefined();
        });
    });

    describe('Agents', () => {
        beforeEach(async () => {
            await storage.insertModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await storage.insertPrompt({
                id: 'prompt-1',
                name: 'system',
                content: 'You are helpful',
            });
            await storage.insertTool({
                id: 'tool-1',
                name: 'read_file',
                description: 'Read a file',
            });
            await storage.insertMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth middleware',
            });
        });

        it('should insert an agent', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: { 'mid-1': false },
            });

            const result = await storage.getAgent('agent-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Agent');
            expect(result?.tools['tool-1']).toBe(true);
            expect(result?.middlewares['mid-1']).toBe(false);
        });

        it('should throw on missing model reference', async () => {
            await expect(
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test',
                    description: 'Test',
                    system_prompt: 'prompt-1',
                    model: 'missing-model',
                    tools: {},
                    middleware: {},
                }),
            ).rejects.toThrow('Model missing-model not found');
        });

        it('should throw on missing prompt reference', async () => {
            await expect(
                storage.insertAgent({
                    id: 'agent-1',
                    name: 'Test',
                    description: 'Test',
                    system_prompt: 'missing-prompt',
                    model: 'model-1',
                    tools: {},
                    middleware: {},
                }),
            ).rejects.toThrow('Prompt missing-prompt not found');
        });

        it('should handle custom tool params', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': { custom: 'param' } },
                middleware: {},
            });

            const result = await storage.getAgent('agent-1');
            expect(result?.tools['tool-1']).toEqual({ custom: 'param' });
        });

        it('should update an agent', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await storage.updateAgent({
                id: 'agent-1',
                name: 'Updated',
                description: 'Updated desc',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: { 'tool-1': true },
                middleware: { 'mid-1': true },
            });

            const result = await storage.getAgent('agent-1');
            expect(result?.name).toBe('Updated');
            expect(result?.tools['tool-1']).toBe(true);
        });

        it('should delete an agent', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                tools: {},
                middleware: {},
            });

            await storage.deleteAgent('agent-1');
            const result = await storage.getAgent('agent-1');
            expect(result).toBeUndefined();
        });
    });

    describe('Transactions', () => {
        it('should rollback on error', async () => {
            await storage.insertModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            await expect(
                storage.transaction(async () => {
                    await storage.insertPrompt({
                        id: 'prompt-1',
                        name: 'test',
                        content: 'test',
                    });
                    throw new Error('Rollback test');
                }),
            ).rejects.toThrow('Rollback test');

            // Verify rollback
            const result = await storage.getPrompt('prompt-1');
            expect(result).toBeUndefined();
        });

        it('should commit on success', async () => {
            await storage.transaction(async () => {
                await storage.insertModel({
                    id: 'model-1',
                    model_name: 'gpt-4',
                    model_provider: 'openai',
                    stream_usage: true,
                    enable_thinking: false,
                    temperature: 0.7,
                    max_tokens: 2000,
                    top_p: 1.0,
                    frequency_penalty: 0.0,
                    presence_penalty: 0.0,
                });
            });

            const result = await storage.getModel('model-1');
            expect(result).toBeDefined();
        });
    });

    describe('Close', () => {
        it('should clear all data on close', async () => {
            await storage.insertModel({
                id: 'model-1',
                model_name: 'gpt-4',
                model_provider: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });

            await storage.close();
            const result = await storage.getModel('model-1');
            expect(result).toBeUndefined();
        });
    });
});
