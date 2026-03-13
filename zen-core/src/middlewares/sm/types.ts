/**
 * State Machine Middleware Types
 *
 * Type definitions for XState-based state machine management
 */

import { z } from 'zod';

// ========================================
// Database Row Types
// ========================================

/**
 * State machine definition row from database
 */
export interface StateMachineDefinitionRow {
    machine_id: string;
    name: string;
    description: string | null;
    definition: string; // JSON string
    metadata: string | null; // JSON string
    created_at: string;
    updated_at: string;
}

/**
 * State instance row from database
 */
export interface StateInstanceRow {
    state_id: string;
    machine_id: string;
    current_state: string;
    context: string | null; // JSON string
    status: StateInstanceStatus;
    parent_state_id: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * State transition row from database
 */
export interface StateTransitionRow {
    id: number;
    state_id: string;
    machine_id: string;
    from_state: string;
    to_state: string;
    event_name: string;
    event_payload: string | null; // JSON string
    context_before: string | null; // JSON string
    context_after: string | null; // JSON string
    error: string | null;
    timestamp: string;
}

// ========================================
// Status Types
// ========================================

/**
 * Status of a state instance
 */
export type StateInstanceStatus = 'active' | 'completed' | 'failed' | 'paused';

// ========================================
// State Machine Definition Types
// ========================================

/**
 * State node definition (simplified XState structure)
 */
export interface StateNodeDefinition {
    id?: string;
    type?: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
    initial?: string;
    states?: Record<string, StateNodeDefinition>;
    on?: Record<string, TransitionDefinition | TransitionDefinition[]>;
    entry?: ActionDefinition | ActionDefinition[];
    exit?: ActionDefinition | ActionDefinition[];
    meta?: Record<string, unknown>;
}

/**
 * Transition definition
 */
export interface TransitionDefinition {
    target: string;
    event?: string;
    guard?: string;
    actions?: ActionDefinition | ActionDefinition[];
}

/**
 * Action definition
 */
export interface ActionDefinition {
    type: string;
    params?: Record<string, unknown>;
}

/**
 * Full state machine definition for storage
 */
export interface StateMachineDefinition {
    id: string;
    name: string;
    description?: string;
    initial: string;
    states: Record<string, StateNodeDefinition>;
    context?: Record<string, unknown>;
    on?: Record<string, TransitionDefinition | TransitionDefinition[]>;
    meta?: {
        version?: string;
        author?: string;
        tags?: string[];
        [key: string]: unknown;
    };
}

// ========================================
// State Instance Types
// ========================================

/**
 * State instance with parsed data
 */
export interface StateInstance {
    state_id: string;
    machine_id: string;
    current_state: string;
    context: Record<string, unknown>;
    status: StateInstanceStatus;
    parent_state_id: string | null;
    created_at: Date;
    updated_at: Date;
}

// ========================================
// Tool Input Schemas
// ========================================

/**
 * Input schema for transition_to tool
 */
export const TransitionToInputSchema = z.object({
    state_id: z.string().describe('Unique identifier for the state instance'),
    machine_id: z.string().describe('Unique identifier for the state machine definition'),
    target_state: z.string().describe('Target state to transition to'),
    event_payload: z.record(z.string(), z.unknown()).optional().describe('Optional payload for the transition event'),
});

export type TransitionToInput = z.infer<typeof TransitionToInputSchema>;

/**
 * Input schema for get_state tool
 */
export const GetStateInputSchema = z.object({
    state_id: z.string().describe('Unique identifier for the state instance'),
    machine_id: z.string().describe('Unique identifier for the state machine definition'),
});

export type GetStateInput = z.infer<typeof GetStateInputSchema>;

/**
 * Input schema for rollback_to_state tool
 */
export const RollbackToStateInputSchema = z.object({
    state_id: z.string().describe('Unique identifier for the state instance'),
    transition_id: z.number().describe('ID of the transition to rollback to'),
});

export type RollbackToStateInput = z.infer<typeof RollbackToStateInputSchema>;

/**
 * Input schema for create_state_instance tool
 */
export const CreateStateInstanceInputSchema = z.object({
    state_id: z.string().describe('Unique identifier for the new state instance'),
    machine_id: z.string().describe('Unique identifier for the state machine definition'),
    initial_context: z.record(z.string(), z.unknown()).optional().describe('Initial context data'),
    parent_state_id: z.string().optional().describe('Parent state ID for nested state machines'),
});

export type CreateStateInstanceInput = z.infer<typeof CreateStateInstanceInputSchema>;

/**
 * Input schema for get_transition_history tool
 */
export const GetTransitionHistoryInputSchema = z.object({
    state_id: z.string().describe('Unique identifier for the state instance'),
    limit: z.number().min(1).max(100).optional().default(50).describe('Maximum number of transitions to return'),
    before_transition_id: z.number().optional().describe('Get transitions before this ID (for pagination)'),
});

export type GetTransitionHistoryInput = z.infer<typeof GetTransitionHistoryInputSchema>;

/**
 * Input schema for send_event tool
 */
export const SendEventInputSchema = z.object({
    state_id: z.string().describe('Unique identifier for the state instance'),
    machine_id: z.string().describe('Unique identifier for the state machine definition'),
    event_name: z.string().describe('Name of the event to send'),
    event_payload: z.record(z.string(), z.unknown()).optional().describe('Optional payload for the event'),
});

export type SendEventInput = z.infer<typeof SendEventInputSchema>;

// ========================================
// Tool Output Types
// ========================================

/**
 * Result of transition_to tool
 */
export interface TransitionToResult {
    success: boolean;
    previous_state: string;
    current_state: string;
    context: Record<string, unknown>;
    transition_id: number;
    error?: string;
}

/**
 * Result of get_state tool
 */
export interface GetStateResult {
    state_id: string;
    machine_id: string;
    current_state: string;
    context: Record<string, unknown>;
    status: StateInstanceStatus;
    available_transitions: string[];
}

/**
 * Result of rollback_to_state tool
 */
export interface RollbackResult {
    success: boolean;
    rolled_back_to_state: string;
    current_context: Record<string, unknown>;
    transitions_reversed: number;
}

/**
 * Result of create_state_instance tool
 */
export interface CreateStateInstanceResult {
    success: boolean;
    state_id: string;
    machine_id: string;
    initial_state: string;
    context: Record<string, unknown>;
}

/**
 * Result of get_transition_history tool
 */
export interface TransitionHistoryResult {
    state_id: string;
    transitions: Array<{
        id: number;
        from_state: string;
        to_state: string;
        event_name: string;
        event_payload: Record<string, unknown> | null;
        timestamp: string;
        error: string | null;
    }>;
    has_more: boolean;
}

/**
 * Result of send_event tool
 */
export interface SendEventResult {
    success: boolean;
    previous_state: string;
    current_state: string;
    context: Record<string, unknown>;
    transition_id: number | null;
    error?: string;
}

/**
 * Result of create_state command (creates instance and starts actor)
 */
export interface CreateStateResult extends CreateStateInstanceResult {
    actor_running: boolean;
}

/**
 * Result of stop_state command
 */
export interface StopStateResult {
    success: boolean;
    message: string;
}

// ========================================
// Middleware Configuration
// ========================================

/**
 * SMMiddleware configuration
 */
export interface SMMiddlewareConfig {
    /**
     * Database path for SQLite storage
     * Default: ~/.zen-code/state-machines.db
     */
    dbPath?: string;

    /**
     * Enable automatic rollback on failure
     * Default: false
     */
    autoRollback?: boolean;

    /**
     * Maximum number of history records to keep per state instance
     * Default: 1000
     */
    maxHistoryPerInstance?: number;

    /**
     * Enable logging
     * Default: false
     */
    enableLogging?: boolean;

    /**
     * Enable machine definition caching
     * Default: true
     */
    enableCache?: boolean;
}

// ========================================
// Error Types
// ========================================

/**
 * State machine error types
 */
export type SMErrorType =
    | 'STATE_NOT_FOUND'
    | 'MACHINE_NOT_FOUND'
    | 'INVALID_TRANSITION'
    | 'TRANSITION_FAILED'
    | 'INVALID_STATE_ID'
    | 'INVALID_MACHINE_ID'
    | 'ROLLBACK_FAILED'
    | 'SERIALIZATION_ERROR'
    | 'DATABASE_ERROR';

/**
 * State machine error
 */
export class SMError extends Error {
    constructor(
        public type: SMErrorType,
        message: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = 'SMError';
    }
}
