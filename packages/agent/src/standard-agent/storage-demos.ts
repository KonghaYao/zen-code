/**
 * Storage System - Usage Demos
 *
 * Demonstrates how to use different storage backends (Memory, SQLite, etc.)
 * with the Agent system.
 */

import { AgentPackage } from './package.js';
import { InjectedAgentPackage, createInjectedAgentPackage } from './storage/persistence.js';
import { MemoryStorage } from './storage/memory.js';
import { AgentStorage } from './storage/dal.js';
import { IStorage, BaseStorage } from './storage/abstract.js';

// ============================================================
// Demo 1: Memory Storage (In-Memory, No Persistence)
// ============================================================

export function demo1_memoryStorage() {
    console.log('=== Demo 1: Memory Storage ===');

    // Create a storage instance (in-memory only)
    const storage = new MemoryStorage();

    // Create an AgentPackage backed by memory storage
    const pkg = new InjectedAgentPackage({ storage });

    // Add resources (persisted to memory)
    pkg.persistModel({
        id: 'gpt-4',
        model_name: 'gpt-4',
        model_provider: 'openai',
        stream_usage: true,
        enable_thinking: false,
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });

    pkg.persistPrompt({
        id: 'test-prompt',
        name: 'Test Prompt',
        content: 'You are a helpful assistant.',
    });

    // Query the data
    const model = pkg.getStorage().getModel('gpt-4');
    console.log('Model loaded:', model?.model_name);
    console.log('All prompts:', pkg.getStorage().getAllPrompts().map(p => p.name));

    // Close storage
    storage.close();
    console.log('✅ Memory storage demo complete (data lost after close)\n');
}

// ============================================================
// Demo 2: SQLite Storage (Persistent)
// ============================================================

export async function demo2_sqliteStorage() {
    console.log('=== Demo 2: SQLite Storage ===');

    // Create an AgentPackage backed by SQLite
    const pkg = createInjectedAgentPackage('./test-agents.db');

    // Add resources
    pkg.persistModel({
        id: 'claude-3',
        model_name: 'claude-3-5-sonnet',
        model_provider: 'anthropic',
        stream_usage: true,
        enable_thinking: true,
        temperature: 0.5,
        max_tokens: 8000,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });

    pkg.persistPrompt({
        id: 'claude-prompt',
        name: 'Claude Prompt',
        content: 'You are Claude, an AI assistant by Anthropic.',
    });

    pkg.persistTool({
        id: 'read-file',
        name: 'read_file',
        description: 'Read the contents of a file',
    });

    pkg.persistAgent({
        id: 'claude-agent',
        name: 'Claude Agent',
        description: 'Anthropic Claude agent',
        system_prompt: 'claude-prompt',
        model: 'claude-3',
        tools: { 'read-file': true },
        middleware: {},
    });

    // Verify data was persisted
    const agent = pkg.getAgent('claude-agent');
    console.log('Agent:', agent?.name);
    console.log('All agents:', pkg.listAgents().map(a => a.name));

    // Close storage
    pkg.getStorage().close();
    console.log('✅ SQLite storage demo complete (data persisted to ./test-agents.db)\n');

    // Cleanup test database
    const fs = await import('fs');
    try {
        fs.unlinkSync('./test-agents.db');
        fs.unlinkSync('./test-agents.db-wal');
        fs.unlinkSync('./test-agents.db-shm');
    } catch (e) {
        // Ignore if files don't exist
    }
}

// ============================================================
// Demo 3: Custom Storage Implementation
// ============================================================

/**
 * Example: A custom storage backend that writes to console (for logging)
 */
class ConsoleStorage extends BaseStorage implements IStorage {
    private models: Map<string, any> = new Map();
    private prompts: Map<string, any> = new Map();
    private tools: Map<string, any> = new Map();
    private middlewares: Map<string, any> = new Map();
    private agents: Map<string, any> = new Map();

