/**
 * Bun Native Example: SQLite-based Standard Agent System
 *
 * This is a minimal example showing how to use the SQLite storage
 * system with Bun's native `bun:sqlite` module.
 *
 * Run with Bun:
 *   bun run src/standard-agent/storage/bun-native-example.ts
 */

import { createInjectedAgentPackage } from '../index.js';
import { z } from 'zod';

// ========================================
// 1. Create SQLite-backed AgentPackage
// ========================================
const dbPath = './agents-bun.db';
const pkg = createInjectedAgentPackage(dbPath);

console.log('✓ Created InjectedAgentPackage with bun:sqlite');

// ========================================
// 2. Register Tool Implementation
// ========================================
pkg.registerToolImplementation({
    id: 'fs/read',
    name: 'read_file',
    description: 'Read file contents',
    paramsSchema: z.object({ path: z.string() }),
    async execute(params) {
        console.log(`Reading file: ${params.path}`);
        return `Content of ${params.path}`;
    },
});

console.log('✓ Registered tool implementation');

// ========================================
// 3. Persist Schemas to SQLite
// ========================================

pkg.persistModel({
    id: 'model-gpt4',
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

pkg.persistPrompt({
    id: 'prompt-assistant',
    name: 'assistant',
    content: 'You are a helpful AI assistant.',
});

pkg.persistTool({
    id: 'fs/read',
    name: 'read_file',
    description: 'Read file contents from disk',
});

pkg.persistAgent({
    id: 'agent-assistant',
    name: 'Assistant Agent',
    description: 'A helpful assistant agent',
    system_prompt: 'prompt-assistant',
    model: 'model-gpt4',
    tools: { 'fs/read': true },
    middleware: {},
});

console.log('✓ Persisted schemas to SQLite');

// ========================================
// 4. Query and Use
// ========================================
const agent = pkg.getAgent('agent-assistant');
console.log(`✓ Loaded agent: ${agent?.name}`);
console.log(`  Model: ${agent?.modelId}`);
console.log(`  Tools: ${Object.keys(agent?.tools || {})}`);

// ========================================
// 5. Execute Tool
// ========================================
const result = await pkg.tools.execute('fs/read', { path: '/tmp/test.txt' });
console.log(`✓ Tool result: ${result}`);

// ========================================
// 6. Export to Memory
// ========================================
const memoryPkg = pkg.exportToAgentPackage();
console.log(`✓ Exported ${memoryPkg.listAgents().length} agents to memory`);

// ========================================
// Cleanup
// ========================================
pkg.close();

console.log('\n✓ Demo completed successfully!');
console.log(`📁 Database created at: ${dbPath}`);
