/**
 * send_event Tool
 *
 * Sends an event to a state instance to trigger transitions
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { StateMachineManager } from '../StateMachineManager.js';
import { SendEventInputSchema, SendEventResult } from '../types.js';

/**
 * Create the send_event tool
 */
export function createSendEventTool(manager: StateMachineManager) {
    return tool(
        async (input: z.infer<typeof SendEventInputSchema>): Promise<string> => {
            try {
                const result: SendEventResult = await manager.sendEvent(
                    input.state_id,
                    input.machine_id,
                    input.event_name,
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
            name: 'send_event',
            description: `Send an event to a state instance to trigger state transitions.

This tool sends a named event to the state machine:
- Looks up transitions defined for this event in the current state
- Executes the transition if one exists
- Updates context if event_payload is provided
- Records the transition in history

Parameters:
- state_id: The state instance to send the event to
- machine_id: The state machine definition ID
- event_name: The name of the event to send
- event_payload: (optional) Data to merge into context

Use this for event-driven workflows where transitions are triggered by named events.`,
            schema: SendEventInputSchema,
        },
    );
}
