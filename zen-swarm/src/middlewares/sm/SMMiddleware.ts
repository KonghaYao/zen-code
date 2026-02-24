/**
 * State Machine Middleware
 *
 * Provides XState-based state machine management for LangGraph agents.
 * Integrates with the middleware system and provides tools for state transitions.
 */

import { AgentMiddleware } from 'langchain';
import { StateMachineManager } from './StateMachineManager.js';
import { createSMTools } from './tools/index.js';
import { SMMiddlewareConfig } from './types.js';
import type { StructuredTool } from '@langchain/core/tools';

/**
 * State Machine Middleware
 *
 * This middleware provides:
 * 1. XState-based state machine management
 * 2. SQLite persistence for state definitions and instances
 * 3. Tools for state transitions and rollback
 *
 * Architecture:
 * - LangGraph StateGraph executes tools with xstate_id
 * - SMMiddleware provides tools for state management
 * - SQLite stores state definitions, instances, and transitions
 * - XState manages state machine logic
 *
 * Usage:
 * ```typescript
 * const smMiddleware = new SMMiddleware({
 *   dbPath: './state-machines.db',
 *   enableLogging: true,
 * });
 * await smMiddleware.initialize();
 *
 * // Register with agent
 * const agent = createAgent({
 *   model,
 *   tools: [...smMiddleware.tools],
 *   middleware: [smMiddleware],
 * });
 * ```
 */
export class SMMiddleware implements AgentMiddleware {
    name = 'SMMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    private manager: StateMachineManager;
    private config: SMMiddlewareConfig;
    private _tools: StructuredTool[] = [];
    private initialized = false;

    /**
     * Get the state machine manager instance
     */
    get stateMachineManager(): StateMachineManager {
        return this.manager;
    }

    /**
     * Get the tools provided by this middleware
     */
    get tools(): StructuredTool[] {
        return this._tools;
    }

    constructor(config: SMMiddlewareConfig = {}) {
        this.config = config;
        this.manager = new StateMachineManager(config);
    }

    /**
     * Initialize the middleware
     *
     * This must be called before using the middleware:
     * - Initializes the SQLite database
     * - Creates tools for state management
     *
     * @example
     * ```typescript
     * const middleware = new SMMiddleware();
     * await middleware.initialize();
     * ```
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        await this.manager.initialize();
        this._tools = createSMTools(this.manager);
        this.initialized = true;
    }

    /**
     * Close the middleware and release resources
     */
    async close(): Promise<void> {
        await this.manager.close();
        this.initialized = false;
    }

    /**
     * Create a pre-initialized middleware instance
     *
     * @example
     * ```typescript
     * const middleware = await SMMiddleware.create({
     *   dbPath: './state-machines.db',
     *   enableLogging: true,
     * });
     * ```
     */
    static async create(config: SMMiddlewareConfig = {}): Promise<SMMiddleware> {
        const middleware = new SMMiddleware(config);
        await middleware.initialize();
        return middleware;
    }
}

// Re-export types and manager for external use
export { StateMachineManager } from './StateMachineManager.js';
export { SMDatabase } from './database.js';
export * from './types.js';
export * from './tools/index.js';
