/**
 * get_transition_history Tool
 *
 * Gets the transition history for a state instance
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { StateMachineManager } from '../StateMachineManager.js';
import { GetTransitionHistoryInputSchema, TransitionHistoryResult } from '../types.js';

/**
 * Create the get_transition_history tool
 */
export function createGetTransitionHistoryTool(manager: StateMachineManager) {
    return tool(
        async (input: z.infer<typeof GetTransitionHistoryInputSchema>): Promise<string> => {
            try {
                const result: TransitionHistoryResult = await manager.getTransitionHistory(
                    input.state_id,
                    input.limit,
                    input.before_transition_id,
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
            name: 'get_transition_history',
            description: `Get the transition history for a state instance.

Returns the chronological list of transitions:
- Each transition includes from_state, to_state, event_name
- Includes timestamps and event payloads
- Supports pagination with before_transition_id

Parameters:
- state_id: The state instance to query
- limit: Maximum number of transitions to return (default: 50)
- before_transition_id: (optional) Get transitions before this ID for pagination

Use this to:
1. Understand the execution path
2. Find transition IDs for rollback operations
3. Debug workflow execution`,
            schema: GetTransitionHistoryInputSchema,
        },
    );
}
