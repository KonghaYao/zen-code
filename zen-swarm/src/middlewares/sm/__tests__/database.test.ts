/**
 * SMDatabase Tests
 *
 * Unit tests for the state machine database layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SMDatabase } from '../database.js';
import { StateMachineDefinition } from '../types.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('SMDatabase', () => {
    let db: SMDatabase;
    let tempDir: string;

    beforeEach(async () => {
        tempDir = mkdtempSync(join(tmpdir(), 'sm-test-'));
        db = new SMDatabase(join(tempDir, 'test.db'));
        await db.initialize();
    });

    afterEach(async () => {
        await db.close();
        rmSync(tempDir, { recursive: true, force: true });
    });

    describe('Machine Definitions', () => {
        const testDefinition: StateMachineDefinition = {
            id: 'test-machine',
            name: 'Test Machine',
            description: 'A test state machine',
            initial: 'idle',
            states: {
                idle: {
                    on: {
                        START: { target: 'running' },
                    },
                },
                running: {
                    on: {
                        STOP: { target: 'idle' },
                        COMPLETE: { target: 'done' },
                    },
                },
                done: {},
            },
            context: { count: 0 },
        };

        it('should insert a machine definition', async () => {
            await db.insertMachineDefinition(testDefinition);

            const result = await db.getMachineDefinition('test-machine');
            expect(result).toBeDefined();
            expect(result?.id).toBe('test-machine');
            expect(result?.name).toBe('Test Machine');
            expect(result?.initial).toBe('idle');
        });

        it('should get all machine definitions', async () => {
            await db.insertMachineDefinition(testDefinition);
            await db.insertMachineDefinition({
                ...testDefinition,
                id: 'test-machine-2',
                name: 'Test Machine 2',
            });

            const results = await db.getAllMachineDefinitions();
            expect(results).toHaveLength(2);
        });

        it('should update a machine definition', async () => {
            await db.insertMachineDefinition(testDefinition);

            await db.updateMachineDefinition({
                ...testDefinition,
                name: 'Updated Test Machine',
            });

            const result = await db.getMachineDefinition('test-machine');
            expect(result?.name).toBe('Updated Test Machine');
        });

        it('should delete a machine definition', async () => {
            await db.insertMachineDefinition(testDefinition);

            await db.deleteMachineDefinition('test-machine');

            const result = await db.getMachineDefinition('test-machine');
            expect(result).toBeUndefined();
        });

        it('should not delete machine with active instances', async () => {
            await db.insertMachineDefinition(testDefinition);
            await db.createStateInstance('test-instance', 'test-machine', 'idle', {});

            await expect(db.deleteMachineDefinition('test-machine')).rejects.toThrow('active instance');
        });
    });

    describe('State Instances', () => {
        const machineId = 'test-machine';

        beforeEach(async () => {
            await db.insertMachineDefinition({
                id: machineId,
                name: 'Test Machine',
                initial: 'idle',
                states: {
                    idle: { on: { START: { target: 'running' } } },
                    running: { on: { STOP: { target: 'idle' } } },
                },
            });
        });

        it('should create a state instance', async () => {
            const instance = await db.createStateInstance('test-id', machineId, 'idle', { value: 1 });

            expect(instance.state_id).toBe('test-id');
            expect(instance.machine_id).toBe(machineId);
            expect(instance.current_state).toBe('idle');
            expect(instance.context).toEqual({ value: 1 });
            expect(instance.status).toBe('active');
        });

        it('should get a state instance', async () => {
            await db.createStateInstance('test-id', machineId, 'idle', { value: 1 });

            const instance = await db.getStateInstance('test-id');
            expect(instance).toBeDefined();
            expect(instance?.state_id).toBe('test-id');
        });

        it('should update a state instance', async () => {
            await db.createStateInstance('test-id', machineId, 'idle', {});

            await db.updateStateInstance('test-id', 'running', { count: 5 });

            const instance = await db.getStateInstance('test-id');
            expect(instance?.current_state).toBe('running');
            expect(instance?.context).toEqual({ count: 5 });
        });

        it('should delete a state instance', async () => {
            await db.createStateInstance('test-id', machineId, 'idle', {});

            await db.deleteStateInstance('test-id');

            const instance = await db.getStateInstance('test-id');
            expect(instance).toBeUndefined();
        });

        it('should get instances by machine', async () => {
            await db.createStateInstance('id-1', machineId, 'idle', {});
            await db.createStateInstance('id-2', machineId, 'idle', {});

            const instances = await db.getStateInstancesByMachine(machineId);
            expect(instances).toHaveLength(2);
        });

        it('should filter instances by status', async () => {
            await db.createStateInstance('id-1', machineId, 'idle', {});
            await db.createStateInstance('id-2', machineId, 'idle', {});
            await db.updateStateInstance('id-2', 'running', {}, 'completed');

            const activeInstances = await db.getStateInstancesByMachine(machineId, 'active');
            expect(activeInstances).toHaveLength(1);
            expect(activeInstances[0]?.state_id).toBe('id-1');
        });
    });

    describe('State Transitions', () => {
        const machineId = 'test-machine';
        const stateId = 'test-instance';

        beforeEach(async () => {
            await db.insertMachineDefinition({
                id: machineId,
                name: 'Test Machine',
                initial: 'idle',
                states: {
                    idle: {},
                    running: {},
                },
            });
            await db.createStateInstance(stateId, machineId, 'idle', {});
        });

        it('should record a transition', async () => {
            const transitionId = await db.recordTransition(
                stateId,
                machineId,
                'idle',
                'running',
                'START',
                { reason: 'test' },
                {},
                { count: 1 },
            );

            expect(transitionId).toBeGreaterThan(0);
        });

        it('should get transition history', async () => {
            await db.recordTransition(stateId, machineId, 'idle', 'running', 'START');
            await db.recordTransition(stateId, machineId, 'running', 'idle', 'STOP');

            const history = await db.getTransitionHistory(stateId);
            expect(history).toHaveLength(2);
            expect(history[0]?.event_name).toBe('STOP');
        });

        it('should get transition by ID', async () => {
            const id = await db.recordTransition(stateId, machineId, 'idle', 'running', 'START');

            const transition = await db.getTransition(id);
            expect(transition).toBeDefined();
            expect(transition?.event_name).toBe('START');
        });

        it('should paginate transition history', async () => {
            await db.recordTransition(stateId, machineId, 'idle', 'running', 'START');
            const midId = await db.recordTransition(stateId, machineId, 'running', 'idle', 'STOP');
            await db.recordTransition(stateId, machineId, 'idle', 'running', 'START2');

            const history = await db.getTransitionHistory(stateId, 10, midId);
            expect(history).toHaveLength(1);
        });
    });
});
