import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRepository } from '../repository.js';
import { MemoryStorage } from '../storage/memory.js';
import type { IStorage } from '../storage/abstract.js';

describe('AgentRepository', () => {
    let storage: IStorage;
    let repository: AgentRepository;

    beforeEach(() => {
        storage = new MemoryStorage();
        repository = new AgentRepository(storage);
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

        it('should add and get a model', async () => {
            await repository.addModel(mockModel);
            const result = await repository.getModel('model-1');
            expect(result).toBeDefined();
            expect(result?.model_name).toBe('gpt-4');
            expect(result?.stream_usage).toBe(true);
        });

        it('should list all models', async () => {
            await repository.addModel(mockModel);
            await repository.addModel({ ...mockModel, id: 'model-2', model_name: 'gpt-3.5' });
            const models = await repository.listModels();
            expect(models).toHaveLength(2);
        });

        it('should update a model', async () => {
            await repository.addModel(mockModel);
            await repository.updateModel({ ...mockModel, temperature: 0.9 });
            const result = await repository.getModel('model-1');
            expect(result?.temperature).toBe(0.9);
        });

        it('should delete a model', async () => {
            await repository.addModel(mockModel);
            await repository.deleteModel('model-1');
            const result = await repository.getModel('model-1');
            expect(result).toBeUndefined();
        });
    });

    describe('Prompts', () => {
        const mockPromptData = {
            id: 'prompt-1',
            name: 'system-prompt',
        };
        const mockContent = 'You are a helpful assistant';

        it('should add and get a prompt', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            const result = await repository.getPrompt('prompt-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('system-prompt');
        });

        it('should get prompt with content', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            const result = await repository.getPromptWithContent('prompt-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('system-prompt');
            expect(result?.content).toBe(mockContent);
        });

        it('should get prompt by name', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            const result = await repository.getPromptByName('system-prompt');
            expect(result).toBeDefined();
            expect(result?.id).toBe('prompt-1');
        });

        it('should get prompt by name with content', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            const result = await repository.getPromptByNameWithContent('system-prompt');
            expect(result).toBeDefined();
            expect(result?.id).toBe('prompt-1');
            expect(result?.content).toBe(mockContent);
        });

        it('should list all prompts', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            await repository.addPrompt({ id: 'prompt-2', name: 'prompt-2' }, 'Content 2');
            const prompts = await repository.listPrompts();
            expect(prompts).toHaveLength(2);
        });

        it('should update prompt name', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            await repository.updatePrompt({ ...mockPromptData, name: 'new-name' });
            const result = await repository.getPromptByName('new-name');
            expect(result).toBeDefined();
        });

        it('should delete a prompt', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            await repository.deletePrompt('prompt-1');
            const result = await repository.getPrompt('prompt-1');
            expect(result).toBeUndefined();
        });

        it('should create new version', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            const v2 = await repository.createPromptVersion('prompt-1', 'Updated content', 'v2');
            expect(v2.version).toBe(2);

            const withContent = await repository.getPromptWithContent('prompt-1');
            expect(withContent?.content).toBe('Updated content');
        });

        it('should rollback to previous version', async () => {
            await repository.addPrompt(mockPromptData, mockContent);
            await repository.createPromptVersion('prompt-1', 'Version 2');
            await repository.createPromptVersion('prompt-1', 'Version 3');

            await repository.rollbackPromptVersion('prompt-1', 1);

            const withContent = await repository.getPromptWithContent('prompt-1');
            expect(withContent?.content).toBe(mockContent);
            expect(withContent?.current_version).toBe(1);
        });
    });

    describe('Middlewares', () => {
        const mockMiddleware = {
            id: 'mid-1',
            name: 'auth',
            description: 'Authentication middleware',
        };

        it('should add and get a middleware', async () => {
            await repository.addMiddleware(mockMiddleware);
            const result = await repository.getMiddleware('mid-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('auth');
        });

        it('should list all middlewares', async () => {
            await repository.addMiddleware(mockMiddleware);
            await repository.addMiddleware({ ...mockMiddleware, id: 'mid-2', name: 'logging' });
            const middlewares = await repository.listMiddlewares();
            expect(middlewares).toHaveLength(2);
        });

        it('should update a middleware', async () => {
            await repository.addMiddleware(mockMiddleware);
            await repository.updateMiddleware({ ...mockMiddleware, description: 'Updated' });
            const result = await repository.getMiddleware('mid-1');
            expect(result?.description).toBe('Updated');
        });

        it('should delete a middleware', async () => {
            await repository.addMiddleware(mockMiddleware);
            await repository.deleteMiddleware('mid-1');
            const result = await repository.getMiddleware('mid-1');
            expect(result).toBeUndefined();
        });
    });

    describe('Agents', () => {
        beforeEach(async () => {
            await repository.addModel({
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
            await repository.addPrompt({ id: 'prompt-1', name: 'system' }, 'You are helpful');
            await repository.addMiddleware({
                id: 'mid-1',
                name: 'auth',
                description: 'Auth middleware',
            });
        });

        it('should add and get an agent', async () => {
            await repository.addAgent({
                id: 'agent-1',
                name: 'Test Agent',
                description: 'A test agent',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': false },
            });

            const result = await repository.getAgent('agent-1');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Agent');
            expect(result?.middlewares['mid-1']).toEqual({ enabled: false });
        });

        it('should list all agents', async () => {
            await repository.addAgent({
                id: 'agent-1',
                name: 'Agent 1',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });
            await repository.addAgent({
                id: 'agent-2',
                name: 'Agent 2',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            const agents = await repository.listAgents();
            expect(agents).toHaveLength(2);
        });

        it('should update an agent', async () => {
            await repository.addAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            await repository.updateAgent({
                id: 'agent-1',
                name: 'Updated',
                description: 'Updated desc',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': true },
            });

            const result = await repository.getAgent('agent-1');
            expect(result?.name).toBe('Updated');
            expect(result?.middlewares['mid-1']).toEqual({ enabled: true });
        });

        it('should delete an agent', async () => {
            await repository.addAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: {},
            });

            await repository.deleteAgent('agent-1');
            const result = await repository.getAgent('agent-1');
            expect(result).toBeUndefined();
        });

        it('should get agent with dependencies', async () => {
            await repository.addAgent({
                id: 'agent-1',
                name: 'Test',
                description: 'Test',
                system_prompt: 'prompt-1',
                model: 'model-1',
                middlewares: { 'mid-1': true },
            });

            const result = await repository.getAgentWithDependencies('agent-1');
            expect(result).toBeDefined();
            expect(result?.agent.name).toBe('Test');
            expect(result?.model.model_name).toBe('gpt-4');
            expect(result?.systemPrompt.name).toBe('system');
        });
    });
});
