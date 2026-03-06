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
            provider_id: 'openai',
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
            await storage.insertPrompt({ id: 'prompt-1', name: 'test-prompt' }, 'test');
            await storage.insertAgent({
                id: 'agent-1',
                name: 'test-agent',
                description: 'test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            await expect(storage.deleteModel('model-1')).rejects.toThrow('is referenced by agent');
        });
    });

    describe('Prompts', () => {
        const mockPromptData = {
            id: 'prompt-1',
            name: 'system-prompt',
        };
        const mockContent = 'You are a helpful assistant';

        it('should insert a prompt with initial version', async () => {
            await storage.insertPrompt(mockPromptData, mockContent);
            const result = await storage.getPrompt('prompt-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('system-prompt');
            expect(result?.current_version).toBe(1);
        });

        it('should get prompt with current version content', async () => {
            await storage.insertPrompt(mockPromptData, mockContent, 'Initial version');
            const result = await storage.getPromptWithCurrentVersion('prompt-1');
            expect(result).toBeDefined();
            expect(result?.content).toBe(mockContent);
            expect(result?.change_note).toBe('Initial version');
        });

        it('should get prompt by name with content', async () => {
            await storage.insertPrompt(mockPromptData, mockContent);
            const result = await storage.getPromptWithCurrentVersionByName('system-prompt');
            expect(result).toBeDefined();
            expect(result?.id).toBe('prompt-1');
            expect(result?.content).toBe(mockContent);
        });

        it('should throw on duplicate prompt name', async () => {
            await storage.insertPrompt(mockPromptData, mockContent);
            await expect(storage.insertPrompt({ ...mockPromptData, id: 'prompt-2' }, mockContent)).rejects.toThrow(
                'name system-prompt already exists',
            );
        });

        it('should update prompt name and name index', async () => {
            await storage.insertPrompt(mockPromptData, mockContent);
            await storage.updatePrompt({ ...mockPromptData, name: 'new-name' });
            const result = await storage.getPromptByName('new-name');
            expect(result).toBeDefined();
            const oldResult = await storage.getPromptByName('system-prompt');
            expect(oldResult).toBeUndefined();
        });

        it('should delete a prompt and all its versions', async () => {
            await storage.insertPrompt(mockPromptData, mockContent);
            await storage.createPromptVersion('prompt-1', 'Version 2 content');
            await storage.deletePrompt('prompt-1');
            const result = await storage.getPrompt('prompt-1');
            expect(result).toBeUndefined();
            const versions = await storage.getPromptVersions('prompt-1');
            expect(versions).toHaveLength(0);
        });

        it('should prevent deleting referenced prompt', async () => {
            await storage.insertModel({
                id: 'model-1',
                model_name: 'gpt-4',
                provider_id: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await storage.insertPrompt(mockPromptData, mockContent);
            await storage.insertAgent({
                id: 'agent-1',
                name: 'test-agent',
                description: 'test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            await expect(storage.deletePrompt('prompt-1')).rejects.toThrow('is referenced by agent');
        });
    });

    describe('Prompt Versions', () => {
        const mockPromptData = {
            id: 'prompt-1',
            name: 'system-prompt',
        };
        const mockContent = 'You are a helpful assistant';

        beforeEach(async () => {
            await storage.insertPrompt(mockPromptData, mockContent, 'Initial version');
        });

        it('should create a new version', async () => {
            const newVersion = await storage.createPromptVersion('prompt-1', 'Updated content', 'Version 2');
            expect(newVersion.version).toBe(2);
            expect(newVersion.content).toBe('Updated content');
            expect(newVersion.change_note).toBe('Version 2');

            const prompt = await storage.getPrompt('prompt-1');
            expect(prompt?.current_version).toBe(2);
        });

        it('should get specific version', async () => {
            await storage.createPromptVersion('prompt-1', 'Version 2 content');
            const v1 = await storage.getPromptVersion('prompt-1', 1);
            const v2 = await storage.getPromptVersion('prompt-1', 2);

            expect(v1?.content).toBe(mockContent);
            expect(v2?.content).toBe('Version 2 content');
        });

        it('should get all versions sorted by version desc', async () => {
            await storage.createPromptVersion('prompt-1', 'Version 2');
            await storage.createPromptVersion('prompt-1', 'Version 3');

            const versions = await storage.getPromptVersions('prompt-1');
            expect(versions).toHaveLength(3);
            expect(versions[0].version).toBe(3);
            expect(versions[1].version).toBe(2);
            expect(versions[2].version).toBe(1);
        });

        it('should rollback to previous version', async () => {
            await storage.createPromptVersion('prompt-1', 'Version 2');
            await storage.createPromptVersion('prompt-1', 'Version 3');

            // Rollback to version 1
            await storage.rollbackPromptVersion('prompt-1', 1);

            const prompt = await storage.getPrompt('prompt-1');
            expect(prompt?.current_version).toBe(1);

            const withContent = await storage.getPromptWithCurrentVersion('prompt-1');
            expect(withContent?.content).toBe(mockContent);
        });

        it('should throw when rolling back to non-existent version', async () => {
            await expect(storage.rollbackPromptVersion('prompt-1', 999)).rejects.toThrow(
                'Version 999 not found for prompt prompt-1',
            );
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
                provider_id: 'openai',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await storage.insertPrompt({ id: 'prompt-1', name: 'system' }, 'You are helpful');
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
                middlewares: { 'mid-1': false },
            });

            const result = await storage.getAgent('agent-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Agent');
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
                    middlewares: {},
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
                    middlewares: {},
                }),
            ).rejects.toThrow('Prompt missing-prompt not found');
        });

        it('should handle custom middleware params', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': { custom: 'param' } },
            });

            const result = await storage.getAgent('agent-1');
            expect(result?.middlewares['mid-1']).toEqual({ custom: 'param' });
        });

        it('should update an agent', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            await storage.updateAgent({
                id: 'agent-1',
                name: 'Updated',
                description: 'Updated desc',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': true },
            });

            const result = await storage.getAgent('agent-1');
            expect(result?.name).toBe('Updated');
            expect(result?.middlewares['mid-1']).toBe(true);
        });

        it('should delete an agent', async () => {
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
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
                provider_id: 'openai',
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
                    provider_id: 'openai',
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
                provider_id: 'openai',
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
