/**
 * get_state Tool
 *
 * Gets the current state of a state instance with available transitions
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { StateMachineManager } from '../StateMachineManager.js';
import { GetStateInputSchema, GetStateResult } from '../types.js';

/**
 * Create the get_state tool
 */
export function createGetStateTool(manager: StateMachineManager) {
    return tool(
        async (input: z.infer<typeof GetStateInputSchema>): Promise<string> => {
            try {
                const result: GetStateResult = await manager.getState(input.state_id, input.machine_id);

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
            name: 'get_state',
            description: `Get the current state of a state instance.

Returns:
- state_id: The unique identifier of the state instance
- machine_id: The state machine definition ID
- current_state: The current state name
- context: The current context data
- status: The status (active, completed, failed, paused)
- available_transitions: List of states this instance can transition to

Use this to check the current state before making transitions.`,
            schema: GetStateInputSchema,
        },
    );
}
