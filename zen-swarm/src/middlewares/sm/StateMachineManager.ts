/**
 * State Machine Manager
 *
 * Integrates XState v5 with SQLite persistence for state machine management.
 * Provides a high-level API for creating, executing, and persisting state machines.
 */

import { ActorRefFrom, AnyActorLogic } from 'xstate';
import { SMDatabase } from './database.js';
import {
    StateMachineDefinition,
    StateInstance,
    SMError,
    TransitionToResult,
    GetStateResult,
    RollbackResult,
    CreateStateInstanceResult,
    TransitionHistoryResult,
    SendEventResult,
    SMMiddlewareConfig,
    TransitionDefinition,
} from './types.js';

/**
 * State Machine Manager
 *
 * Manages XState state machines with SQLite persistence
 */
export class StateMachineManager {
    private database: SMDatabase;
    private actors: Map<string, ActorRefFrom<AnyActorLogic>> = new Map();
    private config: SMMiddlewareConfig;

    // Cache for machine definitions (improves performance)
    private machineDefinitionCache: Map<string, StateMachineDefinition> = new Map();
    private cacheEnabled: boolean = true;

    constructor(config?: SMMiddlewareConfig) {
        this.config = config || {};
        this.database = new SMDatabase(config?.dbPath);
        this.cacheEnabled = config?.enableCache !== false;
    }

    /**
     * Initialize the manager and database
     */
    async initialize(): Promise<void> {
        await this.database.initialize();
        this.log('StateMachineManager initialized');
    }

    /**
     * Close the manager and release resources
     */
    async close(): Promise<void> {
        // Stop all actors
        for (const [stateId, actor] of this.actors) {
            actor.stop();
            this.log(`Stopped actor for state ${stateId}`);
        }
        this.actors.clear();

        // Clear cache
        this.machineDefinitionCache.clear();

        await this.database.close();
        this.log('StateMachineManager closed');
    }

    // ========================================
    // Machine Definition Management
    // ========================================

    /**
     * Register a new state machine definition
     */
    async registerMachineDefinition(definition: StateMachineDefinition): Promise<void> {
        // Validate definition
        this.validateMachineDefinition(definition);

        // Store in database
        await this.database.insertMachineDefinition(definition);

        // Update cache
        if (this.cacheEnabled) {
            this.machineDefinitionCache.set(definition.id, definition);
        }

        this.log(`Registered machine definition: ${definition.id}`);
    }

    /**
     * Get a state machine definition
     */
    async getMachineDefinition(machineId: string): Promise<StateMachineDefinition | undefined> {
        // Check cache first
        if (this.cacheEnabled && this.machineDefinitionCache.has(machineId)) {
            return this.machineDefinitionCache.get(machineId);
        }

        // Load from database
        const definition = await this.database.getMachineDefinition(machineId);

        // Update cache
        if (definition && this.cacheEnabled) {
            this.machineDefinitionCache.set(machineId, definition);
        }

        return definition;
    }

    /**
     * Get all machine definitions
     */
    async getAllMachineDefinitions(): Promise<StateMachineDefinition[]> {
        return this.database.getAllMachineDefinitions();
    }

    /**
     * Update a machine definition
     */
    async updateMachineDefinition(definition: StateMachineDefinition): Promise<void> {
        this.validateMachineDefinition(definition);
        await this.database.updateMachineDefinition(definition);

        // Invalidate cache
        this.machineDefinitionCache.delete(definition.id);

        this.log(`Updated machine definition: ${definition.id}`);
    }

    /**
     * Delete a machine definition
     */
    async deleteMachineDefinition(machineId: string): Promise<void> {
        await this.database.deleteMachineDefinition(machineId);

        // Invalidate cache
        this.machineDefinitionCache.delete(machineId);

        this.log(`Deleted machine definition: ${machineId}`);
    }

    // ========================================
    // State Instance Management
    // ========================================

