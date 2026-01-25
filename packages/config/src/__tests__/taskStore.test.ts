import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TaskStoreManager } from '../implementations/taskStore';
import { TaskNode } from '../types/task';
import { rmSync, existsSync } from 'fs';
import path from 'path';

const TEST_DIR = '/tmp/test-task-store';
const DB_PATH = path.join(TEST_DIR, '.claude', 'task.json');

describe('TaskStoreManager', () => {
  let store: TaskStoreManager;

  beforeEach(async () => {
    store = new TaskStoreManager(TEST_DIR);
    await store.initialize();
  });

  afterEach(() => {
    if (existsSync(DB_PATH)) {
      rmSync(DB_PATH, { recursive: true, force: true });
    }
  });

  it('should add and retrieve tasks', async () => {
    const task: TaskNode = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test description',
      status: 'pickup',
    };

    await store.addTasks([task]);
    const retrieved = await store.getTask('task-1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Test Task');
  });

  it('should update task status', async () => {
    const task: TaskNode = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test description',
      status: 'pickup',
    };

    await store.addTasks([task]);
    await store.updateTask('task-1', { status: 'running' });

    const updated = await store.getTask('task-1');
    expect(updated?.status).toBe('running');
    expect(updated?.startedAt).toBeDefined();
  });

  it('should update task with completion timestamp', async () => {
    const task: TaskNode = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test description',
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    await store.addTasks([task]);
    await store.updateTask('task-1', { status: 'complete' });

    const updated = await store.getTask('task-1');
    expect(updated?.status).toBe('complete');
    expect(updated?.completedAt).toBeDefined();
  });

  it('should get tasks by status', async () => {
    await store.addTasks([
      { id: 'task-1', title: 'Task 1', description: 'Test', status: 'pickup' },
      { id: 'task-2', title: 'Task 2', description: 'Test', status: 'running' },
      { id: 'task-3', title: 'Task 3', description: 'Test', status: 'pickup' },
    ]);

    const pickupTasks = await store.getTasksByStatus('pickup');
    const runningTasks = await store.getTasksByStatus('running');

    expect(pickupTasks.length).toBe(2);
    expect(runningTasks.length).toBe(1);
  });

  it('should get all tasks', async () => {
    await store.addTasks([
      { id: 'task-1', title: 'Task 1', description: 'Test' },
      { id: 'task-2', title: 'Task 2', description: 'Test' },
    ]);

    const allTasks = await store.getAllTasks();
    expect(allTasks.length).toBe(2);
  });

  it('should add execution history', async () => {
    await store.addHistory({
      taskId: 'task-1',
      planId: 'plan-1',
      agentType: 'default',
      status: 'complete',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      output: 'Task completed successfully',
      threadId: ''
    });

    const history = await store.getHistory('plan-1');
    expect(history.length).toBe(1);
    expect(history[0].taskId).toBe('task-1');
  });

  it('should get all history when no planId specified', async () => {
    await store.addHistory({
      taskId: 'task-1',
      planId: 'plan-1',
      agentType: 'default',
      status: 'complete',
      startedAt: new Date().toISOString(),
      threadId: ''
    });

    await store.addHistory({
      taskId: 'task-2',
      planId: 'plan-2',
      agentType: 'planner',
      status: 'running',
      startedAt: new Date().toISOString(),
      threadId: ''
    });

    const allHistory = await store.getHistory();
    expect(allHistory.length).toBe(2);
  });

  it('should set and get active plan', async () => {
    await store.setActivePlan('plan-123');
    const activePlan = await store.getActivePlan();

    expect(activePlan).toBe('plan-123');
  });

  it('should update config', async () => {
    await store.updateConfig({ maxConcurrentAgents: 5 });
    const config = await store.getConfig();

    expect(config.maxConcurrentAgents).toBe(5);
  });

  it('should get default config', async () => {
    const config = await store.getConfig();

    expect(config.maxConcurrentAgents).toBe(3);
    expect(config.retryLimit).toBe(3);
    expect(config.autoResume).toBe(false);
  });

  it('should clear all tasks', async () => {
    await store.addTasks([
      { id: 'task-1', title: 'Task 1', description: 'Test' },
      { id: 'task-2', title: 'Task 2', description: 'Test' },
    ]);

    await store.setActivePlan('plan-1');
    await store.clearAllTasks();

    const allTasks = await store.getAllTasks();
    const activePlan = await store.getActivePlan();

    expect(allTasks.length).toBe(0);
    expect(activePlan).toBeUndefined();
  });

  it('should return false when updating non-existent task', async () => {
    const result = await store.updateTask('non-existent', { status: 'running' });
    expect(result).toBe(false);
  });

  it('should return undefined for non-existent task', async () => {
    const task = await store.getTask('non-existent');
    expect(task).toBeUndefined();
  });
});
