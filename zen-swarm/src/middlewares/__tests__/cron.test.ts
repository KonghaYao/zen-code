/**
 * Cron Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CronMiddleware } from '../cron';
import type { CronStorage } from '../../cron/storage';
import type { CronScheduler } from '../../cron/scheduler';
import type { CronTask, CronLog } from '../../cron/types';

// Mock storage and scheduler
const createMockStorage = (): CronStorage => {
    const tasks: Map<string, CronTask> = new Map();
    const logs: Map<string, CronLog> = new Map();

    return {
        getAllTasks: vi.fn(async () => Array.from(tasks.values())),
        getTask: vi.fn(async (id: string) => tasks.get(id) ?? null),
        getEnabledTasks: vi.fn(async () => Array.from(tasks.values()).filter((t) => t.enabled)),
        insertTask: vi.fn(async (task: any) => {
            tasks.set(task.id, { ...task, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }),
        updateTask: vi.fn(async (task: any) => {
            const existing = tasks.get(task.id);
            if (existing) {
                tasks.set(task.id, { ...existing, ...task, updated_at: new Date().toISOString() });
            }
        }),
        deleteTask: vi.fn(async (id: string) => {
            tasks.delete(id);
        }),
        getLogsByTaskId: vi.fn(async (taskId: string, limit: number, offset: number) => {
            return Array.from(logs.values())
                .filter((l) => l.cron_task_id === taskId)
                .slice(offset, offset + limit);
        }),
        getRecentLogs: vi.fn(async (limit: number) => {
            return Array.from(logs.values()).slice(0, limit);
        }),
        getLog: vi.fn(async (id: string) => logs.get(id) ?? null),
        insertLog: vi.fn(async (log: any) => {
            const id = crypto.randomUUID();
            logs.set(id, { ...log, id, created_at: new Date().toISOString() });
            return id;
        }),
        updateLog: vi.fn(async (id: string, updates: any) => {
            const existing = logs.get(id);
            if (existing) {
                logs.set(id, { ...existing, ...updates });
            }
        }),
        deleteLogsBefore: vi.fn(async () => 0),
        clearLogsByTaskId: vi.fn(async () => 0),
        initialize: vi.fn(async () => {}),
        close: vi.fn(),
    } as unknown as CronStorage;
};

const createMockScheduler = (): CronScheduler => {
    const scheduled: Map<string, CronTask> = new Map();

    return {
        scheduleTask: vi.fn((task: CronTask) => {
            scheduled.set(task.id, task);
        }),
        unscheduleTask: vi.fn((taskId: string) => {
            scheduled.delete(taskId);
        }),
        triggerManually: vi.fn(async (taskId: string) => {
            return crypto.randomUUID();
        }),
        getQueueStatus: vi.fn(() => ({
            running: [],
            queued: [],
        })),
        getScheduledCount: vi.fn(() => scheduled.size),
        isActive: vi.fn(() => true),
        start: vi.fn(async () => {}),
        stop: vi.fn(async () => {}),
    } as unknown as CronScheduler;
};

describe('CronMiddleware', () => {
    let middleware: CronMiddleware;
    let mockStorage: CronStorage;
    let mockScheduler: CronScheduler;

    beforeEach(() => {
        mockStorage = createMockStorage();
        mockScheduler = createMockScheduler();
        middleware = new CronMiddleware({
            storage: mockStorage,
            scheduler: mockScheduler,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should create middleware with cron_command tool', () => {
        expect(middleware.name).toBe('CronMiddleware');
        expect(middleware.tools).toHaveLength(1);
        expect(middleware.tools[0].name).toBe('cron_command');
    });

    describe('list command', () => {
        it('should list all tasks', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({ command: 'list' });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(true);
            expect(parsed.tasks).toEqual([]);
            expect(mockStorage.getAllTasks).toHaveBeenCalled();
        });

        it('should list enabled tasks only', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({ command: 'list', filter: 'enabled' });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(true);
            expect(mockStorage.getEnabledTasks).toHaveBeenCalled();
        });
    });

    describe('upsert command', () => {
        it('should create a new task with upsert', async () => {
            const tool = middleware.tools[0];
            const taskData = {
                id: 'test-task',
                name: 'Test Task',
                cron_expression: '0 9 * * *',
                prompt: 'Test prompt',
                agent_id: 'agents/default',
            };

            const result = await tool.invoke({
                command: 'upsert',
                task: taskData,
            });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(true);
            expect(parsed.id).toBe('test-task');
            expect(parsed.message).toContain('created');
            expect(mockStorage.insertTask).toHaveBeenCalled();
            expect(mockScheduler.scheduleTask).toHaveBeenCalled();
        });
    });

    describe('get command', () => {
        it('should return error for non-existent task', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({ command: 'get', task_id: 'non-existent' });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain('Task not found');
        });
    });

    describe('delete command', () => {
        it('should return error for non-existent task', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({
                command: 'delete',
                task_id: 'non-existent',
            });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain('Task not found');
        });
    });

    describe('toggle command', () => {
        it('should return error for non-existent task', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({
                command: 'toggle',
                task_id: 'non-existent',
            });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain('Task not found');
        });
    });

    describe('trigger command', () => {
        it('should return error for non-existent task', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({
                command: 'trigger',
                task_id: 'non-existent',
            });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(false);
            expect(parsed.error).toContain('Task not found');
        });
    });

    describe('logs command', () => {
        it('should return empty logs list', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({ command: 'logs' });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(true);
            expect(parsed.logs).toEqual([]);
        });
    });

    describe('status command', () => {
        it('should return scheduler status', async () => {
            const tool = middleware.tools[0];
            const result = await tool.invoke({ command: 'status' });
            const parsed = JSON.parse(result as string);

            expect(parsed.success).toBe(true);
            expect(parsed.scheduler).toBeDefined();
            expect(parsed.queue).toBeDefined();
            expect(mockScheduler.getQueueStatus).toHaveBeenCalled();
            expect(mockScheduler.isActive).toHaveBeenCalled();
            expect(mockScheduler.getScheduledCount).toHaveBeenCalled();
        });
    });

    describe('full workflow', () => {
        it('should handle upsert, get, toggle, and delete', async () => {
            const tool = middleware.tools[0];

            // Create task via upsert
            const createResult = await tool.invoke({
                command: 'upsert',
                task: {
                    id: 'workflow-test',
                    name: 'Workflow Test',
                    cron_expression: '0 9 * * *',
                    prompt: 'Test',
                    agent_id: 'agents/default',
                },
            });
            const createParsed = JSON.parse(createResult as string);
            expect(createParsed.success).toBe(true);

            // Get task
            const getResult = await tool.invoke({
                command: 'get',
                task_id: 'workflow-test',
            });
            const getParsed = JSON.parse(getResult as string);
            expect(getParsed.success).toBe(true);
            expect(getParsed.task.id).toBe('workflow-test');

            // Toggle task
            const toggleResult = await tool.invoke({
                command: 'toggle',
                task_id: 'workflow-test',
            });
            const toggleParsed = JSON.parse(toggleResult as string);
            expect(toggleParsed.success).toBe(true);
            expect(toggleParsed.enabled).toBe(false); // Toggled from true to false

            // Delete task
            const deleteResult = await tool.invoke({
                command: 'delete',
                task_id: 'workflow-test',
            });
            const deleteParsed = JSON.parse(deleteResult as string);
            expect(deleteParsed.success).toBe(true);
            expect(mockScheduler.unscheduleTask).toHaveBeenCalledWith('workflow-test');
        });
    });

    describe('concurrent execution handling', () => {
        it('should handle multiple concurrent triggers of the same task', async () => {
            const tool = middleware.tools[0];

            // Create a task via upsert
            await tool.invoke({
                command: 'upsert',
                task: {
                    id: 'concurrent-test',
                    name: 'Concurrent Test',
                    cron_expression: '0 9 * * *',
                    prompt: 'Test',
                    agent_id: 'agents/default',
                },
            });

            // Trigger multiple times concurrently
            const [trigger1, trigger2, trigger3] = await Promise.all([
                tool.invoke({ command: 'trigger', task_id: 'concurrent-test' }),
                tool.invoke({ command: 'trigger', task_id: 'concurrent-test' }),
                tool.invoke({ command: 'trigger', task_id: 'concurrent-test' }),
            ]);

            const parsed1 = JSON.parse(trigger1 as string);
            const parsed2 = JSON.parse(trigger2 as string);
            const parsed3 = JSON.parse(trigger3 as string);

            expect(parsed1.success).toBe(true);
            expect(parsed2.success).toBe(true);
            expect(parsed3.success).toBe(true);

            // Verify unique log IDs for each trigger
            expect(parsed1.logId).toBeDefined();
            expect(parsed2.logId).toBeDefined();
            expect(parsed3.logId).toBeDefined();
            expect(parsed1.logId).not.toBe(parsed2.logId);
            expect(parsed2.logId).not.toBe(parsed3.logId);
            expect(parsed3.logId).not.toBe(parsed1.logId);

            // Verify triggerManually was called three times
            expect(mockScheduler.triggerManually).toHaveBeenCalledTimes(3);
        });
    });

    describe('cron expression validation', () => {
        it('should accept valid cron expressions', async () => {
            const tool = middleware.tools[0];
            const validExpressions = [
                '0 9 * * *', // Daily at 9am
                '* * * * *', // Every minute
                '*/5 * * * *', // Every 5 minutes
                '0 9 * * 1-5', // Weekdays at 9am
                '0 0 1 * *', // First of month at midnight
                '0 0,12 * * *', // Midnight and noon
                '0 0-12/2 * * *', // Every 2 hours from midnight to noon
            ];

            for (const expr of validExpressions) {
                await tool.invoke({
                    command: 'upsert',
                    task: {
                        id: `cron-validation-${expr.replace(/[^a-zA-Z0-9]/g, '')}`,
                        name: 'Validation Test',
                        cron_expression: expr,
                        prompt: 'Test',
                        agent_id: 'agents/default',
                    },
                });
                expect(mockScheduler.scheduleTask).toHaveBeenCalled();
            }
        });

        it('should handle edge values', async () => {
            const tool = middleware.tools[0];
            const edgeExpressions = [
                '59 23 31 12 6', // Max valid values
                '0 0 1 1 0', // Min valid values
            ];

            for (const expr of edgeExpressions) {
                const result = await tool.invoke({
                    command: 'upsert',
                    task: {
                        id: `edge-${expr.replace(/[^a-zA-Z0-9]/g, '')}`,
                        name: 'Edge Test',
                        cron_expression: expr,
                        prompt: 'Test',
                        agent_id: 'agents/default',
                    },
                });
                const parsed = JSON.parse(result as string);
                expect(parsed.success).toBe(true);
            }
        });
    });

    describe('task upsert edge cases', () => {
        it('should handle upserting task with enabled false', async () => {
            const tool = middleware.tools[0];

            // Create disabled task via upsert
            const result = await tool.invoke({
                command: 'upsert',
                task: {
                    id: 'disabled-test',
                    name: 'Disabled Test',
                    cron_expression: '0 9 * * *',
                    prompt: 'Test',
                    agent_id: 'agents/default',
                    enabled: false,
                },
            });

            const parsed = JSON.parse(result as string);
            expect(parsed.success).toBe(true);
            expect(parsed.message).toContain('created');
        });

        it('should handle updating existing task via upsert', async () => {
            const tool = middleware.tools[0];

            // Create task
            await tool.invoke({
                command: 'upsert',
                task: {
                    id: 'upsert-update-test',
                    name: 'Original Name',
                    cron_expression: '0 9 * * *',
                    prompt: 'Test',
                    agent_id: 'agents/default',
                    enabled: true,
                },
            });

            // Update via upsert (same id, different data)
            const result = await tool.invoke({
                command: 'upsert',
                task: {
                    id: 'upsert-update-test',
                    name: 'Updated Name',
                    cron_expression: '0 10 * * *',
                    prompt: 'Updated Test',
                    agent_id: 'agents/default',
                    enabled: true,
                },
            });

            const parsed = JSON.parse(result as string);
            expect(parsed.success).toBe(true);
            expect(parsed.message).toContain('updated');
            expect(mockStorage.updateTask).toHaveBeenCalled();
        });
    });
});