    /**
     * Create a new state instance
     */
    async createStateInstance(
        stateId: string,
        machineId: string,
        initialContext?: Record<string, unknown>,
        parentStateId?: string,
    ): Promise<CreateStateInstanceResult> {
        // Get machine definition
        const definition = await this.database.getMachineDefinition(machineId);
        if (!definition) {
            throw new SMError('MACHINE_NOT_FOUND', `Machine '${machineId}' not found`);
        }

        // Merge initial context with default context from definition
        const context = { ...definition.context, ...initialContext };

        // Create instance in database
        const instance = await this.database.createStateInstance(
            stateId,
            machineId,
            definition.initial,
            context,
            parentStateId,
        );

        this.log(`Created state instance: ${stateId} for machine: ${machineId}`);

        return {
            success: true,
            state_id: stateId,
            machine_id: machineId,
            initial_state: definition.initial,
            context,
        };
    }

    /**
     * Get a state instance
     */
    async getStateInstance(stateId: string): Promise<StateInstance | undefined> {
        return this.database.getStateInstance(stateId);
    }

    /**
     * Get all state instances for a machine
     */
    async getStateInstancesByMachine(machineId: string): Promise<StateInstance[]> {
        return this.database.getStateInstancesByMachine(machineId);
    }

    /**
     * Delete a state instance
     */
    async deleteStateInstance(stateId: string): Promise<void> {
        // Stop actor if running
        const actor = this.actors.get(stateId);
        if (actor) {
            actor.stop();
            this.actors.delete(stateId);
        }

        await this.database.deleteStateInstance(stateId);
        this.log(`Deleted state instance: ${stateId}`);
    }

    // ========================================
    // State Transitions
    // ========================================

    /**
     * Transition to a target state
     */
    async transitionTo(
        stateId: string,
        machineId: string,
        targetState: string,
        eventPayload?: Record<string, unknown>,
    ): Promise<TransitionToResult> {
        // Get current state instance
        const instance = await this.database.getStateInstance(stateId);
        if (!instance) {
            throw new SMError('STATE_NOT_FOUND', `State instance '${stateId}' not found`);
        }

        if (instance.machine_id !== machineId) {
            throw new SMError(
                'INVALID_MACHINE_ID',
                `State instance '${stateId}' belongs to machine '${instance.machine_id}', not '${machineId}'`,
            );
        }

        // Get machine definition
        const definition = await this.database.getMachineDefinition(machineId);
        if (!definition) {
            throw new SMError('MACHINE_NOT_FOUND', `Machine '${machineId}' not found`);
        }

        // Validate transition
        const validTransition = this.isValidTransition(definition, instance.current_state, targetState);

        if (!validTransition) {
            throw new SMError(
                'INVALID_TRANSITION',
                `Invalid transition from '${instance.current_state}' to '${targetState}' in machine '${machineId}'`,
            );
        }

        // Record context before transition
        const contextBefore = { ...instance.context };

        // Update context if payload provided
        const newContext = eventPayload ? { ...instance.context, ...eventPayload } : instance.context;

        // Record transition
        const transitionId = await this.database.recordTransition(
            stateId,
            machineId,
            instance.current_state,
            targetState,
            'TRANSITION',
            eventPayload,
            contextBefore,
            newContext,
        );

        // Update state instance
        await this.database.updateStateInstance(stateId, targetState, newContext);

        this.log(`Transitioned state ${stateId}: ${instance.current_state} -> ${targetState}`);

        return {
            success: true,
            previous_state: instance.current_state,
            current_state: targetState,
            context: newContext,
            transition_id: transitionId,
        };
    }

