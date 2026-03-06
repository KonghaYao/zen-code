import { describe, it, expect, beforeEach } from 'vitest';
import { AgentPackage } from '../package.js';
import { MemoryStorage } from '../storage/memory.js';
import type { IStorage } from '../storage/abstract.js';

describe('AgentPackage', () => {
    let storage: IStorage;
    let pkg: AgentPackage;

    beforeEach(() => {
        storage = new MemoryStorage();
        pkg = new AgentPackage(storage);
    });

    describe('Construction', () => {
        it('should create instance with storage', () => {
            expect(pkg).toBeDefined();
            expect(pkg.storage).toBe(storage);
            expect(pkg.repository).toBeDefined();
            expect(pkg.validator).toBeDefined();
            expect(pkg.serializer).toBeDefined();
            expect(pkg.middlewares).toBeDefined();
        });

        it('should have bound proxy methods', () => {
            expect(typeof pkg.getModel).toBe('function');
            expect(typeof pkg.listModels).toBe('function');
            expect(typeof pkg.validateAgent).toBe('function');
            expect(typeof pkg.toJSON).toBe('function');
        });
    });

    describe('Model Operations', () => {
        const mockModel = {
            id: 'model-1',
            name: 'GPT-4',
            provider_id: 'openai',
            model_name: 'gpt-4',
            stream_usage: true,
            enable_thinking: false,
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        };

        it('should add and get model', async () => {
            await pkg.addModel(mockModel);
            const result = await pkg.getModel('model-1');
            expect(result).toBeDefined();
            expect(result?.model_name).toBe('gpt-4');
        });

        it('should list all models', async () => {
            await pkg.addModel(mockModel);
            await pkg.addModel({ ...mockModel, id: 'model-2', model_name: 'gpt-3.5' });
            const models = await pkg.listModels();
            expect(models).toHaveLength(2);
        });
    });

    describe('Prompt Operations', () => {
        const mockPromptData = {
            id: 'prompt-1',
            name: 'system-prompt',
        };
        const mockContent = 'You are a helpful assistant';

        it('should add and get prompt', async () => {
            await pkg.addPrompt(mockPromptData, mockContent);
            const result = await pkg.getPrompt('prompt-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('system-prompt');
        });

        it('should get prompt by name', async () => {
            await pkg.addPrompt(mockPromptData, mockContent);
            const result = await pkg.getPromptByName('system-prompt');
            expect(result).toBeDefined();
            expect(result?.id).toBe('prompt-1');
        });

        it('should list all prompts', async () => {
            await pkg.addPrompt(mockPromptData, mockContent);
            await pkg.addPrompt({ id: 'prompt-2', name: 'prompt-2' }, 'Content 2');
            const prompts = await pkg.listPrompts();
            expect(prompts).toHaveLength(2);
        });
    });

    describe('Middleware Operations', () => {
        const mockMiddleware = {
            id: 'mid-1',
            name: 'auth',
            description: 'Authentication middleware',
        };

        it('should add and get middleware', async () => {
            await pkg.addMiddleware(mockMiddleware);
            const result = await pkg.getMiddleware('mid-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('auth');
        });

        it('should register middleware in registry', async () => {
            await pkg.addMiddleware(mockMiddleware);
            const schema = pkg.middlewares.getSchema('mid-1');
            expect(schema).toBeDefined();
            expect(schema?.name).toBe('auth');
        });

        it('should list all middlewares', async () => {
            await pkg.addMiddleware(mockMiddleware);
            await pkg.addMiddleware({ ...mockMiddleware, id: 'mid-2', name: 'logging' });
            const middlewares = await pkg.listMiddlewares();
            expect(middlewares).toHaveLength(2);
        });
    });

    describe('Agent Operations', () => {
        beforeEach(async () => {
            await pkg.addModel({
                id: 'model-1',
                name: 'GPT-4',
                provider_id: 'openai',
                model_name: 'gpt-4',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await pkg.addPrompt({ id: 'prompt-1', name: 'system' }, 'You are helpful');
            await pkg.addMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth middleware',
            });
        });

        it('should add and get agent', async () => {
            await pkg.addAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': false },
            });

            const result = await pkg.getAgent('agent-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Agent');
            expect(result?.middlewares['mid-1']).toEqual({ enabled: false });
        });

        it('should list all agents', async () => {
            await pkg.addAgent({
                id: 'agent-1',
                name: 'Agent 1',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });
            await pkg.addAgent({
                id: 'agent-2',
                name: 'Agent 2',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            const agents = await pkg.listAgents();
            expect(agents).toHaveLength(2);
        });
    });

    describe('Validation', () => {
        beforeEach(async () => {
            await pkg.addModel({
                id: 'model-1',
                name: 'GPT-4',
                provider_id: 'openai',
                model_name: 'gpt-4',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await pkg.addPrompt({ id: 'prompt-1', name: 'system' }, 'test');
            await pkg.addMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth',
            });
            await pkg.addAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': true },
            });
        });

        it('should validate valid agent', async () => {
            const result = await pkg.validateAgent('agent-1');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate all agents', async () => {
            const results = await pkg.validateAll();
            expect(results.size).toBeGreaterThan(0);
            expect(results.get('agent-1')?.valid).toBe(true);
        });
    });

    describe('Serialization', () => {
        beforeEach(async () => {
            await pkg.addModel({
                id: 'model-1',
                name: 'GPT-4',
                provider_id: 'openai',
                model_name: 'gpt-4',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await pkg.addPrompt({ id: 'prompt-1', name: 'system' }, 'test');
            await pkg.addMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth',
            });
            await pkg.addAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': true },
            });
        });

        it('should export to JSON', async () => {
            const json = await pkg.toJSON();
            expect(json.models).toHaveLength(1);
            expect(json.prompts).toHaveLength(1);
            expect(json.agents).toHaveLength(1);
        });
    });

    describe('Factory Methods', () => {
        it('should create from storage', async () => {
            await storage.insertModel({
                id: 'model-1',
                name: 'GPT-4',
                provider_id: 'openai',
                model_name: 'gpt-4',
                stream_usage: true,
                enable_thinking: false,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
            });
            await storage.insertMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth',
            });

            const loaded = await AgentPackage.fromStorage(storage);
            expect(loaded.middlewares.getSchema('mid-1')).toBeDefined();
        });

        it('should load from JSON', async () => {
            const pkg2 = await AgentPackage.loadFromJSON(storage, {
                models: [
                    {
                        id: 'model-1',
                        name: 'GPT-4',
                        provider_id: 'openai',
                        model_name: 'gpt-4',
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
                agents: [],
            });

            const model = await pkg2.getModel('model-1');
            expect(model).toBeDefined();
            expect(model?.model_name).toBe('gpt-4');
        });
    });
});
