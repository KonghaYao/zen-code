/**
 * Workspace Storage Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { WorkspaceStorage } from '../workspace-storage.js';
import * as fs from 'fs/promises';

describe('WorkspaceStorage', () => {
    let storage: WorkspaceStorage;
    let testDir: string;

    beforeAll(async () => {
        // Create in-memory storage for testing
        storage = new WorkspaceStorage(':memory:');
        await storage.initialize();

        // Create a temporary test directory
        testDir = `/tmp/workspace-test-${Date.now()}`;
        await fs.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
        storage.close();
        // Clean up test directory
        await fs.rm(testDir, { recursive: true }).catch(() => {});
    });

    beforeEach(async () => {
        // Clear workspaces before each test
        // Since we can't easily truncate with the current implementation,
        // we'll rely on unique names in tests
    });

    describe('createWorkspace', () => {
        it('should create a workspace with valid data', async () => {
            const workspace = await storage.createWorkspace({
                name: 'test-workspace-1',
                rootPath: testDir,
                description: 'Test workspace',
            });

            expect(workspace.id).toBeDefined();
            expect(workspace.name).toBe('test-workspace-1');
            expect(workspace.rootPath).toBe(testDir);
            expect(workspace.description).toBe('Test workspace');
            expect(workspace.createdAt).toBeDefined();
            expect(workspace.updatedAt).toBeDefined();
            // lastAccessedAt is initialized to creation time on workspace creation
            expect(workspace.lastAccessedAt).toBeDefined();
        });

        it('should throw error if name already exists', async () => {
            await storage.createWorkspace({
                name: 'test-workspace-2',
                rootPath: testDir,
            });

            await expect(
                storage.createWorkspace({
                    name: 'test-workspace-2',
                    rootPath: testDir,
                }),
            ).rejects.toThrow('already exists');
        });

        it('should throw error if path does not exist', async () => {
            await expect(
                storage.createWorkspace({
                    name: 'test-workspace-3',
                    rootPath: '/nonexistent/path',
                }),
            ).rejects.toThrow();
        });

        it('should throw error if path is not a directory', async () => {
            const filePath = `${testDir}/file.txt`;
            await fs.writeFile(filePath, 'test');

            await expect(
                storage.createWorkspace({
                    name: 'test-workspace-4',
                    rootPath: filePath,
                }),
            ).rejects.toThrow();
        });
    });

    describe('getWorkspaceById', () => {
        it('should return workspace by id', async () => {
            const created = await storage.createWorkspace({
                name: 'test-workspace-5',
                rootPath: testDir,
            });

            const found = await storage.getWorkspaceById(created.id);
            expect(found).toEqual(created);
        });

        it('should return null if workspace not found', async () => {
            const found = await storage.getWorkspaceById('nonexistent-id');
            expect(found).toBeNull();
        });
    });

    describe('getWorkspaceByName', () => {
        it('should return workspace by name', async () => {
            await storage.createWorkspace({
                name: 'test-workspace-6',
                rootPath: testDir,
            });

            const found = await storage.getWorkspaceByName('test-workspace-6');
            expect(found).not.toBeNull();
            expect(found?.name).toBe('test-workspace-6');
        });

        it('should return null if workspace not found', async () => {
            const found = await storage.getWorkspaceByName('nonexistent-name');
            expect(found).toBeNull();
        });
    });

    describe('getAllWorkspaces', () => {
        it('should return all workspaces', async () => {
            const ws1 = await storage.createWorkspace({
                name: 'test-workspace-7',
                rootPath: testDir,
            });

            const ws2 = await storage.createWorkspace({
                name: 'test-workspace-8',
                rootPath: testDir,
            });

            const all = await storage.getAllWorkspaces();
            expect(all.length).toBeGreaterThanOrEqual(2);
            expect(all.find((w) => w.id === ws1.id)).toBeDefined();
            expect(all.find((w) => w.id === ws2.id)).toBeDefined();
        });

        it('should sort by created_at descending', async () => {
            const ws1 = await storage.createWorkspace({
                name: 'test-workspace-9',
                rootPath: testDir,
            });

            // Wait to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));

            const ws2 = await storage.createWorkspace({
                name: 'test-workspace-10',
                rootPath: testDir,
            });

            // ws2 was created later, so it should appear first (DESC order)
            const all = await storage.getAllWorkspaces();
            const ws2Index = all.findIndex((w) => w.id === ws2.id);
            const ws1Index = all.findIndex((w) => w.id === ws1.id);
            expect(ws2Index).toBeLessThan(ws1Index); // ws2 should be before ws1
        });
    });

    describe('updateWorkspace', () => {
        it('should update workspace name and description', async () => {
            const created = await storage.createWorkspace({
                name: 'test-workspace-11',
                rootPath: testDir,
            });

            const updated = await storage.updateWorkspace({
                id: created.id,
                name: 'test-workspace-11-updated',
                description: 'Updated description',
            });

            expect(updated.name).toBe('test-workspace-11-updated');
            expect(updated.description).toBe('Updated description');
            expect(updated.id).toBe(created.id);
        });

        it('should throw error if workspace not found', async () => {
            await expect(
                storage.updateWorkspace({
                    id: 'nonexistent-id',
                    name: 'new-name',
                }),
            ).rejects.toThrow('not found');
        });

        it('should throw error if new name already exists', async () => {
            await storage.createWorkspace({
                name: 'test-workspace-12',
                rootPath: testDir,
            });

            const ws2 = await storage.createWorkspace({
                name: 'test-workspace-13',
                rootPath: testDir,
            });

            await expect(
                storage.updateWorkspace({
                    id: ws2.id, // Use the actual workspace ID
                    name: 'test-workspace-12',
                }),
            ).rejects.toThrow('already exists');
        });
    });

    describe('deleteWorkspace', () => {
        it('should delete workspace', async () => {
            const created = await storage.createWorkspace({
                name: 'test-workspace-14',
                rootPath: testDir,
            });

            await storage.deleteWorkspace(created.id);

            const found = await storage.getWorkspaceById(created.id);
            expect(found).toBeNull();
        });

        it('should throw error if workspace not found', async () => {
            await expect(storage.deleteWorkspace('nonexistent-id')).rejects.toThrow('not found');
        });
    });

    describe('validatePath', () => {
        it('should validate existing directory', async () => {
            const result = await storage.validatePath(testDir);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject nonexistent path', async () => {
            const result = await storage.validatePath('/nonexistent/path');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should reject file path', async () => {
            const filePath = `${testDir}/file.txt`;
            await fs.writeFile(filePath, 'test');

            const result = await storage.validatePath(filePath);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not a directory');
        });
    });
});
