/**
 * sm_command Tool
 *
 * Unified command tool for state machine operations
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { StateMachineManager } from '../StateMachineManager.js';

/**
 * Command types for state machine operations
 */
export const SMCommandTypeSchema = z.enum([
    'transition_to',
    'get_state',
    'rollback_to_state',
    'create_state_instance',
    'create_state',
    'send_event',
    'get_transition_history',
    'stop_state',
]);

/**
 * Unified input schema for all state machine commands
 */
export const SMCommandInputSchema = z.object({
    command: SMCommandTypeSchema.describe('The operation to perform'),

    // Common parameters
    state_id: z
        .string()
        .optional()
        .describe('Unique identifier for the state instance (auto-generated if not provided for create_state)'),
    machine_id: z.string().optional().describe('Unique identifier for the state machine definition'),

    // transition_to parameters
    target_state: z.string().optional().describe('Target state to transition to (for transition_to command)'),

    // rollback_to_state parameters
    transition_id: z
        .number()
        .optional()
        .describe('ID of the transition to rollback to (for rollback_to_state command)'),

    // create_state_instance parameters
    initial_context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Initial context data (for create_state_instance command)'),
    parent_state_id: z
        .string()
        .optional()
        .describe('Parent state ID for nested state machines (for create_state_instance command)'),

    // create_state parameters (start a state machine process/actor)
    auto_start: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to automatically start the actor (for create_state command)'),

    // stop_state parameters
    force: z.boolean().optional().describe('Force stop the actor even if in non-final state (for stop_state command)'),

    // send_event parameters
    event_name: z.string().optional().describe('Name of the event to send (for send_event command)'),

    // Common event payload
    event_payload: z.record(z.string(), z.unknown()).optional().describe('Optional payload for the event/transition'),

    // get_transition_history parameters
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of transitions to return (for get_transition_history command)'),
    before_transition_id: z
        .number()
        .optional()
        .describe('Get transitions before this ID for pagination (for get_transition_history command)'),
});

export type SMCommandInput = z.infer<typeof SMCommandInputSchema>;

/**
 * Create the unified sm_command tool
 */
export function createSMCommandTool(manager: StateMachineManager) {
    return tool(
        async (input: SMCommandInput): Promise<string> => {
            try {
                const result = await executeSMCommand(manager, input);
                return JSON.stringify(result, null, 2);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return JSON.stringify(
                    {
                        success: false,
                        error: errorMessage,
                    },
                    null,
                    2,
                );
            }
        },
        {
            name: 'state_machine_command',
            description: `Execute state machine operations with a unified command interface.

Available commands:

1. **transition_to** - Transition a state instance to a target state
   - Required: state_id, machine_id, target_state
   - Optional: event_payload

2. **get_state** - Get the current state of a state instance
   - Required: state_id, machine_id

3. **rollback_to_state** - Roll back to a previous state using transition history
   - Required: state_id, transition_id

4. **create_state_instance** - Create a new state instance from a machine definition
   - Required: state_id, machine_id
   - Optional: initial_context, parent_state_id

5. **create_state** - Create and start a state machine process/actor
   - Required: machine_id
   - Optional: state_id (auto-generated if not provided), initial_context, parent_state_id, auto_start
   - Returns the generated state_id in the response

6. **send_event** - Send an event to trigger state transitions
   - Required: state_id, machine_id, event_name
   - Optional: event_payload

7. **get_transition_history** - Get the transition history for a state instance
   - Required: state_id
   - Optional: limit, before_transition_id

8. **stop_state** - Stop a running state machine actor
   - Required: state_id
   - Optional: force

Use this tool to manage state machine workflows, track execution progress, and handle error recovery.`,
            schema: SMCommandInputSchema,
        },
    );
}

/**
 * Execute the state machine command
 */
async function executeSMCommand(manager: StateMachineManager, input: SMCommandInput) {
    const { command } = input;

    switch (command) {
        case 'transition_to': {
            if (!input.state_id) throw new Error('state_id is required for transition_to');
            if (!input.machine_id) throw new Error('machine_id is required for transition_to');
            if (!input.target_state) throw new Error('target_state is required for transition_to');

            return manager.transitionTo(input.state_id, input.machine_id, input.target_state, input.event_payload);
        }

        case 'get_state': {
            if (!input.state_id) throw new Error('state_id is required for get_state');
            if (!input.machine_id) throw new Error('machine_id is required for get_state');

            return manager.getState(input.state_id, input.machine_id);
        }

        case 'rollback_to_state': {
            if (!input.state_id) throw new Error('state_id is required for rollback_to_state');
            if (input.transition_id === undefined) throw new Error('transition_id is required for rollback_to_state');

            return manager.rollbackToState(input.state_id, input.transition_id);
        }

        case 'create_state_instance': {
            if (!input.state_id) throw new Error('state_id is required for create_state_instance');
            if (!input.machine_id) throw new Error('machine_id is required for create_state_instance');

            return manager.createStateInstance(
                input.state_id,
                input.machine_id,
                input.initial_context,
                input.parent_state_id,
            );
        }

        case 'create_state': {
            if (!input.machine_id) throw new Error('machine_id is required for create_state');

            // Auto-generate state_id if not provided
            const stateId = input.state_id || StateMachineManager.generateStateId(input.machine_id);

            return manager.createState(
                stateId,
                input.machine_id,
                input.initial_context,
                input.parent_state_id,
                input.auto_start,
            );
        }

        case 'send_event': {
            if (!input.state_id) throw new Error('state_id is required for send_event');
            if (!input.machine_id) throw new Error('machine_id is required for send_event');
            if (!input.event_name) throw new Error('event_name is required for send_event');

            return manager.sendEvent(input.state_id, input.machine_id, input.event_name, input.event_payload);
        }

        case 'get_transition_history': {
            if (!input.state_id) throw new Error('state_id is required for get_transition_history');

            return manager.getTransitionHistory(input.state_id, input.limit, input.before_transition_id);
        }

        case 'stop_state': {
            if (!input.state_id) throw new Error('state_id is required for stop_state');

            return manager.stopState(input.state_id, input.force);
        }

        default:
            throw new Error(`Unknown command: ${command}`);
    }
}
