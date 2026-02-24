/**
 * Approval Flow State Machine
 *
 * Defines the state machine for approval workflows
 * Supports multiple approval states and transitions
 */

import { StateMachineDefinition } from '../types.js';

/**
 * Approval flow states
 */
export enum ApprovalFlowState {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    EDITED = 'edited',
    EXECUTING = 'executing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * Approval flow context
 */
export interface ApprovalFlowContext {
    /** Original request data */
    originalRequest: {
        toolName: string;
        args: Record<string, unknown>;
        description?: string;
    };
    /** Current approval decision */
    decision?: 'approve' | 'reject' | 'edit';
    /** Edited arguments (if decision is edit) */
    editedArgs?: Record<string, unknown>;
    /** Rejection message (if decision is reject) */
    rejectionMessage?: string;
    /** Execution result */
    executionResult?: {
        success: boolean;
        output?: unknown;
        error?: string;
    };
    /** Timestamps */
    timestamps: {
        createdAt: Date;
        decidedAt?: Date;
        executedAt?: Date;
        completedAt?: Date;
    };
    /** Metadata */
    metadata: {
        approver?: string;
        priority?: 'low' | 'medium' | 'high';
        tags?: string[];
        [key: string]: unknown;
    };
}

/**
 * Approval flow state machine definition
 */
export const approvalFlowMachine: StateMachineDefinition = {
    id: 'approval-flow',
    name: 'Approval Flow',
    description: 'State machine for managing approval workflows',
    initial: ApprovalFlowState.PENDING,
    context: {
        originalRequest: {
            toolName: '',
            args: {},
            description: '',
        },
        timestamps: {
            createdAt: new Date(),
        },
        metadata: {},
    },
    states: {
        [ApprovalFlowState.PENDING]: {
            on: {
                APPROVE: {
                    target: ApprovalFlowState.APPROVED,
                    actions: [
                        {
                            type: 'setDecision',
                            params: { decision: 'approve' },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'decidedAt' },
                        },
                    ],
                },
                REJECT: {
                    target: ApprovalFlowState.REJECTED,
                    actions: [
                        {
                            type: 'setDecision',
                            params: { decision: 'reject' },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'decidedAt' },
                        },
                    ],
                },
                EDIT: {
                    target: ApprovalFlowState.EDITED,
                    actions: [
                        {
                            type: 'setDecision',
                            params: { decision: 'edit' },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'decidedAt' },
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.APPROVED]: {
            on: {
                EXECUTE: {
                    target: ApprovalFlowState.EXECUTING,
                    actions: [
                        {
                            type: 'setTimestamp',
                            params: { field: 'executedAt' },
                        },
                    ],
                },
                CANCEL: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'clearDecision',
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.EDITED]: {
            on: {
                EXECUTE: {
                    target: ApprovalFlowState.EXECUTING,
                    actions: [
                        {
                            type: 'setTimestamp',
                            params: { field: 'executedAt' },
                        },
                    ],
                },
                CANCEL: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'clearDecision',
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.REJECTED]: {
            on: {
                RETRY: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'clearDecision',
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.EXECUTING]: {
            on: {
                SUCCESS: {
                    target: ApprovalFlowState.COMPLETED,
                    actions: [
                        {
                            type: 'setExecutionResult',
                            params: { success: true },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'completedAt' },
                        },
                    ],
                },
                FAILURE: {
                    target: ApprovalFlowState.FAILED,
                    actions: [
                        {
                            type: 'setExecutionResult',
                            params: { success: false },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'completedAt' },
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.COMPLETED]: {
            type: 'final',
        },
        [ApprovalFlowState.FAILED]: {
            on: {
                RETRY: {
                    target: ApprovalFlowState.EXECUTING,
                    actions: [
                        {
                            type: 'clearExecutionResult',
                        },
                    ],
                },
            },
        },
    },
};

/**
 * Approval flow with escalation support
 */
export const approvalFlowWithEscalationMachine: StateMachineDefinition = {
    id: 'approval-flow-with-escalation',
    name: 'Approval Flow with Escalation',
    description: 'State machine for approval workflows with escalation support',
    initial: ApprovalFlowState.PENDING,
    context: {
        originalRequest: {
            toolName: '',
            args: {},
            description: '',
        },
        timestamps: {
            createdAt: new Date(),
        },
        metadata: {
            escalationLevel: 0,
            maxEscalationLevels: 3,
        },
    },
    states: {
        [ApprovalFlowState.PENDING]: {
            on: {
                APPROVE: {
                    target: ApprovalFlowState.APPROVED,
                    actions: [
                        {
                            type: 'setDecision',
                            params: { decision: 'approve' },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'decidedAt' },
                        },
                    ],
                },
                REJECT: {
                    target: ApprovalFlowState.REJECTED,
                    actions: [
                        {
                            type: 'setDecision',
                            params: { decision: 'reject' },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'decidedAt' },
                        },
                    ],
                },
                EDIT: {
                    target: ApprovalFlowState.EDITED,
                    actions: [
                        {
                            type: 'setDecision',
                            params: { decision: 'edit' },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'decidedAt' },
                        },
                    ],
                },
                ESCALATE: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'incrementEscalationLevel',
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'escalatedAt' },
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.APPROVED]: {
            on: {
                EXECUTE: {
                    target: ApprovalFlowState.EXECUTING,
                    actions: [
                        {
                            type: 'setTimestamp',
                            params: { field: 'executedAt' },
                        },
                    ],
                },
                CANCEL: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'clearDecision',
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.EDITED]: {
            on: {
                EXECUTE: {
                    target: ApprovalFlowState.EXECUTING,
                    actions: [
                        {
                            type: 'setTimestamp',
                            params: { field: 'executedAt' },
                        },
                    ],
                },
                CANCEL: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'clearDecision',
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.REJECTED]: {
            on: {
                RETRY: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'clearDecision',
                        },
                    ],
                },
                ESCALATE: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'incrementEscalationLevel',
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'escalatedAt' },
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.EXECUTING]: {
            on: {
                SUCCESS: {
                    target: ApprovalFlowState.COMPLETED,
                    actions: [
                        {
                            type: 'setExecutionResult',
                            params: { success: true },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'completedAt' },
                        },
                    ],
                },
                FAILURE: {
                    target: ApprovalFlowState.FAILED,
                    actions: [
                        {
                            type: 'setExecutionResult',
                            params: { success: false },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'completedAt' },
                        },
                    ],
                },
            },
        },
        [ApprovalFlowState.COMPLETED]: {
            type: 'final',
        },
        [ApprovalFlowState.FAILED]: {
            on: {
                RETRY: {
                    target: ApprovalFlowState.EXECUTING,
                    actions: [
                        {
                            type: 'clearExecutionResult',
                        },
                    ],
                },
                ESCALATE: {
                    target: ApprovalFlowState.PENDING,
                    actions: [
                        {
                            type: 'incrementEscalationLevel',
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'escalatedAt' },
                        },
                    ],
                },
            },
        },
    },
};

