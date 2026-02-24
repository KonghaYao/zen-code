/**
 * rollback_to_state Tool
 *
 * Rolls back a state instance to a previous state using transition history
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { StateMachineManager } from '../StateMachineManager.js';
import { RollbackToStateInputSchema, RollbackResult } from '../types.js';

/**
 * Create the rollback_to_state tool
 */
export function createRollbackToStateTool(manager: StateMachineManager) {
    return tool(
        async (input: z.infer<typeof RollbackToStateInputSchema>): Promise<string> => {
            try {
                const result: RollbackResult = await manager.rollbackToState(input.state_id, input.transition_id);

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
            name: 'rollback_to_state',
            description: `Roll back a state instance to a previous state in history.

This tool restores the state instance to a previous point:
- Uses transition_id from the transition history
- Restores the context at that point in time
- Records the rollback as a new transition in history

Parameters:
- state_id: The state instance to roll back
- transition_id: The ID of the historical transition to restore to

Use this for error recovery or to undo recent changes.`,
            schema: RollbackToStateInputSchema,
        },
    );
}
