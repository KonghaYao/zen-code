/**
 * SubAgents Middleware Types
 *
 * Generic types for subagent task delegation system.
 */

import type { ReactAgent } from 'langchain';
import type { Annotation } from '@langchain/langgraph';
import type { z } from 'zod';

/**
 * SubAgent middleware options
 */
export interface SubAgentsMiddlewareOptions<TState = any> {
    /**
     * AgentPackage instance for listing available agents
     */
    package: any; // AgentPackage type

    /**
     * Function to create subagent instances
     */
    createAgent: (
        taskId: string,
        args: {
            task_id?: string;
            subagent_id: string;
            subagent_type: string;
            task_description: string;
            data_transfer?: any;
        },
        parentState: TState,
    ) => Promise<ReactAgent<any, any, any, any>>;

    /**
     * State schema for the middleware
     * Used to define the state schema this middleware operates on
     * Can be Annotation or Zod schema
     */
    stateSchema?: typeof Annotation | z.ZodType<any>;

    /**
     * Context schema for the middleware
     * Additional context that can be passed to the middleware
     */
    contextSchema?: z.ZodType<any>;

    /**
     * Keys to pass through from subagent state to parent state
     */
    passThroughKeys?: string[];

    /**
     * Custom tool name (default: 'task')
     */
    toolName?: string;

    /**
     * Custom tool description
     */
    toolDescription?: string;

    /**
     * Custom agent list formatter
     */
    formatAgentList?: (agents: Array<{ id: string; description: string }>) => string;
}

/**
 * SubAgent info for system prompt
 */
export interface SubAgentInfo {
    id: string;
    name: string;
    description: string;
    tools: string[];
}
