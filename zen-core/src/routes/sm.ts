/**
 * State Machine Router
 *
 * tRPC router for state machine management UI
 */

import { z } from 'zod';
import { router, publicProcedure, handleNotFound, handleBadRequest } from './trpc.js';
import type { StateMachineDefinition } from '../middlewares/sm/types.js';

// ========================================
// Schemas
// ========================================

const StateNodeSchema = z.record(
    z.string(),
    z.object({
        type: z.enum(['atomic', 'compound', 'parallel', 'final', 'history']).optional(),
        initial: z.string().optional(),
        states: z.record(z.string(), z.any()).optional(),
        on: z
            .record(z.string(), z.union([z.object({ target: z.string() }), z.array(z.object({ target: z.string() }))]))
            .optional(),
        entry: z.any().optional(),
        exit: z.any().optional(),
        meta: z.any().optional(),
    }),
);

const MachineDefinitionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    initial: z.string().min(1),
    states: StateNodeSchema,
    context: z.record(z.string(), z.any()).optional(),
    on: z.any().optional(),
    meta: z
        .object({
            version: z.string().optional(),
            author: z.string().optional(),
            tags: z.array(z.string()).optional(),
        })
        .optional(),
});

// ========================================
// Router Factory
// ========================================

export const smRouter = router({
    // ========================================
    // Machine Definitions
    // ========================================

    /** List all machine definitions */
    listDefinitions: publicProcedure.query(async ({ ctx }) => {
        return ctx.stateMachineManager.getAllMachineDefinitions();
    }),

    /** Get a single machine definition */
    getDefinition: publicProcedure.input(z.object({ machine_id: z.string() })).query(async ({ ctx, input }) => {
        const definition = await ctx.stateMachineManager.getMachineDefinition(input.machine_id);
        if (!definition) {
            handleNotFound('Machine definition', input.machine_id);
        }
        return definition;
    }),

    /** Create a new machine definition */
    createDefinition: publicProcedure.input(MachineDefinitionSchema).mutation(async ({ ctx, input }) => {
        await ctx.stateMachineManager.registerMachineDefinition(input as StateMachineDefinition);
        return { id: input.id };
    }),

    /** Update a machine definition */
    updateDefinition: publicProcedure
        .input(z.object({ machine_id: z.string(), definition: MachineDefinitionSchema }))
        .mutation(async ({ ctx, input }) => {
            await ctx.stateMachineManager.updateMachineDefinition(input.definition as StateMachineDefinition);
            return { id: input.machine_id };
        }),

    /** Delete a machine definition */
    deleteDefinition: publicProcedure.input(z.object({ machine_id: z.string() })).mutation(async ({ ctx, input }) => {
        await ctx.stateMachineManager.deleteMachineDefinition(input.machine_id);
        return { id: input.machine_id };
    }),

    // ========================================
    // State Instances
    // ========================================

    /** List all state instances */
    listInstances: publicProcedure
        .input(z.object({ machine_id: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            if (input.machine_id) {
                return ctx.stateMachineManager.getStateInstancesByMachine(input.machine_id);
            }
            return ctx.smDatabase.getAllStateInstances();
        }),

    /** Get a single state instance with details */
    getInstance: publicProcedure
        .input(z.object({ state_id: z.string(), machine_id: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.stateMachineManager.getState(input.state_id, input.machine_id);
        }),

    /** Create a new state instance */
    createInstance: publicProcedure
        .input(
            z.object({
                state_id: z.string(),
                machine_id: z.string(),
                initial_context: z.record(z.string(), z.any()).optional(),
                parent_state_id: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.stateMachineManager.createStateInstance(
                input.state_id,
                input.machine_id,
                input.initial_context,
                input.parent_state_id,
            );
        }),

    /** Delete a state instance */
    deleteInstance: publicProcedure.input(z.object({ state_id: z.string() })).mutation(async ({ ctx, input }) => {
        await ctx.stateMachineManager.deleteStateInstance(input.state_id);
        return { id: input.state_id };
    }),

    // ========================================
    // Transitions & History
    // ========================================

    /** Get transition history for a state instance */
    getHistory: publicProcedure
        .input(
            z.object({
                state_id: z.string(),
                limit: z.number().min(1).max(100).optional(),
                before_transition_id: z.number().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            return ctx.stateMachineManager.getTransitionHistory(
                input.state_id,
                input.limit,
                input.before_transition_id,
            );
        }),

    /** Transition to a target state */
    transitionTo: publicProcedure
        .input(
            z.object({
                state_id: z.string(),
                machine_id: z.string(),
                target_state: z.string(),
                event_payload: z.record(z.string(), z.any()).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.stateMachineManager.transitionTo(
                input.state_id,
                input.machine_id,
                input.target_state,
                input.event_payload,
            );
        }),

    /** Send an event to trigger transition */
    sendEvent: publicProcedure
        .input(
            z.object({
                state_id: z.string(),
                machine_id: z.string(),
                event_name: z.string(),
                event_payload: z.record(z.string(), z.any()).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.stateMachineManager.sendEvent(
                input.state_id,
                input.machine_id,
                input.event_name,
                input.event_payload,
            );
        }),

    /** Rollback to a previous state */
    rollback: publicProcedure
        .input(z.object({ state_id: z.string(), transition_id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.stateMachineManager.rollbackToState(input.state_id, input.transition_id);
        }),
});
