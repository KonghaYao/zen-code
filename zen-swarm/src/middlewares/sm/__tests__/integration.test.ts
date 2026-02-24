/**
 * SMMiddleware Integration Tests
 *
 * Tests the full integration of SMMiddleware with AgentPackage and tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SMMiddleware, StateMachineManager } from '../index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('SMMiddleware Integration', () => {
    let smMiddleware: SMMiddleware;
    let tempDir: string;

    const testMachineDefinition = {
        id: 'order-workflow',
        name: 'Order Workflow',
        description: 'E-commerce order processing workflow',
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
                    CANCEL: { target: 'cancelled' },
                },
            },
            shipped: {
                on: {
                    DELIVER: { target: 'delivered' },
                    RETURN: { target: 'returned' },
                },
            },
            delivered: {
                on: {
                    RETURN: { target: 'returned' },
                },
            },
            rejected: {},
            cancelled: {},
            returned: {},
        },
        context: {
            orderId: '',
            amount: 0,
            approvedBy: null as string | null,
            shippedAt: null as string | null,
            deliveredAt: null as string | null,
        },
    };

    beforeEach(async () => {
        tempDir = mkdtempSync(join(tmpdir(), 'sm-integration-test-'));

        // Create and initialize SMMiddleware
        smMiddleware = await SMMiddleware.create({
            dbPath: join(tempDir, 'state-machines.db'),
            enableLogging: false,
        });

        // Register state machine definition
        await smMiddleware.stateMachineManager.registerMachineDefinition(testMachineDefinition);
    });

    afterEach(async () => {
        await smMiddleware.close();
        rmSync(tempDir, { recursive: true, force: true });
    });

    describe('SMMiddleware Creation', () => {
        it('should create middleware with default config', async () => {
            const middleware = await SMMiddleware.create();
            expect(middleware).toBeDefined();
            expect(middleware.name).toBe('SMMiddleware');
            expect(middleware.tools).toHaveLength(6);
            await middleware.close();
        });

        it('should create middleware with custom config', async () => {
            const middleware = await SMMiddleware.create({
                dbPath: join(tempDir, 'custom.db'),
                enableLogging: true,
            });
            expect(middleware).toBeDefined();
            await middleware.close();
        });

        it('should expose state machine manager', () => {
            expect(smMiddleware.stateMachineManager).toBeInstanceOf(StateMachineManager);
        });
    });

    describe('Tool Registration', () => {
        it('should provide all required tools', () => {
            const tools = smMiddleware.tools;
            const toolNames = tools.map((t) => t.name);

            expect(toolNames).toContain('transition_to');
            expect(toolNames).toContain('get_state');
            expect(toolNames).toContain('rollback_to_state');
            expect(toolNames).toContain('create_state_instance');
            expect(toolNames).toContain('send_event');
            expect(toolNames).toContain('get_transition_history');
        });

        it('should have correct tool schemas', () => {
            const transitionTool = smMiddleware.tools.find((t) => t.name === 'transition_to');
            expect(transitionTool).toBeDefined();
            expect(transitionTool?.description).toContain('Transition a state instance');
        });
    });

    describe('End-to-End Workflow', () => {
        it('should complete a full order workflow', async () => {
            const manager = smMiddleware.stateMachineManager;

            // Create state instance
            const createResult = await manager.createStateInstance('order-001', 'order-workflow', {
                orderId: 'ORD-001',
                amount: 99.99,
            });

            expect(createResult.success).toBe(true);
            expect(createResult.initial_state).toBe('pending');

            // Get initial state
            const initialState = await manager.getState('order-001', 'order-workflow');
            expect(initialState.current_state).toBe('pending');
            expect(initialState.available_transitions).toContain('approved');
            expect(initialState.available_transitions).toContain('rejected');

            // Approve order
            const approveResult = await manager.transitionTo('order-001', 'order-workflow', 'approved', {
                approvedBy: 'admin@example.com',
            });

            expect(approveResult.success).toBe(true);
            expect(approveResult.previous_state).toBe('pending');
            expect(approveResult.current_state).toBe('approved');
            expect(approveResult.context.approvedBy).toBe('admin@example.com');

            // Ship order
            const shipResult = await manager.sendEvent('order-001', 'order-workflow', 'SHIP', {
                shippedAt: '2024-01-15T10:00:00Z',
            });

            expect(shipResult.success).toBe(true);
            expect(shipResult.current_state).toBe('shipped');
            expect(shipResult.context.shippedAt).toBe('2024-01-15T10:00:00Z');

            // Deliver order
            const deliverResult = await manager.transitionTo('order-001', 'order-workflow', 'delivered', {
                deliveredAt: '2024-01-17T14:30:00Z',
            });

            expect(deliverResult.success).toBe(true);
            expect(deliverResult.current_state).toBe('delivered');

            // Check final state
            const finalState = await manager.getState('order-001', 'order-workflow');
            expect(finalState.current_state).toBe('delivered');
            expect(finalState.available_transitions).toContain('returned');
        });

        it('should handle rejection path', async () => {
            const manager = smMiddleware.stateMachineManager;

            await manager.createStateInstance('order-002', 'order-workflow', {
                orderId: 'ORD-002',
                amount: 50,
            });

            // Reject order
            const rejectResult = await manager.sendEvent('order-002', 'order-workflow', 'REJECT', {
                reason: 'Payment failed',
            });

            expect(rejectResult.success).toBe(true);
            expect(rejectResult.current_state).toBe('rejected');

            // Check no available transitions from rejected state
            const state = await manager.getState('order-002', 'order-workflow');
            expect(state.available_transitions).toHaveLength(0);
        });
    });

    describe('Rollback Functionality', () => {
        it('should rollback to previous state', async () => {
            const manager = smMiddleware.stateMachineManager;

            await manager.createStateInstance('order-003', 'order-workflow', {
                orderId: 'ORD-003',
                amount: 150,
            });

            // Make several transitions
            await manager.transitionTo('order-003', 'order-workflow', 'approved');
            const shipTransition = await manager.transitionTo('order-003', 'order-workflow', 'shipped');
            await manager.transitionTo('order-003', 'order-workflow', 'delivered');

            // Rollback to shipped state
            const rollbackResult = await manager.rollbackToState('order-003', shipTransition.transition_id);

            expect(rollbackResult.success).toBe(true);
            expect(rollbackResult.rolled_back_to_state).toBe('shipped');

            // Verify current state
            const state = await manager.getState('order-003', 'order-workflow');
            expect(state.current_state).toBe('shipped');
        });
    });

    describe('Transition History', () => {
        it('should track full transition history', async () => {
            const manager = smMiddleware.stateMachineManager;

            await manager.createStateInstance('order-004', 'order-workflow', {
                orderId: 'ORD-004',
                amount: 200,
            });

            // Make transitions
            await manager.transitionTo('order-004', 'order-workflow', 'approved');
            await manager.transitionTo('order-004', 'order-workflow', 'shipped');
            await manager.transitionTo('order-004', 'order-workflow', 'delivered');

            // Get history
            const history = await manager.getTransitionHistory('order-004');

            expect(history.transitions).toHaveLength(3);
            expect(history.has_more).toBe(false);

            // Check history order (most recent first)
            expect(history.transitions[0]?.to_state).toBe('delivered');
            expect(history.transitions[1]?.to_state).toBe('shipped');
            expect(history.transitions[2]?.to_state).toBe('approved');
        });

        it('should support pagination', async () => {
            const manager = smMiddleware.stateMachineManager;

            await manager.createStateInstance('order-005', 'order-workflow', {
                orderId: 'ORD-005',
                amount: 300,
            });

            // Make 3 transitions
            await manager.transitionTo('order-005', 'order-workflow', 'approved');
            await manager.transitionTo('order-005', 'order-workflow', 'shipped');
            await manager.transitionTo('order-005', 'order-workflow', 'delivered');

            // Get first page
            const page1 = await manager.getTransitionHistory('order-005', 2);
            expect(page1.transitions).toHaveLength(2);
            expect(page1.has_more).toBe(true);

            // Get second page
            const page2 = await manager.getTransitionHistory('order-005', 2, page1.transitions[1]?.id);
            expect(page2.transitions).toHaveLength(1);
            expect(page2.has_more).toBe(false);
        });
    });

    describe('Multiple State Instances', () => {
        it('should handle multiple concurrent instances', async () => {
            const manager = smMiddleware.stateMachineManager;

            // Create multiple instances
            await manager.createStateInstance('order-101', 'order-workflow', { orderId: 'ORD-101' });
            await manager.createStateInstance('order-102', 'order-workflow', { orderId: 'ORD-102' });
            await manager.createStateInstance('order-103', 'order-workflow', { orderId: 'ORD-103' });

            // Transition each independently
            await manager.transitionTo('order-101', 'order-workflow', 'approved');
            await manager.transitionTo('order-102', 'order-workflow', 'rejected');
            await manager.transitionTo('order-103', 'order-workflow', 'approved');
            await manager.transitionTo('order-103', 'order-workflow', 'shipped');

            // Verify each instance has correct state
            const state1 = await manager.getState('order-101', 'order-workflow');
            const state2 = await manager.getState('order-102', 'order-workflow');
            const state3 = await manager.getState('order-103', 'order-workflow');

            expect(state1.current_state).toBe('approved');
            expect(state2.current_state).toBe('rejected');
            expect(state3.current_state).toBe('shipped');
        });
    });

    describe('Tool Execution via Tool Interface', () => {
        it('should execute transition_to tool', async () => {
            const manager = smMiddleware.stateMachineManager;
            await manager.createStateInstance('order-201', 'order-workflow', { orderId: 'ORD-201' });

            const transitionTool = smMiddleware.tools.find((t) => t.name === 'transition_to');
            expect(transitionTool).toBeDefined();

            const result = await transitionTool!.invoke({
                state_id: 'order-201',
                machine_id: 'order-workflow',
                target_state: 'approved',
            });

            const parsed = JSON.parse(result as string);
            expect(parsed.success).toBe(true);
            expect(parsed.current_state).toBe('approved');
        });

        it('should execute get_state tool', async () => {
            const manager = smMiddleware.stateMachineManager;
            await manager.createStateInstance('order-202', 'order-workflow', { orderId: 'ORD-202' });

            const getStateTool = smMiddleware.tools.find((t) => t.name === 'get_state');
            const result = await getStateTool!.invoke({
                state_id: 'order-202',
                machine_id: 'order-workflow',
            });

            const parsed = JSON.parse(result as string);
            expect(parsed.current_state).toBe('pending');
            expect(parsed.available_transitions).toContain('approved');
        });

        it('should execute send_event tool', async () => {
            const manager = smMiddleware.stateMachineManager;
            await manager.createStateInstance('order-203', 'order-workflow', { orderId: 'ORD-203' });

            const sendEventTool = smMiddleware.tools.find((t) => t.name === 'send_event');
            const result = await sendEventTool!.invoke({
                state_id: 'order-203',
                machine_id: 'order-workflow',
                event_name: 'APPROVE',
            });

            const parsed = JSON.parse(result as string);
            expect(parsed.success).toBe(true);
            expect(parsed.current_state).toBe('approved');
        });

        it('should handle errors gracefully in tools', async () => {
            const transitionTool = smMiddleware.tools.find((t) => t.name === 'transition_to');

            const result = await transitionTool!.invoke({
                state_id: 'nonexistent',
                machine_id: 'order-workflow',
                target_state: 'approved',
            });

            const parsed = JSON.parse(result as string);
            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain('not found');
        });
    });

    describe('Persistence', () => {
        it('should persist state across manager restarts', async () => {
            const dbPath = join(tempDir, 'persist-test.db');

            // Create first manager instance
            const manager1 = new StateMachineManager({ dbPath });
            await manager1.initialize();

            await manager1.registerMachineDefinition(testMachineDefinition);
            await manager1.createStateInstance('order-301', 'order-workflow', { orderId: 'ORD-301' });
            await manager1.transitionTo('order-301', 'order-workflow', 'approved');

            await manager1.close();

            // Create second manager instance with same database
            const manager2 = new StateMachineManager({ dbPath });
            await manager2.initialize();

            // Verify state persisted
            const state = await manager2.getState('order-301', 'order-workflow');
            expect(state.current_state).toBe('approved');

            await manager2.close();
        });
    });
});