    /**
     * Send an event to a state instance
     */
    async sendEvent(
        stateId: string,
        machineId: string,
        eventName: string,
        eventPayload?: Record<string, unknown>,
    ): Promise<SendEventResult> {
        // Get current state instance
        const instance = await this.database.getStateInstance(stateId);
        if (!instance) {
            throw new SMError('STATE_NOT_FOUND', `State instance '${stateId}' not found`);
        }

        if (instance.machine_id !== machineId) {
            throw new SMError(
                'INVALID_MACHINE_ID',
                `State instance '${stateId}' belongs to machine '${instance.machine_id}', not '${machineId}'`,
            );
        }

        // Get machine definition
        const definition = await this.database.getMachineDefinition(machineId);
        if (!definition) {
            throw new SMError('MACHINE_NOT_FOUND', `Machine '${machineId}' not found`);
        }

        // Find transition for this event
        const transition = this.findTransitionForEvent(definition, instance.current_state, eventName);

        if (!transition) {
            // No transition found for this event - this is okay, event might be ignored
            return {
                success: true,
                previous_state: instance.current_state,
                current_state: instance.current_state,
                context: instance.context,
                transition_id: null,
            };
        }

        // Record context before transition
        const contextBefore = { ...instance.context };

        // Update context
        const newContext = eventPayload ? { ...instance.context, ...eventPayload } : instance.context;

        // Record transition
        const transitionId = await this.database.recordTransition(
            stateId,
            machineId,
            instance.current_state,
            transition.target,
            eventName,
            eventPayload,
            contextBefore,
            newContext,
        );

        // Update state instance
        await this.database.updateStateInstance(stateId, transition.target, newContext);

        this.log(`Event '${eventName}' triggered transition: ${instance.current_state} -> ${transition.target}`);

        return {
            success: true,
            previous_state: instance.current_state,
            current_state: transition.target,
            context: newContext,
            transition_id: transitionId,
        };
    }

    /**
     * Get current state with available transitions
     */
    async getState(stateId: string, machineId: string): Promise<GetStateResult> {
        const instance = await this.database.getStateInstance(stateId);
        if (!instance) {
            throw new SMError('STATE_NOT_FOUND', `State instance '${stateId}' not found`);
        }

        if (instance.machine_id !== machineId) {
            throw new SMError(
                'INVALID_MACHINE_ID',
                `State instance '${stateId}' belongs to machine '${instance.machine_id}', not '${machineId}'`,
            );
        }

        // Get machine definition
        const definition = await this.database.getMachineDefinition(machineId);
        if (!definition) {
            throw new SMError('MACHINE_NOT_FOUND', `Machine '${machineId}' not found`);
        }

        // Get available transitions
        const availableTransitions = this.getAvailableTransitions(definition, instance.current_state);

        return {
            state_id: stateId,
            machine_id: machineId,
            current_state: instance.current_state,
            context: instance.context,
            status: instance.status,
            available_transitions: availableTransitions,
        };
    }

    /**
     * Rollback to a previous state
     */
    async rollbackToState(stateId: string, transitionId: number): Promise<RollbackResult> {
        // Get transition
        const transition = await this.database.getTransition(transitionId);
        if (!transition) {
            throw new SMError('ROLLBACK_FAILED', `Transition with ID ${transitionId} not found`);
        }

        if (transition.state_id !== stateId) {
            throw new SMError(
                'ROLLBACK_FAILED',
                `Transition ${transitionId} does not belong to state instance '${stateId}'`,
            );
        }

        // Get current instance
        const instance = await this.database.getStateInstance(stateId);
        if (!instance) {
            throw new SMError('STATE_NOT_FOUND', `State instance '${stateId}' not found`);
        }

        // Get context at target transition
        const contextAfter = transition.context_after ? JSON.parse(transition.context_after) : instance.context;

        // Calculate how many transitions to reverse
        const history = await this.database.getTransitionHistory(stateId, 1000);
        const targetIndex = history.findIndex((t) => t.id === transitionId);
        if (targetIndex === -1) {
            throw new SMError('ROLLBACK_FAILED', `Transition ${transitionId} not found in history`);
        }

        const transitionsReversed = targetIndex;

        // Record rollback transition
        await this.database.recordTransition(
            stateId,
            instance.machine_id,
            instance.current_state,
            transition.to_state,
            'ROLLBACK',
            { original_transition_id: transitionId },
            instance.context,
            contextAfter,
        );

        // Update state instance
        await this.database.updateStateInstance(stateId, transition.to_state, contextAfter, 'active');

        this.log(`Rolled back state ${stateId} to transition ${transitionId}`);

        return {
            success: true,
            rolled_back_to_state: transition.to_state,
            current_context: contextAfter,
            transitions_reversed: transitionsReversed,
        };
    }

