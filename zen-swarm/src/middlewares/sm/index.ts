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
 */

// Main exports
export { SMMiddleware, StateMachineManager, SMDatabase } from './SMMiddleware.js';

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
