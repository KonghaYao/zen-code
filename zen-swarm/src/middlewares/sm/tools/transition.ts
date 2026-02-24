/**
 * transition_to Tool
 *
 * Transitions a state instance to a target state
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { StateMachineManager } from '../StateMachineManager.js';
import { TransitionToInputSchema, TransitionToResult } from '../types.js';

/**
 * Create the transition_to tool
 */
export function createTransitionToTool(manager: StateMachineManager) {
    return tool(
        async (input: z.infer<typeof TransitionToInputSchema>): Promise<string> => {
            try {
                const result: TransitionToResult = await manager.transitionTo(
                    input.state_id,
                    input.machine_id,
                    input.target_state,
                    input.event_payload,
                );

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
            name: 'transition_to',
            description: `Transition a state instance to a target state.

This tool performs a state transition in the state machine:
- Validates that the transition is allowed
- Updates the state instance's current state
- Records the transition in history for potential rollback
- Updates context if event_payload is provided

Use this when you need to advance the workflow to the next state.`,
            schema: TransitionToInputSchema,
        },
    );
}
