/**
 * StateMachineManager Tests
 *
 * Unit tests for the state machine manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateMachineManager } from '../StateMachineManager.js';
import { StateMachineDefinition } from '../types.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('StateMachineManager', () => {
    let manager: StateMachineManager;
    let tempDir: string;

    const testDefinition: StateMachineDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        initial: 'pending',
        states: {
            pending: {
                on: {
                    APPROVE: { target: 'approved' },
                    REJECT: { target: 'rejected' },
                },
            },
            approved: {
                on: {
                    SHIP: { target: 'shipped' },
                },
            },
            shipped: {
                on: {
                    DELIVER: { target: 'delivered' },
                },
            },
            rejected: {},
            delivered: {},
        },
        context: { orderId: '', amount: 0 },
    };

    beforeEach(async () => {
        tempDir = mkdtempSync(join(tmpdir(), 'sm-manager-test-'));
        manager = new StateMachineManager({ dbPath: join(tempDir, 'test.db') });
        await manager.initialize();
    });

    afterEach(async () => {
        await manager.close();
        rmSync(tempDir, { recursive: true, force: true });
    });

    describe('Machine Definitions', () => {
        it('should register a machine definition', async () => {
            await manager.registerMachineDefinition(testDefinition);

            const result = await manager.getMachineDefinition('test-workflow');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Workflow');
        });

        it('should validate machine definition', async () => {
            await expect(
                manager.registerMachineDefinition({
                    ...testDefinition,
                    id: '',
                }),
            ).rejects.toThrow('must have an id');

            await expect(
                manager.registerMachineDefinition({
                    ...testDefinition,
                    initial: '',
                }),
            ).rejects.toThrow('must have an initial state');
        });

        it('should get all machine definitions', async () => {
            await manager.registerMachineDefinition(testDefinition);
            await manager.registerMachineDefinition({
                ...testDefinition,
                id: 'test-workflow-2',
                name: 'Test Workflow 2',
            });

            const results = await manager.getAllMachineDefinitions();
            expect(results).toHaveLength(2);
        });
    });

    describe('State Instances', () => {
        beforeEach(async () => {
            await manager.registerMachineDefinition(testDefinition);
        });

        it('should create a state instance', async () => {
            const result = await manager.createStateInstance('order-123', 'test-workflow', {
                orderId: '123',
                amount: 100,
            });

            expect(result.success).toBe(true);
            expect(result.state_id).toBe('order-123');
            expect(result.initial_state).toBe('pending');
            expect(result.context.orderId).toBe('123');
        });

        it('should throw if machine not found', async () => {
            await expect(manager.createStateInstance('test', 'unknown-machine')).rejects.toThrow('not found');
        });

        it('should get a state instance', async () => {
            await manager.createStateInstance('order-123', 'test-workflow');

            const instance = await manager.getStateInstance('order-123');
            expect(instance).toBeDefined();
            expect(instance?.current_state).toBe('pending');
        });
    });

    describe('Transitions', () => {
        const stateId = 'order-123';

        beforeEach(async () => {
            await manager.registerMachineDefinition(testDefinition);
            await manager.createStateInstance(stateId, 'test-workflow', { orderId: '123' });
        });

        it('should transition to a valid state', async () => {
            const result = await manager.transitionTo(stateId, 'test-workflow', 'approved');

            expect(result.success).toBe(true);
            expect(result.previous_state).toBe('pending');
            expect(result.current_state).toBe('approved');
        });

        it('should throw on invalid transition', async () => {
            await expect(manager.transitionTo(stateId, 'test-workflow', 'delivered')).rejects.toThrow(
                'Invalid transition',
            );
        });

        it('should update context during transition', async () => {
            const result = await manager.transitionTo(stateId, 'test-workflow', 'approved', {
                approvedBy: 'admin',
                approvedAt: '2024-01-01',
            });

            expect(result.context.approvedBy).toBe('admin');
        });

        it('should throw if state not found', async () => {
            await expect(manager.transitionTo('unknown', 'test-workflow', 'approved')).rejects.toThrow('not found');
        });
    });

    describe('Send Event', () => {
        const stateId = 'order-123';

        beforeEach(async () => {
            await manager.registerMachineDefinition(testDefinition);
            await manager.createStateInstance(stateId, 'test-workflow', { orderId: '123' });
        });

        it('should send event and trigger transition', async () => {
            const result = await manager.sendEvent(stateId, 'test-workflow', 'APPROVE');

            expect(result.success).toBe(true);
            expect(result.previous_state).toBe('pending');
            expect(result.current_state).toBe('approved');
        });

        it('should ignore unknown event', async () => {
            const result = await manager.sendEvent(stateId, 'test-workflow', 'UNKNOWN_EVENT');

            expect(result.success).toBe(true);
            expect(result.current_state).toBe('pending'); // unchanged
        });
    });

    describe('Get State', () => {
        const stateId = 'order-123';

        beforeEach(async () => {
            await manager.registerMachineDefinition(testDefinition);
            await manager.createStateInstance(stateId, 'test-workflow', { orderId: '123' });
        });

        it('should get state with available transitions', async () => {
            const result = await manager.getState(stateId, 'test-workflow');

            expect(result.state_id).toBe(stateId);
            expect(result.current_state).toBe('pending');
            expect(result.status).toBe('active');
            expect(result.available_transitions).toContain('approved');
            expect(result.available_transitions).toContain('rejected');
        });

        it('should show limited transitions in later states', async () => {
            await manager.transitionTo(stateId, 'test-workflow', 'approved');

            const result = await manager.getState(stateId, 'test-workflow');

            expect(result.current_state).toBe('approved');
            expect(result.available_transitions).toContain('shipped');
            expect(result.available_transitions).not.toContain('rejected');
        });
    });

    describe('Rollback', () => {
        const stateId = 'order-123';

        beforeEach(async () => {
            await manager.registerMachineDefinition(testDefinition);
            await manager.createStateInstance(stateId, 'test-workflow', { orderId: '123' });
        });

        it('should rollback to previous state', async () => {
            await manager.transitionTo(stateId, 'test-workflow', 'approved', { step: 1 });
            const transitionResult = await manager.transitionTo(stateId, 'test-workflow', 'shipped', { step: 2 });

            const result = await manager.rollbackToState(stateId, transitionResult.transition_id);

            expect(result.success).toBe(true);
            expect(result.rolled_back_to_state).toBe('shipped');
            expect(result.transitions_reversed).toBe(0);
        });

        it('should rollback to earlier state', async () => {
            const firstTransition = await manager.transitionTo(stateId, 'test-workflow', 'approved', { step: 1 });
            await manager.transitionTo(stateId, 'test-workflow', 'shipped', { step: 2 });

            const result = await manager.rollbackToState(stateId, firstTransition.transition_id);

            expect(result.success).toBe(true);
            expect(result.rolled_back_to_state).toBe('approved');
            expect(result.transitions_reversed).toBe(1);
        });
    });

    describe('Transition History', () => {
        const stateId = 'order-123';

        beforeEach(async () => {
            await manager.registerMachineDefinition(testDefinition);
            await manager.createStateInstance(stateId, 'test-workflow', { orderId: '123' });
        });

        it('should get transition history', async () => {
            await manager.transitionTo(stateId, 'test-workflow', 'approved');
            await manager.transitionTo(stateId, 'test-workflow', 'shipped');

            const result = await manager.getTransitionHistory(stateId);

            expect(result.state_id).toBe(stateId);
            expect(result.transitions).toHaveLength(2);
            expect(result.has_more).toBe(false);
        });

        it('should paginate history', async () => {
            await manager.transitionTo(stateId, 'test-workflow', 'approved');
            await manager.transitionTo(stateId, 'test-workflow', 'shipped');
            await manager.transitionTo(stateId, 'test-workflow', 'delivered');

            const result = await manager.getTransitionHistory(stateId, 2);

            expect(result.transitions).toHaveLength(2);
            expect(result.has_more).toBe(true);
        });
    });

    describe('Generate State ID', () => {
        it('should generate unique state IDs', () => {
            const id1 = StateMachineManager.generateStateId('workflow');
            const id2 = StateMachineManager.generateStateId('workflow');

            expect(id1).not.toBe(id2);
            expect(id1).toContain('workflow');
        });
    });
});
