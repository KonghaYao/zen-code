import { describe, it, expect, beforeEach } from 'vitest';
import { AgentValidator } from '../validator.js';
import { MemoryStorage } from '../storage/memory.js';
import type { IStorage } from '../storage/abstract.js';

describe('AgentValidator', () => {
    let storage: IStorage;
    let validator: AgentValidator;

    beforeEach(async () => {
        storage = new MemoryStorage();
        validator = new AgentValidator(storage);

        // Setup base data
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

    it('should validate a valid agent', async () => {
        await storage.insertAgent({
            id: 'agent-1',
            name: 'Test Agent',
            description: 'Test',
            system_prompt: 'prompt-1',
            model: 'model-1',
            middlewares: { 'mid-1': true },
        });

        const result = await validator.validateAgent('agent-1');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should detect missing agent', async () => {
        const result = await validator.validateAgent('missing-agent');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Agent missing-agent not found');
    });

    it('should detect missing model', async () => {
        await storage.insertAgent({
            id: 'agent-1',
            name: 'Test',
            description: 'Test',
            system_prompt: 'prompt-1',
            model: 'model-1',
            middlewares: {},
        });

        // Directly manipulate storage to simulate orphaned reference
        const memStorage = storage as any;
        const agent = memStorage.agents.get('agent-1');
        agent.model_id = 'non-existent-model';

        const result = await validator.validateAgent('agent-1');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e: string) => e.includes('Model non-existent-model not found'))).toBe(true);
    });

    it('should detect missing prompt', async () => {
        await storage.insertAgent({
            id: 'agent-1',
            name: 'Test',
            description: 'Test',
            system_prompt: 'prompt-1',
            model: 'model-1',
            middlewares: {},
        });

        // Directly manipulate storage to simulate orphaned reference
        const memStorage = storage as any;
        const agent = memStorage.agents.get('agent-1');
        agent.system_prompt_id = 'non-existent-prompt';

        const result = await validator.validateAgent('agent-1');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e: string) => e.includes('Prompt non-existent-prompt not found'))).toBe(true);
    });

    it('should detect missing middleware', async () => {
        await storage.insertAgent({
            id: 'agent-1',
            name: 'Test',
            description: 'Test',
            system_prompt: 'prompt-1',
            model: 'model-1',
            middlewares: { 'mid-1': true },
        });

        // Delete middleware
        await storage.deleteMiddleware('mid-1');

        const result = await validator.validateAgent('agent-1');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e: string) => e.includes('Middleware mid-1 not found'))).toBe(true);
    });

    it('should detect multiple errors', async () => {
        await storage.insertAgent({
            id: 'agent-1',
            name: 'Test',
            description: 'Test',
            system_prompt: 'prompt-1',
            model: 'model-1',
            middlewares: { 'mid-1': true },
        });

        // Delete dependencies
        await storage.deleteMiddleware('mid-1');

        const result = await validator.validateAgent('agent-1');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should validate all agents', async () => {
        await storage.insertAgent({
            id: 'agent-1',
            name: 'Valid Agent',
            description: 'Test',
            system_prompt: 'prompt-1',
            model: 'model-1',
            middlewares: { 'mid-1': true },
        });

        await storage.insertAgent({
            id: 'agent-2',
            name: 'Invalid Agent',
            description: 'Test',
            system_prompt: 'prompt-1',
            model: 'model-1',
            middlewares: { 'mid-1': true },
        });

        // Break agent-2
        await storage.deleteMiddleware('mid-1');

        const results = await validator.validateAll();
        expect(results.size).toBe(2);
        expect(results.get('agent-1')?.valid).toBe(false); // mid-1 deleted
        expect(results.get('agent-2')?.valid).toBe(false);
    });
});
