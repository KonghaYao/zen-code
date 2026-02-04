/**
 * Standard Agent System - Usage Demos
 *
 * This file demonstrates how to use the agent system for various scenarios.
 */

import { AgentPackage } from './package.js';
import type { ToolImplementation, MiddlewareImplementation } from './index.js';
import { z } from 'zod';

// Import storage demos
export * from './storage-demos.js';

// ============================================================
// Demo 1: Basic Agent Setup - Code Review Agent
// ============================================================

export function demo1_basicCodeReviewAgent() {
    // Create a new agent package
    const pkg = new AgentPackage();

    // Step 1: Define a Model
    pkg.addModel({
        id: 'gpt-4-model',
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

    // Step 2: Define a System Prompt
    pkg.addPrompt({
        id: 'code-review-prompt',
        name: 'Code Review System Prompt',
        content: `You are an expert code reviewer. Analyze code for:
1. Bugs and potential errors
2. Performance issues
3. Security vulnerabilities
4. Code style and best practices

Provide clear, actionable feedback with code examples.`,
        metadata: { version: '1.0' },
    });

    // Step 3: Define Tools (schemas only)
    pkg.addTool({
        id: 'read-file',
        name: 'read_file',
        description: 'Read the contents of a file',
    });

    pkg.addTool({
        id: 'write-file',
        name: 'write_file',
        description: 'Write content to a file',
    });

    // Step 4: Define Middlewares (schemas only)
    pkg.addMiddleware({
        id: 'logging',
        name: 'Logging Middleware',
        description: 'Logs all agent interactions',
    });

    // Step 5: Create an Agent
    pkg.addAgent({
        id: 'code-reviewer',
        name: 'Code Review Agent',
        description: 'Specialized agent for reviewing code quality',
        system_prompt: 'code-review-prompt',
        model: 'gpt-4-model',
        tools: {
            'read-file': true,  // Enable this tool
            'write-file': false, // Disable this tool
        },
        middleware: {
            'logging': true,  // Enable logging
        },
    });

    // Step 6: Validate the agent configuration
    const validation = pkg.validateAgent('code-reviewer');
    if (!validation.valid) {
        console.error('Agent validation failed:', validation.errors);
        return;
    }

    console.log('✅ Code Review Agent created successfully!');
    const agent = pkg.getAgent('code-reviewer');
    console.log('Agent:', agent?.name);
    console.log('Enabled tools:', Object.keys(agent?.tools || {}).filter(t => agent?.tools[t]?.enabled));
}

// ============================================================
// Demo 2: Tool with Implementation - Math Operations
// ============================================================

export async function demo2_toolWithImplementation() {
    const pkg = new AgentPackage();

    // Register tool schema
    pkg.addTool({
        id: 'math/calculate',
        name: 'calculate',
        description: 'Perform mathematical calculations',
    });

    // Register tool implementation
    const CalculateTool: ToolImplementation<{ operation: string; a: number; b: number }, number> = {
        id: 'math/calculate',
        name: 'calculate',
        description: 'Perform mathematical calculations',
        paramsSchema: z.object({
            operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
            a: z.number(),
            b: z.number(),
        }),
        execute: ({ operation, a, b }) => {
            switch (operation) {
                case 'add': return a + b;
                case 'subtract': return a - b;
                case 'multiply': return a * b;
                case 'divide': return b !== 0 ? a / b : NaN;
                default: throw new Error(`Unknown operation: ${operation}`);
            }
        },
    };

    pkg.tools.registerImplementation(CalculateTool);

    // Execute the tool
    const result1 = await pkg.tools.execute('math/calculate', { operation: 'add', a: 5, b: 3 });
    console.log('5 + 3 =', result1);

    const result2 = await pkg.tools.execute('math/calculate', { operation: 'multiply', a: 4, b: 7 });
    console.log('4 * 7 =', result2);

    // Test parameter validation (this will throw an error)
    try {
        await pkg.tools.execute('math/calculate', { operation: 'invalid', a: 1, b: 2 });
    } catch (error) {
        console.log('✅ Validation works:', error instanceof Error ? error.message : error);
    }
}

// ============================================================
// Demo 3: Middleware Chain - Pre/Post Processing
// ============================================================

export async function demo3_middlewareChain() {
    const pkg = new AgentPackage();

    // Define middleware schemas
    pkg.addMiddleware({
        id: 'auth/check',
        name: 'Auth Check',
        description: 'Verifies user authentication',
    });

    pkg.addMiddleware({
        id: 'logging',
        name: 'Request Logging',
        description: 'Logs all requests',
    });

    pkg.addMiddleware({
        id: 'rate-limit',
        name: 'Rate Limiting',
        description: 'Enforces rate limits',
    });

    // Implement middlewares
    const AuthMiddleware: MiddlewareImplementation<{ userId: string; token: string }, boolean> = {
        id: 'auth/check',
        name: 'Auth Check',
        description: 'Verifies user authentication',
        paramsSchema: z.object({
            userId: z.string(),
            token: z.string(),
        }),
        execute: ({ userId, token }) => {
            return token === 'secret-token';
        },
    };

    const LoggingMiddleware: MiddlewareImplementation<{ action: string; timestamp: number }, void> = {
        id: 'logging',
        name: 'Request Logging',
        description: 'Logs all requests',
        paramsSchema: z.object({
            action: z.string(),
            timestamp: z.number(),
        }),
        execute: ({ action, timestamp }) => {
            console.log(`[${new Date(timestamp).toISOString()}] ${action}`);
        },
    };

    pkg.middlewares.registerImplementation(AuthMiddleware);
    pkg.middlewares.registerImplementation(LoggingMiddleware);

    // Execute middleware chain
    console.log('--- Middleware Chain Execution ---');

    // 1. Log the request
    await pkg.middlewares.execute('logging', { action: 'user_request', timestamp: Date.now() });

    // 2. Check authentication
    const isAuthenticated = await pkg.middlewares.execute('auth/check', {
        userId: 'user123',
        token: 'secret-token',
    });

    console.log('Authenticated:', isAuthenticated ? '✅' : '❌');

    // 3. Log the response
    await pkg.middlewares.execute('logging', { action: 'response_sent', timestamp: Date.now() });
}

// ============================================================
// Demo 4: Complex Agent with Custom Tool Parameters
// ============================================================

export function demo4_complexAgentConfig() {
    const pkg = new AgentPackage();

    // Add resources
    pkg.addModel({
        id: 'claude-3-model',
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

    pkg.addPrompt({
        id: 'data-analyst-prompt',
        name: 'Data Analyst System Prompt',
        content: 'You are a data analyst specialized in processing and visualizing data.',
    });

    // Tools
    pkg.addTool({ id: 'db/query', name: 'query_database', description: 'Execute SQL queries' });
    pkg.addTool({ id: 'db/export', name: 'export_data', description: 'Export data to CSV' });
    pkg.addTool({ id: 'viz/chart', name: 'create_chart', description: 'Create visualizations' });

    // Create agent with custom tool parameters
    pkg.addAgent({
        id: 'data-analyst',
        name: 'Data Analyst',
        description: 'Analyzes data and creates visualizations',
        system_prompt: 'data-analyst-prompt',
        model: 'claude-3-model',
        tools: {
            'db/query': { enabled: true, customParams: { maxRows: 1000, timeout: 30 } },
            'db/export': { enabled: true, customParams: { format: 'csv', compression: true } },
            'viz/chart': false, // Disabled by default
        },
        middleware: {},
    });

    const agent = pkg.getAgent('data-analyst');

    // Check tool configurations
    console.log('Data Analyst Agent Tool Config:');
    console.log('db/query:', agent?.getToolConfig('db/query'));
    console.log('db/export:', agent?.getToolConfig('db/export'));
    console.log('viz/chart:', agent?.getToolConfig('viz/chart'));

    // Validate the entire package
    const validationResults = pkg.validateAll();
    console.log('\nValidation Results:');
    for (const [agentId, result] of validationResults.entries()) {
        console.log(`${agentId}: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
        if (!result.valid) {
            result.errors.forEach(err => console.log(`  - ${err}`));
        }
    }
}

// ============================================================
// Demo 5: Persistence - Save and Load Agent Package
// ============================================================

export function demo5_persistence() {
    // Create and populate a package
    const pkg = new AgentPackage();

    pkg.addModel({
        id: 'test-model',
        model_name: 'test-model',
        model_provider: 'test',
        stream_usage: false,
        enable_thinking: false,
        temperature: 0.5,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });

    pkg.addPrompt({
        id: 'test-prompt',
        name: 'Test Prompt',
        content: 'You are a test assistant.',
    });

    pkg.addAgent({
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        system_prompt: 'test-prompt',
        model: 'test-model',
        tools: {},
        middleware: {},
    });

    // Serialize to JSON
    const json = pkg.toJSON();
    console.log('Serialized Package:', JSON.stringify(json, null, 2));

    // Deserialize from JSON
    const loadedPkg = AgentPackage.fromJSON(json);
    console.log('\nLoaded Agents:', loadedPkg.listAgents().map(a => a.name));
}

// ============================================================
// Demo 6: Multiple Agents in One Package
// ============================================================

export function demo6_multipleAgents() {
    const pkg = new AgentPackage();

    // Shared resources
    pkg.addModel({
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

    // Different prompts for different agents
    pkg.addPrompt({
        id: 'writer-prompt',
        name: 'Writer Prompt',
        content: 'You are a creative writer. Write engaging content.',
    });

    pkg.addPrompt({
        id: 'translator-prompt',
        name: 'Translator Prompt',
        content: 'You are a professional translator. Maintain nuance and context.',
    });

    pkg.addPrompt({
        id: 'summarizer-prompt',
        name: 'Summarizer Prompt',
        content: 'You are an expert summarizer. Extract key points concisely.',
    });

    // Tools
    pkg.addTool({ id: 'read-file', name: 'read_file', description: 'Read a file' });
    pkg.addTool({ id: 'search', name: 'search_web', description: 'Search the web' });

    // Create multiple agents
    pkg.addAgent({
        id: 'writer',
        name: 'Content Writer',
        description: 'Creates engaging content',
        system_prompt: 'writer-prompt',
        model: 'gpt-4',
        tools: { 'read-file': true, 'search': true },
        middleware: {},
    });

    pkg.addAgent({
        id: 'translator',
        name: 'Translator',
        description: 'Translates between languages',
        system_prompt: 'translator-prompt',
        model: 'gpt-4',
        tools: { 'read-file': true, 'search': false },
        middleware: {},
    });

    pkg.addAgent({
        id: 'summarizer',
        name: 'Summarizer',
        description: 'Summarizes long documents',
        system_prompt: 'summarizer-prompt',
        model: 'gpt-4',
        tools: { 'read-file': true, 'search': true },
        middleware: {},
    });

    console.log('Package contains', pkg.listAgents().length, 'agents:');
    for (const agent of pkg.listAgents()) {
        console.log(`  - ${agent.name}: ${agent.description}`);
    }

    // Validate all agents
    const results = pkg.validateAll();
    const allValid = Array.from(results.values()).every(r => r.valid);
    console.log('\nAll agents valid:', allValid ? '✅' : '❌');
}

// ============================================================
// Main - Run all demos
// ============================================================

export async function runAllDemos() {
    console.log('========================================');
    console.log('Standard Agent System - Demo Collection');
    console.log('========================================\n');

    console.log('Demo 1: Basic Agent Setup');
    console.log('----------------------------------------');
    demo1_basicCodeReviewAgent();
    console.log();

    console.log('Demo 2: Tool with Implementation');
    console.log('----------------------------------------');
    await demo2_toolWithImplementation();
    console.log();

    console.log('Demo 3: Middleware Chain');
    console.log('----------------------------------------');
    await demo3_middlewareChain();
    console.log();

    console.log('Demo 4: Complex Agent Configuration');
    console.log('----------------------------------------');
    demo4_complexAgentConfig();
    console.log();

    console.log('Demo 5: Persistence (Save/Load)');
    console.log('----------------------------------------');
    demo5_persistence();
    console.log();

    console.log('Demo 6: Multiple Agents');
    console.log('----------------------------------------');
    demo6_multipleAgents();
    console.log();

    console.log('========================================');
    console.log('All demos completed!');
    console.log('========================================');
}

// Run demos if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllDemos().catch(console.error);
}
