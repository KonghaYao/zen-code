import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SparkStoreManager } from '../implementations/sparkStore';
import { SparkItemType } from '../types/task';
import { rmSync, existsSync } from 'fs';
import path from 'path';

const TEST_DIR = '/tmp/test-spark-store';
const DB_PATH = path.join(TEST_DIR, '.claude', 'spark.json');

describe('SparkStoreManager', () => {
  let store: SparkStoreManager;

  beforeEach(async () => {
    store = new SparkStoreManager(TEST_DIR);
    await store.initialize();
  });

  afterEach(() => {
    if (existsSync(DB_PATH)) {
      rmSync(DB_PATH, { recursive: true, force: true });
    }
  });

  it('should add a new spark', async () => {
    const spark = await store.addSpark({
      type: 'idea' as SparkItemType,
      title: 'Test Idea',
      description: 'This is a test idea',
      priority: 'high',
      tags: ['test', 'idea'],
    });

    expect(spark.id).toBeDefined();
    expect(spark.type).toBe('idea');
    expect(spark.title).toBe('Test Idea');
    expect(spark.status).toBe('pending');
  });

  it('should get all sparks', async () => {
    await store.addSpark({
      type: 'bug_report' as SparkItemType,
      title: 'Bug 1',
      description: 'First bug',
    });

    await store.addSpark({
      type: 'feature' as SparkItemType,
      title: 'Feature 1',
      description: 'First feature',
    });

    const sparks = await store.getAllSparks();
    expect(sparks.length).toBe(2);
  });

  it('should get sparks by status', async () => {
    const spark1 = await store.addSpark({
      type: 'idea' as SparkItemType,
      title: 'Idea 1',
      description: 'Test',
    });

    await store.updateSparkStatus(spark1.id, 'planned');

    const pending = await store.getSparksByStatus('pending');
    const planned = await store.getSparksByStatus('planned');

    expect(pending.length).toBe(0);
    expect(planned.length).toBe(1);
  });

  it('should get sparks by type', async () => {
    await store.addSpark({
      type: 'idea' as SparkItemType,
      title: 'Idea 1',
      description: 'Test',
    });

    await store.addSpark({
      type: 'bug_report' as SparkItemType,
      title: 'Bug 1',
      description: 'Test',
    });

    const ideas = await store.getSparksByType('idea');
    const bugs = await store.getSparksByType('bug_report');

    expect(ideas.length).toBe(1);
    expect(bugs.length).toBe(1);
  });

  it('should delete a spark', async () => {
    const spark = await store.addSpark({
      type: 'idea' as SparkItemType,
      title: 'To Delete',
      description: 'Will be deleted',
    });

    const deleted = await store.deleteSpark(spark.id);
    expect(deleted).toBe(true);

    const sparks = await store.getAllSparks();
    expect(sparks.length).toBe(0);
  });

  it('should return false when deleting non-existent spark', async () => {
    const deleted = await store.deleteSpark('non-existent-id');
    expect(deleted).toBe(false);
  });

  it('should return false when updating non-existent spark', async () => {
    const updated = await store.updateSparkStatus('non-existent-id', 'planned');
    expect(updated).toBe(false);
  });
});
