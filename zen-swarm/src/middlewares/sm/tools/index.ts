/**
 * State Machine Tools
 *
 * Exports all agent tools for state machine management
 */

import type { StateMachineManager } from '../StateMachineManager.js';
import { createTransitionToTool } from './transition.js';
import { createGetStateTool } from './getState.js';
import { createRollbackToStateTool } from './rollback.js';
import { createCreateStateInstanceTool } from './createInstance.js';
import { createSendEventTool } from './sendEvent.js';
import { createGetTransitionHistoryTool } from './getHistory.js';
import type { StructuredTool } from '@langchain/core/tools';

/**
 * Create all state machine tools
 */
export function createSMTools(manager: StateMachineManager): StructuredTool[] {
    return [
        createTransitionToTool(manager),
        createGetStateTool(manager),
        createRollbackToStateTool(manager),
        createCreateStateInstanceTool(manager),
        createSendEventTool(manager),
        createGetTransitionHistoryTool(manager),
    ];
}

// Re-export individual tool creators
export {
    createTransitionToTool,
    createGetStateTool,
    createRollbackToStateTool,
    createCreateStateInstanceTool,
    createSendEventTool,
    createGetTransitionHistoryTool,
};
