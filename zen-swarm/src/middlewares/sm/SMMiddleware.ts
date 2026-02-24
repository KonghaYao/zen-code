/**
 * State Machine Middleware
 *
 * Provides XState-based state machine management for LangGraph agents.
 * Integrates with the middleware system and provides tools for state transitions.
 *
 * Supports dependency injection:
 * - Pass an existing StateMachineManager instance for shared resources
 * - Or provide config to create a new manager
 */

import { AgentMiddleware } from 'langchain';
import { StateMachineManager, StateMachineManagerConfig } from './StateMachineManager.js';
import { SMDatabase } from './database.js';
import { createSMTools } from './tools/index.js';
import { SMMiddlewareConfig } from './types.js';
import type { StructuredTool } from '@langchain/core/tools';

/**
 * SMMiddleware configuration with dependency injection support
 */
export interface SMMiddlewareConfigInput {
    /**
     * Existing StateMachineManager instance (for shared resources)
     * If provided, other config options are ignored
     */
    manager?: StateMachineManager;

    /**
     * Existing SMDatabase instance (for shared database connection)
     * If provided, dbPath is ignored
     */
    database?: SMDatabase;

    /**
     * Path to SQLite database file
     * Only used if manager and database are not provided
     */
    dbPath?: string;

    /**
     * Enable logging
     * Default: false
     */
    enableLogging?: boolean;

    /**
     * Enable caching
     * Default: true
     */
    enableCache?: boolean;
}

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
 * // With dependency injection (recommended for zen-swarm)
 * const db = new SMDatabase({ db: sharedDb });
 * const manager = new StateMachineManager({ database: db });
 * const smMiddleware = await SMMiddleware.create({ manager });
 *
 * // With shared database
 * const smMiddleware = await SMMiddleware.create({ database: db });
 *
 * // With dbPath (standalone)
 * const smMiddleware = await SMMiddleware.create({
 *   dbPath: './state-machines.db',
 *   enableLogging: true,
 * });
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
    private config: SMMiddlewareConfigInput;
    private _tools: StructuredTool[] = [];
    private initialized = false;
    private ownsManager: boolean;

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

    /**
     * Create SMMiddleware instance
     *
     * @param config - Configuration object
     *
     * @example
     * // With existing manager (dependency injection)
     * const middleware = new SMMiddleware({ manager: existingManager });
     *
     * // With existing database
     * const middleware = new SMMiddleware({ database: existingDb });
     *
     * // With dbPath (standalone)
     * const middleware = new SMMiddleware({ dbPath: './state-machines.db' });
     */
    constructor(config: SMMiddlewareConfigInput = {}) {
        this.config = config;

        if (config.manager) {
            // Use provided manager
            this.manager = config.manager;
            this.ownsManager = false;
        } else if (config.database) {
            // Create manager with provided database
            this.manager = new StateMachineManager({ database: config.database });
            this.ownsManager = true;
        } else {
            // Create manager with dbPath
            this.manager = new StateMachineManager({
                dbPath: config.dbPath,
                enableLogging: config.enableLogging,
                enableCache: config.enableCache,
            });
            this.ownsManager = true;
        }
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
     *
     * Note: Only closes resources if this instance owns them.
     * If the manager was injected, the caller is responsible for closing it.
     */
    async close(): Promise<void> {
        if (this.ownsManager) {
            await this.manager.close();
        }
        this.initialized = false;
    }

    /**
     * Create a pre-initialized middleware instance
     *
     * @example
     * ```typescript
     * // With dependency injection
     * const middleware = await SMMiddleware.create({ manager: existingManager });
     *
     * // With dbPath
     * const middleware = await SMMiddleware.create({
     *   dbPath: './state-machines.db',
     *   enableLogging: true,
     * });
     * ```
     */
    static async create(config: SMMiddlewareConfigInput = {}): Promise<SMMiddleware> {
        const middleware = new SMMiddleware(config);
        await middleware.initialize();
        return middleware;
    }

    /**
     * Create SMMiddleware from existing StateMachineManager
     *
     * @example
     * const manager = new StateMachineManager({ database: db });
     * const middleware = SMMiddleware.fromManager(manager);
     * await middleware.initialize();
     */
    static fromManager(manager: StateMachineManager): SMMiddleware {
        return new SMMiddleware({ manager });
    }

    /**
     * Create SMMiddleware from existing SMDatabase
     *
     * @example
     * const db = new SMDatabase({ db: sharedDb });
     * const middleware = SMMiddleware.fromDatabase(db);
     * await middleware.initialize();
     */
    static fromDatabase(database: SMDatabase): SMMiddleware {
        return new SMMiddleware({ database });
    }
}

// Re-export types and manager for external use
export { StateMachineManager } from './StateMachineManager.js';
export { SMDatabase } from './database.js';
export * from './types.js';
export * from './tools/index.js';