    close(): void {
        console.log('📁 ConsoleStorage: Closing...');
    }

    transaction<T>(fn: () => T): T {
        console.log('📁 ConsoleStorage: Starting transaction');
        try {
            const result = fn();
            console.log('📁 ConsoleStorage: Transaction committed');
            return result;
        } catch (error) {
            console.log('📁 ConsoleStorage: Transaction rolled back');
            throw error;
        }
    }

    // Implement required methods (logging to console)
    insertModel(data: any): void {
        console.log('📁 ConsoleStorage: Inserting model', data.id);
        this.models.set(data.id, { ...data, created_at: this.now(), updated_at: this.now() });
    }

    getModel(id: string): any {
        return this.models.get(id);
    }

    getAllModels(): any[] {
        return Array.from(this.models.values());
    }

    updateModel(data: any): void {
        console.log('📁 ConsoleStorage: Updating model', data.id);
        this.models.set(data.id, { ...this.models.get(data.id), ...data, updated_at: this.now() });
    }

    deleteModel(id: string): void {
        console.log('📁 ConsoleStorage: Deleting model', id);
        this.models.delete(id);
    }

    insertPrompt(data: any): void {
        console.log('📁 ConsoleStorage: Inserting prompt', data.id);
        this.prompts.set(data.id, { ...data, created_at: this.now(), updated_at: this.now() });
    }

    getPrompt(id: string): any {
        return this.prompts.get(id);
    }

    getPromptByName(name: string): any {
        return Array.from(this.prompts.values()).find(p => p.name === name);
    }

    getAllPrompts(): any[] {
        return Array.from(this.prompts.values());
    }

    updatePrompt(data: any): void {
        console.log('📁 ConsoleStorage: Updating prompt', data.id);
        this.prompts.set(data.id, { ...this.prompts.get(data.id), ...data, updated_at: this.now() });
    }

    deletePrompt(id: string): void {
        console.log('📁 ConsoleStorage: Deleting prompt', id);
        this.prompts.delete(id);
    }

    insertTool(data: any): void {
        console.log('📁 ConsoleStorage: Inserting tool', data.id);
        this.tools.set(data.id, { ...data, created_at: this.now(), updated_at: this.now() });
    }

    getTool(id: string): any {
        return this.tools.get(id);
    }

    getAllTools(): any[] {
        return Array.from(this.tools.values());
    }

    updateTool(data: any): void {
        console.log('📁 ConsoleStorage: Updating tool', data.id);
        this.tools.set(data.id, { ...this.tools.get(data.id), ...data, updated_at: this.now() });
    }

    deleteTool(id: string): void {
        console.log('📁 ConsoleStorage: Deleting tool', id);
        this.tools.delete(id);
    }

    insertMiddleware(data: any): void {
        console.log('📁 ConsoleStorage: Inserting middleware', data.id);
        this.middlewares.set(data.id, { ...data, created_at: this.now(), updated_at: this.now() });
    }

    getMiddleware(id: string): any {
        return this.middlewares.get(id);
    }

    getAllMiddlewares(): any[] {
        return Array.from(this.middlewares.values());
    }

    updateMiddleware(data: any): void {
        console.log('📁 ConsoleStorage: Updating middleware', data.id);
        this.middlewares.set(data.id, { ...this.middlewares.get(data.id), ...data, updated_at: this.now() });
    }

    deleteMiddleware(id: string): void {
        console.log('📁 ConsoleStorage: Deleting middleware', id);
        this.middlewares.delete(id);
    }

    insertAgent(data: any): void {
        console.log('📁 ConsoleStorage: Inserting agent', data.id);
        this.agents.set(data.id, { ...data, created_at: this.now(), updated_at: this.now() });
    }

    getAgent(id: string): any {
        const agent = this.agents.get(id);
        if (!agent) return undefined;
        return { ...agent, tools: data?.tools || {}, middlewares: data?.middlewares || {} };
    }