/**
 * Multi-level approval flow state machine
 */
export const multiLevelApprovalFlowMachine: StateMachineDefinition = {
    id: 'multi-level-approval-flow',
    name: 'Multi-Level Approval Flow',
    description: 'State machine for multi-level approval workflows',
    initial: 'level1_pending',
    context: {
        originalRequest: {
            toolName: '',
            args: {},
            description: '',
        },
        timestamps: {
            createdAt: new Date(),
        },
        metadata: {
            currentLevel: 1,
            maxLevels: 3,
            approvers: {},
        },
    },
    states: {
        level1_pending: {
            on: {
                APPROVE: {
                    target: 'level2_pending',
                    actions: [
                        {
                            type: 'recordApproval',
                            params: { level: 1, decision: 'approve' },
                        },
                    ],
                },
                REJECT: {
                    target: 'rejected',
                    actions: [
                        {
                            type: 'recordRejection',
                            params: { level: 1 },
                        },
                    ],
                },
                EDIT: {
                    target: 'edited',
                    actions: [
                        {
                            type: 'recordEdit',
                            params: { level: 1 },
                        },
                    ],
                },
            },
        },
        level2_pending: {
            on: {
                APPROVE: {
                    target: 'level3_pending',
                    actions: [
                        {
                            type: 'recordApproval',
                            params: { level: 2, decision: 'approve' },
                        },
                    ],
                },
                REJECT: {
                    target: 'rejected',
                    actions: [
                        {
                            type: 'recordRejection',
                            params: { level: 2 },
                        },
                    ],
                },
                EDIT: {
                    target: 'edited',
                    actions: [
                        {
                            type: 'recordEdit',
                            params: { level: 2 },
                        },
                    ],
                },
            },
        },
        level3_pending: {
            on: {
                APPROVE: {
                    target: 'approved',
                    actions: [
                        {
                            type: 'recordApproval',
                            params: { level: 3, decision: 'approve' },
                        },
                    ],
                },
                REJECT: {
                    target: 'rejected',
                    actions: [
                        {
                            type: 'recordRejection',
                            params: { level: 3 },
                        },
                    ],
                },
                EDIT: {
                    target: 'edited',
                    actions: [
                        {
                            type: 'recordEdit',
                            params: { level: 3 },
                        },
                    ],
                },
            },
        },
        approved: {
            on: {
                EXECUTE: {
                    target: 'executing',
                    actions: [
                        {
                            type: 'setTimestamp',
                            params: { field: 'executedAt' },
                        },
                    ],
                },
            },
        },
        edited: {
            on: {
                EXECUTE: {
                    target: 'executing',
                    actions: [
                        {
                            type: 'setTimestamp',
                            params: { field: 'executedAt' },
                        },
                    ],
                },
                RETRY: {
                    target: 'level1_pending',
                    actions: [
                        {
                            type: 'resetApprovalLevels',
                        },
                    ],
                },
            },
        },
        rejected: {
            on: {
                RETRY: {
                    target: 'level1_pending',
                    actions: [
                        {
                            type: 'resetApprovalLevels',
                        },
                    ],
                },
            },
        },
        executing: {
            on: {
                SUCCESS: {
                    target: 'completed',
                    actions: [
                        {
                            type: 'setExecutionResult',
                            params: { success: true },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'completedAt' },
                        },
                    ],
                },
                FAILURE: {
                    target: 'failed',
                    actions: [
                        {
                            type: 'setExecutionResult',
                            params: { success: false },
                        },
                        {
                            type: 'setTimestamp',
                            params: { field: 'completedAt' },
                        },
                    ],
                },
            },
        },
        completed: {
            type: 'final',
        },
        failed: {
            on: {
                RETRY: {
                    target: 'executing',
                    actions: [
                        {
                            type: 'clearExecutionResult',
                        },
                    ],
                },
            },
        },
    },
};

