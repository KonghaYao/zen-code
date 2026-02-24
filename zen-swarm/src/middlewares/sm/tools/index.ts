/**
 * State Machine Tools
 *
 * Exports agent tools for state machine management
 */

import type { StateMachineManager } from '../StateMachineManager.js';
import { createSMCommandTool } from './smCommand.js';
import type { StructuredTool } from '@langchain/core/tools';

/**
 * Create all state machine tools (unified command tool)
 */
export function createSMTools(manager: StateMachineManager): StructuredTool[] {
    return [createSMCommandTool(manager)];
}

// Re-export unified tool
export { createSMCommandTool, SMCommandInputSchema, SMCommandInputSchema as SMCommandSchema } from './smCommand.js';