    getAllAgents(): any[] {
        return Array.from(this.agents.values()).map(a => ({
            ...a,
            tools: a.tools || {},
            middlewares: a.middlewares || {},
        }));
    }

    updateAgent(data: any): void {
        console.log('📁 ConsoleStorage: Updating agent', data.id);
        this.agents.set(data.id, { ...this.agents.get(data.id), ...data, updated_at: this.now() });
    }

    deleteAgent(id: string): void {
        console.log('📁 ConsoleStorage: Deleting agent', id);
        this.agents.delete(id);
    }

    getAgentWithDependencies(id: string): any {
        const agent = this.agents.get(id);
        if (!agent) return undefined;
        const model = this.models.get(agent.model);
        const systemPrompt = this.prompts.get(agent.system_prompt);
        return {
            agent,
            model,
            systemPrompt,
            tools: [],
            middlewares: [],
        };
    }
}

export function demo3_customStorage() {
    console.log('=== Demo 3: Custom Storage Implementation ===');

    // Create custom storage
    const customStorage = new ConsoleStorage();

    // Create an AgentPackage backed by custom storage
    const pkg = new InjectedAgentPackage({ storage: customStorage });

    // Add resources (will log to console)
    pkg.persistModel({
        id: 'custom-model',
        model_name: 'custom-model',
        model_provider: 'custom',
        stream_usage: false,
        enable_thinking: false,
        temperature: 0.5,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });

    pkg.persistPrompt({
        id: 'custom-prompt',
        name: 'Custom Prompt',
        content: 'You are a custom agent.',
    });

    console.log('✅ Custom storage demo complete\n');
}

// ============================================================
// Demo 4: Import/Export Between Storage Backends
// ============================================================

export async function demo4_importExport() {
    console.log('=== Demo 4: Import/Export Between Storage Backends ===');

    // Step 1: Create an in-memory AgentPackage
    const memoryPkg = new AgentPackage();

    memoryPkg.addModel({
        id: 'gpt-4',
        model_name: 'gpt-4',
        model_provider: 'openai',
        stream_usage: true,
        enable_thinking: false,
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });

    memoryPkg.addPrompt({
        id: 'demo-prompt',
        name: 'Demo Prompt',
        content: 'You are a demo assistant.',
    });

    memoryPkg.addAgent({
        id: 'demo-agent',
        name: 'Demo Agent',
        description: 'A demo agent',
        system_prompt: 'demo-prompt',
        model: 'gpt-4',
        tools: {},
        middleware: {},
    });

    console.log('Memory package created with', memoryPkg.listAgents().length, 'agent(s)');

    // Step 2: Import to SQLite storage
    const sqlitePkg = createInjectedAgentPackage('./import-test.db');
    sqlitePkg.importAgentPackage(memoryPkg);

    console.log('Imported to SQLite:', sqlitePkg.listAgents().map(a => a.name));

    // Step 3: Export back to memory
    const exportedPkg = sqlitePkg.exportToAgentPackage();
    console.log('Exported back to memory:', exportedPkg.listAgents().map(a => a.name));

    // Cleanup
    sqlitePkg.getStorage().close();
    const fs = await import('fs');
    try {
        fs.unlinkSync('./import-test.db');
        fs.unlinkSync('./import-test.db-wal');
        fs.unlinkSync('./import-test.db-shm');
    } catch (e) {
        // Ignore
    }

    console.log('✅ Import/Export demo complete\n');
}

// ============================================================
// Main - Run all demos
// ============================================================

export async function runAllStorageDemos() {
    console.log('========================================');
    console.log('Storage System - Demo Collection');
    console.log('========================================\n');

    demo1_memoryStorage();
    await demo2_sqliteStorage();
    demo3_customStorage();
    await demo4_importExport();

    console.log('========================================');
    console.log('All storage demos completed!');
    console.log('========================================');
}

// Run demos if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllStorageDemos().catch(console.error);
}
