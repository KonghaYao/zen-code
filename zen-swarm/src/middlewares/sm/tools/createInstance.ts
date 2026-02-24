/**
 * create_state_instance Tool
 *
 * Creates a new state instance from a machine definition
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { StateMachineManager } from '../StateMachineManager.js';
import { CreateStateInstanceInputSchema, CreateStateInstanceResult } from '../types.js';

/**
 * Create the create_state_instance tool
 */
export function createCreateStateInstanceTool(manager: StateMachineManager) {
    return tool(
        async (input: z.infer<typeof CreateStateInstanceInputSchema>): Promise<string> => {
            try {
                const result: CreateStateInstanceResult = await manager.createStateInstance(
                    input.state_id,
                    input.machine_id,
                    input.initial_context,
                    input.parent_state_id,
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
            name: 'create_state_instance',
            description: `Create a new state instance from a state machine definition.

This tool starts a new workflow execution:
- Creates a new state instance with a unique ID
- Initializes the state machine at its initial state
- Sets the initial context data
- Optionally links to a parent state instance for nested workflows

Parameters:
- state_id: A unique identifier for the new state instance
- machine_id: The state machine definition to use
- initial_context: (optional) Initial context data
- parent_state_id: (optional) Parent state ID for nested workflows

Returns the new state instance details.`,
            schema: CreateStateInstanceInputSchema,
        },
    );
}
