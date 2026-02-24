/**
 * State Machine Middleware Module
 *
 * Provides XState-based state machine management for LangGraph agents.
 *
 * @example
 * ```typescript
 * import { SMMiddleware, StateMachineManager } from '@codegraph/agent/sm';
 *
 * // Create and initialize middleware
 * const smMiddleware = await SMMiddleware.create({
 *   dbPath: './state-machines.db',
 *   enableLogging: true,
 * });
 *
 * // Register a state machine definition
 * await smMiddleware.stateMachineManager.registerMachineDefinition({
 *   id: 'order-workflow',
 *   name: 'Order Workflow',
 *   initial: 'pending',
 *   states: {
 *     pending: {
 *       on: {
 *         APPROVE: { target: 'approved' },
 *         REJECT: { target: 'rejected' },
 *       },
 *     },
 *     approved: {
 *       on: {
 *         SHIP: { target: 'shipped' },
 *       },
 *     },
 *     shipped: {
 *       on: {
 *         DELIVER: { target: 'delivered' },
 *       },
 *     },
 *     rejected: {},
 *     delivered: {},
 *   },
 * });
 *
 * // Create a state instance
 * await smMiddleware.stateMachineManager.createStateInstance(
 *   'order-123',
 *   'order-workflow',
 *   { orderId: '123', amount: 100 }
 * );
 *
 * // Use tools in agent
 * const agent = createAgent({
 *   model,
 *   tools: [...smMiddleware.tools],
 * });
 * ```
 *
 * @example With dependency injection (zen-swarm)
 * ```typescript
 * import { SMMiddleware, SMDatabase, ZenSwarmSMStorage } from '@codegraph/agent/sm';
 * import Database from 'bun:sqlite';
 *
 * // Use shared database
 * const sharedDb = new Database('./data/index.db');
 * const smDb = new SMDatabase({ db: sharedDb });
 * const manager = new StateMachineManager({ database: smDb });
 * const smMiddleware = await SMMiddleware.create({ manager });
 * ```
 */

// Main exports
export { SMMiddleware } from './SMMiddleware.js';
export { StateMachineManager } from './StateMachineManager.js';
export { SMDatabase } from './database.js';

// Storage (for zen-swarm integration)
export { ZenSwarmSMStorage } from './storage.js';

// Re-export config types from their source files
export type { SMDatabaseConfig } from './database.js';
export type { StateMachineManagerConfig } from './StateMachineManager.js';
export type { SMMiddlewareConfigInput } from './SMMiddleware.js';

// Type exports
export type {
    // Database row types
    StateMachineDefinitionRow,
    StateInstanceRow,
    StateTransitionRow,
    // Status types
    StateInstanceStatus,
    // Definition types
    StateNodeDefinition,
    TransitionDefinition,
    ActionDefinition,
    StateMachineDefinition,
    StateInstance,
    // Tool input types
    TransitionToInput,
    GetStateInput,
    RollbackToStateInput,
    CreateStateInstanceInput,
    GetTransitionHistoryInput,
    SendEventInput,
    // Tool result types
    TransitionToResult,
    GetStateResult,
    RollbackResult,
    CreateStateInstanceResult,
    TransitionHistoryResult,
    SendEventResult,
    // Middleware config
    SMMiddlewareConfig,
    // Error types
    SMErrorType,
} from './types.js';

// Error class
export { SMError } from './types.js';

// Tool input schemas (for external validation)
export {
    TransitionToInputSchema,
    GetStateInputSchema,
    RollbackToStateInputSchema,
    CreateStateInstanceInputSchema,
    GetTransitionHistoryInputSchema,
    SendEventInputSchema,
} from './types.js';

// Tool creators (for custom tool configuration)
export {
    createSMTools,
    createTransitionToTool,
    createGetStateTool,
    createRollbackToStateTool,
    createCreateStateInstanceTool,
    createSendEventTool,
    createGetTransitionHistoryTool,
} from './tools/index.js';
