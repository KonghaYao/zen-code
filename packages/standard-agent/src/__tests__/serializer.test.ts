import { describe, it, expect, beforeEach } from 'vitest';
import { AgentSerializer } from '../serializer.js';
import { MemoryStorage } from '../storage/memory.js';
import type { IStorage } from '../storage/abstract.js';

describe('AgentSerializer', () => {
    let storage: IStorage;
    let serializer: AgentSerializer;

    beforeEach(() => {
        storage = new MemoryStorage();
        serializer = new AgentSerializer(storage);
    });

    describe('toJSON', () => {
        it('should export empty package', async () => {
            const result = await serializer.toJSON();
            expect(result).toEqual({
                models: [],
                prompts: [],
                agents: [],
            });
        });

        it('should export models', async () => {
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

            const result = await serializer.toJSON();
            expect(result.models).toHaveLength(1);
            expect(result.models[0].model_name).toBe('gpt-4');
            expect(result.models[0].stream_usage).toBe(true);
        });

        it('should export prompts with content', async () => {
            await storage.insertPrompt({ id: 'prompt-1', name: 'system' }, 'You are helpful', 'Initial version');

            const result = await serializer.toJSON();
            expect(result.prompts).toHaveLength(1);
            expect(result.prompts[0].name).toBe('system');
            expect(result.prompts[0].content).toBe('You are helpful');
            expect(result.prompts[0].change_note).toBe('Initial version');
        });

        it('should export agents with middlewares', async () => {
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
            await storage.insertPrompt({ id: 'prompt-1', name: 'system' }, 'test');
            await storage.insertMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth',
            });
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': { custom: 'param' } },
            });

            const result = await serializer.toJSON();
            expect(result.agents).toHaveLength(1);
            expect(result.agents[0].name).toBe('Test');
            expect(result.agents[0].middlewares['mid-1']).toEqual({ custom: 'param' });
        });

        it('should export complete package', async () => {
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
            await storage.insertPrompt({ id: 'prompt-1', name: 'system' }, 'test');
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            const result = await serializer.toJSON();
            expect(result.models).toHaveLength(1);
            expect(result.prompts).toHaveLength(1);
            expect(result.agents).toHaveLength(1);
        });
    });

    describe('fromJSON', () => {
        it('should import empty package', async () => {
            await serializer.fromJSON({
                models: [],
                prompts: [],
                agents: [],
            });

            const result = await serializer.toJSON();
            expect(result).toEqual({
                models: [],
                prompts: [],
                agents: [],
            });
        });

        it('should import models', async () => {
            await serializer.fromJSON({
                models: [
                    {
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
                    },
                ],
                prompts: [],
                agents: [],
            });

            const model = await storage.getModel('model-1');
            expect(model).toBeDefined();
            expect(model?.model_name).toBe('gpt-4');
        });

        it('should import prompts with content', async () => {
            await serializer.fromJSON({
                models: [],
                prompts: [
                    {
                        id: 'prompt-1',
                        name: 'system',
                        content: 'You are helpful',
                        change_note: 'Initial',
                    },
                ],
                agents: [],
            });

            const prompt = await storage.getPromptWithCurrentVersion('prompt-1');
            expect(prompt).toBeDefined();
            expect(prompt?.name).toBe('system');
            expect(prompt?.content).toBe('You are helpful');
        });

        it('should import agents with dependencies', async () => {
            await storage.insertMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth',
            });

            await serializer.fromJSON({
                models: [
                    {
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
                    },
                ],
                prompts: [
                    {
                        id: 'prompt-1',
                        name: 'system',
                        content: 'test',
                    },
                ],
                agents: [
                    {
                        id: 'agent-1',
                        name: 'Test',
                        description: 'Test',
                        system_prompt: 'prompt-1',
                        model: 'model-1',
                        middlewares: { 'mid-1': false },
                    },
                ],
            });

            const agent = await storage.getAgent('agent-1');
            expect(agent).toBeDefined();
            expect(agent?.name).toBe('Test');
            expect(agent?.middlewares['mid-1']).toBe(false);
        });

        it('should reject invalid schema', async () => {
            await expect(
                serializer.fromJSON({
                    models: [{ id: 'invalid' } as any],
                    prompts: [],
                    agents: [],
                }),
            ).rejects.toThrow('Invalid AgentPackage data');
        });

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

            // Try to import with duplicate id
            await expect(
                serializer.fromJSON({
                    models: [
                        {
                            id: 'model-1',
                            model_name: 'gpt-3.5',
                            provider_id: 'openai',
                            stream_usage: true,
                            enable_thinking: false,
                            temperature: 0.7,
                            max_tokens: 2000,
                            top_p: 1.0,
                            frequency_penalty: 0.0,
                            presence_penalty: 0.0,
                        },
                    ],
                    prompts: [],
                    agents: [],
                }),
            ).rejects.toThrow();

            // Verify original model unchanged
            const model = await storage.getModel('model-1');
            expect(model?.model_name).toBe('gpt-4');
        });
    });

    describe('Round-trip', () => {
        it('should export and import without data loss', async () => {
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
            await storage.insertPrompt({ id: 'prompt-1', name: 'system' }, 'test', 'v1');
            await storage.insertMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth',
            });
            await storage.insertAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': { custom: 'param' } },
            });

            // Export
            const exported = await serializer.toJSON();

            // Clear storage
            await storage.close();
            storage = new MemoryStorage();
            serializer = new AgentSerializer(storage);

            // Pre-create middlewares (they are not serialized)
            await storage.insertMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth',
            });

            // Import
            await serializer.fromJSON(exported);

            // Verify
            const reimported = await serializer.toJSON();
            expect(reimported.models).toEqual(exported.models);
            expect(reimported.prompts).toEqual(exported.prompts);
            expect(reimported.agents).toEqual(exported.agents);
        });
    });
});