    /**
     * Get transition history
     */
    async getTransitionHistory(
        stateId: string,
        limit: number = 50,
        beforeTransitionId?: number,
    ): Promise<TransitionHistoryResult> {
        const transitions = await this.database.getTransitionHistory(
            stateId,
            limit + 1, // Get one extra to check for more
            beforeTransitionId,
        );

        const hasMore = transitions.length > limit;
        const resultTransitions = transitions.slice(0, limit).map((t) => ({
            id: t.id,
            from_state: t.from_state,
            to_state: t.to_state,
            event_name: t.event_name,
            event_payload: t.event_payload ? JSON.parse(t.event_payload) : null,
            timestamp: t.timestamp,
            error: t.error,
        }));

        return {
            state_id: stateId,
            transitions: resultTransitions,
            has_more: hasMore,
        };
    }

    // ========================================
    // Validation Helpers
    // ========================================

    /**
     * Validate a state machine definition
     */
    private validateMachineDefinition(definition: StateMachineDefinition): void {
        if (!definition.id) {
            throw new SMError('SERIALIZATION_ERROR', 'Machine definition must have an id');
        }

        if (!definition.initial) {
            throw new SMError('SERIALIZATION_ERROR', 'Machine definition must have an initial state');
        }

        if (!definition.states || Object.keys(definition.states).length === 0) {
            throw new SMError('SERIALIZATION_ERROR', 'Machine definition must have at least one state');
        }

        // Validate initial state exists
        if (!definition.states[definition.initial]) {
            throw new SMError('SERIALIZATION_ERROR', `Initial state '${definition.initial}' not found in states`);
        }
    }

    /**
     * Check if a transition is valid
     */
    private isValidTransition(definition: StateMachineDefinition, fromState: string, toState: string): boolean {
        // Check if target state exists
        if (!definition.states[toState]) {
            return false;
        }

        // Get source state definition
        const sourceState = definition.states[fromState];
        if (!sourceState) {
            return false;
        }

        // Check if there's a direct transition to target state
        if (sourceState.on) {
            for (const transitions of Object.values(sourceState.on)) {
                const transitionArray = Array.isArray(transitions) ? transitions : [transitions];
                for (const transition of transitionArray) {
                    if (transition.target === toState) {
                        return true;
                    }
                }
            }
        }

        // Also allow transitioning to self (re-entry)
        if (fromState === toState) {
            return true;
        }

        return false;
    }

    /**
     * Find transition for an event
     */
    private findTransitionForEvent(
        definition: StateMachineDefinition,
        currentState: string,
        eventName: string,
    ): TransitionDefinition | null {
        const stateDef = definition.states[currentState];
        if (!stateDef?.on?.[eventName]) {
            return null;
        }

        const transitions = stateDef.on[eventName];
        const transitionArray = Array.isArray(transitions) ? transitions : [transitions];

        // Return first valid transition (simple implementation)
        return transitionArray[0] || null;
    }

    /**
     * Get available transitions from current state
     */
    private getAvailableTransitions(definition: StateMachineDefinition, currentState: string): string[] {
        const stateDef = definition.states[currentState];
        if (!stateDef?.on) {
            return [];
        }

        const targets = new Set<string>();

        for (const transitions of Object.values(stateDef.on)) {
            const transitionArray = Array.isArray(transitions) ? transitions : [transitions];
            for (const transition of transitionArray) {
                if (transition.target) {
                    targets.add(transition.target);
                }
            }
        }

        return Array.from(targets);
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * Generate a unique state ID
     */
    static generateStateId(machineId: string): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${machineId}-${timestamp}-${random}`;
    }

    /**
     * Logging helper
     */
    private log(message: string): void {
        if (this.config.enableLogging) {
            console.log(`[StateMachineManager] ${message}`);
        }
    }
}