/**
 * Approval flow action definitions
 */
export const approvalFlowActions = {
    setDecision: (context: ApprovalFlowContext, params: { decision: 'approve' | 'reject' | 'edit' }) => ({
        ...context,
        decision: params.decision,
    }),

    setTimestamp: (context: ApprovalFlowContext, params: { field: keyof ApprovalFlowContext['timestamps'] }) => ({
        ...context,
        timestamps: {
            ...context.timestamps,
            [params.field]: new Date(),
        },
    }),

    clearDecision: (context: ApprovalFlowContext) => ({
        ...context,
        decision: undefined,
        editedArgs: undefined,
        rejectionMessage: undefined,
    }),

    setExecutionResult: (
        context: ApprovalFlowContext,
        params: { success: boolean; output?: unknown; error?: string },
    ) => ({
        ...context,
        executionResult: {
            success: params.success,
            output: params.output,
            error: params.error,
        },
    }),

    clearExecutionResult: (context: ApprovalFlowContext) => ({
        ...context,
        executionResult: undefined,
    }),

    incrementEscalationLevel: (context: ApprovalFlowContext) => ({
        ...context,
        metadata: {
            ...context.metadata,
            escalationLevel: (context.metadata.escalationLevel || 0) + 1,
        },
    }),

    recordApproval: (context: ApprovalFlowContext, params: { level: number; decision: string }) => ({
        ...context,
        metadata: {
            ...context.metadata,
            approvers: {
                ...context.metadata.approvers,
                [params.level]: {
                    decision: params.decision,
                    timestamp: new Date(),
                },
            },
        },
    }),

    recordRejection: (context: ApprovalFlowContext, params: { level: number }) => ({
        ...context,
        metadata: {
            ...context.metadata,
            approvers: {
                ...context.metadata.approvers,
                [params.level]: {
                    decision: 'reject',
                    timestamp: new Date(),
                },
            },
        },
    }),

    recordEdit: (context: ApprovalFlowContext, params: { level: number }) => ({
        ...context,
        metadata: {
            ...context.metadata,
            approvers: {
                ...context.metadata.approvers,
                [params.level]: {
                    decision: 'edit',
                    timestamp: new Date(),
                },
            },
        },
    }),

    resetApprovalLevels: (context: ApprovalFlowContext) => ({
        ...context,
        metadata: {
            ...context.metadata,
            currentLevel: 1,
            approvers: {},
        },
    }),
};

/**
 * Create a new approval flow instance
 */
export function createApprovalFlowInstance(
    stateId: string,
    toolName: string,
    args: Record<string, unknown>,
    description?: string,
    metadata?: Record<string, unknown>,
): ApprovalFlowContext {
    return {
        originalRequest: {
            toolName,
            args,
            description,
        },
        timestamps: {
            createdAt: new Date(),
        },
        metadata: metadata || {},
    };
}

/**
 * Get available transitions for current state
 */
export function getAvailableTransitions(currentState: ApprovalFlowState): string[] {
    const transitions: Record<ApprovalFlowState, string[]> = {
        [ApprovalFlowState.PENDING]: ['APPROVE', 'REJECT', 'EDIT'],
        [ApprovalFlowState.APPROVED]: ['EXECUTE', 'CANCEL'],
        [ApprovalFlowState.EDITED]: ['EXECUTE', 'CANCEL'],
        [ApprovalFlowState.REJECTED]: ['RETRY'],
        [ApprovalFlowState.EXECUTING]: ['SUCCESS', 'FAILURE'],
        [ApprovalFlowState.COMPLETED]: [],
        [ApprovalFlowState.FAILED]: ['RETRY'],
    };

    return transitions[currentState] || [];
}
