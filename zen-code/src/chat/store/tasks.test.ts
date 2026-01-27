/**
 * Tasks Store tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTasksStore, resetTasksStore } from './tasks';
import { TaskNode, TaskStatus } from '@codegraph/config';

// Create a mock constructor
const createMockTaskStoreManager = () => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getAllTasks: vi.fn().mockResolvedValue([]),
    getTasksByStatus: vi.fn().mockResolvedValue([]),
    getTask: vi.fn().mockResolvedValue(undefined),
    updateTask: vi.fn().mockResolvedValue(true),
    deleteTask: vi.fn().mockResolvedValue(true),
    addTasks: vi.fn().mockResolvedValue(undefined),
    getActivePlan: vi.fn().mockResolvedValue(undefined),
    setActivePlan: vi.fn().mockResolvedValue(undefined),
    getHistory: vi.fn().mockResolvedValue([]),
    clearAllTasks: vi.fn().mockResolvedValue(undefined),
});

// Mock TaskStoreManager
vi.mock('@codegraph/config', async () => {
    const actual = await vi.importActual('@codegraph/config');
    return {
        ...actual,
        TaskStoreManager: function() {
            return createMockTaskStoreManager();
        },
    };
});

describe('TasksStore', () => {
    const mockProjectRoot = '/test/project';

    beforeEach(() => {
        resetTasksStore();
    });

    afterEach(() => {
        resetTasksStore();
    });

    describe('initialization', () => {
        it('should require projectRoot on first use', () => {
            expect(() => getTasksStore()).toThrow('projectRoot is required');
        });

        it('should create singleton instance', () => {
            const store1 = getTasksStore(mockProjectRoot);
            const store2 = getTasksStore();
            expect(store1).toBe(store2);
        });
    });

    describe('task operations', () => {
        it('should initialize store before operations', async () => {
            const store = getTasksStore(mockProjectRoot);

            // First operation should initialize
            await store.initialize();

            // @ts-expect-error - accessing private property for testing
            expect(store.store).not.toBeNull();
        });

        it('should throw error if not initialized', async () => {
            const store = getTasksStore(mockProjectRoot);

            await expect(store.getAllTasks()).rejects.toThrow('not initialized');
        });

        it('should get all tasks', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const mockTasks: TaskNode[] = [
                {
                    id: '1',
                    title: 'Task 1',
                    description: 'Description',
                    status: 'pickup' as TaskStatus,
                },
            ];

            // @ts-expect-error - mocking private method
            store.store.getAllTasks.mockResolvedValue(mockTasks);

            const tasks = await store.getAllTasks();
            expect(tasks).toEqual(mockTasks);
        });

        it('should get tasks by status', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const mockTasks: TaskNode[] = [
                {
                    id: '1',
                    title: 'Task 1',
                    description: 'Description',
                    status: 'running' as TaskStatus,
                },
            ];

            // @ts-expect-error - mocking private method
            store.store.getTasksByStatus.mockResolvedValue(mockTasks);

            const tasks = await store.getTasksByStatus('running');
            expect(tasks).toEqual(mockTasks);
        });

        it('should get single task', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const mockTask: TaskNode = {
                id: '1',
                title: 'Task 1',
                description: 'Description',
                status: 'pickup' as TaskStatus,
            };

            // @ts-expect-error - mocking private method
            store.store.getTask.mockResolvedValue(mockTask);

            const task = await store.getTask('1');
            expect(task).toEqual(mockTask);
        });

        it('should update task status', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const result = await store.updateTaskStatus('1', 'running');
            expect(result).toBe(true);

            // @ts-expect-error - checking mock calls
            expect(store.store.updateTask).toHaveBeenCalledWith('1', { status: 'running' });
        });

        it('should delete task', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const result = await store.deleteTask('1');
            expect(result).toBe(true);

            // @ts-expect-error - checking mock calls
            expect(store.store.deleteTask).toHaveBeenCalledWith('1');
        });

        it('should add multiple tasks', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const mockTasks: TaskNode[] = [
                {
                    id: '1',
                    title: 'Task 1',
                    description: 'Description 1',
                    status: 'pickup' as TaskStatus,
                },
                {
                    id: '2',
                    title: 'Task 2',
                    description: 'Description 2',
                    status: 'pickup' as TaskStatus,
                },
            ];

            await store.addTasks(mockTasks);

            // @ts-expect-error - checking mock calls
            expect(store.store.addTasks).toHaveBeenCalledWith(mockTasks);
        });
    });

    describe('plan operations', () => {
        it('should get active plan', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            // @ts-expect-error - mocking private method
            store.store.getActivePlan.mockResolvedValue('plan-123');

            const planId = await store.getActivePlan();
            expect(planId).toBe('plan-123');
        });

        it('should set active plan', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            await store.setActivePlan('plan-456');

            // @ts-expect-error - checking mock calls
            expect(store.store.setActivePlan).toHaveBeenCalledWith('plan-456');
        });
    });

    describe('task statistics', () => {
        it('should calculate task stats', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const mockTasks: TaskNode[] = [
                { id: '1', title: 'Task 1', description: 'D1', status: 'pickup' as TaskStatus },
                { id: '2', title: 'Task 2', description: 'D2', status: 'running' as TaskStatus },
                { id: '3', title: 'Task 3', description: 'D3', status: 'complete' as TaskStatus },
                { id: '4', title: 'Task 4', description: 'D4', status: 'error' as TaskStatus },
                { id: '5', title: 'Task 5', description: 'D5', status: 'review' as TaskStatus },
                { id: '6', title: 'Task 6', description: 'D6', status: 'feedback' as TaskStatus },
            ];

            // @ts-expect-error - mocking private method
            store.store.getAllTasks.mockResolvedValue(mockTasks);

            const stats = await store.getTaskStats();

            expect(stats).toEqual({
                total: 6,
                pickup: 1,
                running: 1,
                complete: 1,
                error: 1,
                review: 1,
                feedback: 1,
            });
        });

        it('should handle empty task list', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            // @ts-expect-error - mocking private method
            store.store.getAllTasks.mockResolvedValue([]);

            const stats = await store.getTaskStats();

            expect(stats).toEqual({
                total: 0,
                pickup: 0,
                running: 0,
                complete: 0,
                error: 0,
                review: 0,
                feedback: 0,
            });
        });
    });

    describe('history and cleanup', () => {
        it('should get execution history', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            const mockHistory = [
                { planId: 'plan-1', timestamp: Date.now() },
            ];

            // @ts-expect-error - mocking private method
            store.store.getHistory.mockResolvedValue(mockHistory);

            const history = await store.getHistory('plan-1');
            expect(history).toEqual(mockHistory);
        });

        it('should clear all tasks', async () => {
            const store = getTasksStore(mockProjectRoot);
            await store.initialize();

            await store.clearAllTasks();

            // @ts-expect-error - checking mock calls
            expect(store.store.clearAllTasks).toHaveBeenCalledTimes(1);
        });
    });
});
