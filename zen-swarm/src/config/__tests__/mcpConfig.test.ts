/**
 * MCP Config Storage Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { ZenSwarmMcpStorage } from '../storage.js';

describe('MCP Config Storage', () => {
    let storage: ZenSwarmMcpStorage;

    beforeAll(async () => {
        storage = new ZenSwarmMcpStorage(':memory:');
        await storage.initialize();
    });

    afterAll(async () => {
        storage.close();
    });

    it('should insert and retrieve MCP config', async () => {
        const configId = 'mcp-test-1';
        const config = {
            id: configId,
            name: 'filesystem',
            config: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
            },
            enabled: true,
        };

        await storage.insertMcpConfig(config);

        const retrieved = await storage.getMcpConfig(configId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('filesystem');
        expect(retrieved?.enabled).toBe(1);
    });

    it('should get MCP config by name', async () => {
        const config = {
            id: 'mcp-test-2',
            name: 'brave-search',
            config: { url: 'http://localhost:3000' },
            enabled: true,
        };

        await storage.insertMcpConfig(config);

        const retrieved = await storage.getMcpConfigByName('brave-search');
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('brave-search');
    });

    it('should get all MCP configs', async () => {
        await storage.insertMcpConfig({
            id: 'mcp-test-3',
            name: 'github',
            config: { url: 'http://localhost:4000' },
            enabled: true,
        });

        const configs = await storage.getAllMcpConfigs();
        expect(configs.length).toBeGreaterThanOrEqual(3);
    });

    it('should get enabled MCP configs only', async () => {
        await storage.insertMcpConfig({
            id: 'mcp-test-4',
            name: 'disabled-server',
            config: { url: 'http://localhost:5000' },
            enabled: false,
        });

        const enabledConfigs = await storage.getEnabledMcpConfigs();
        expect(enabledConfigs.every((c: { enabled: number }) => c.enabled === 1)).toBe(true);
    });

    it('should update MCP config', async () => {
        const configId = 'mcp-test-1';
        const updated = {
            id: configId,
            name: 'filesystem',
            config: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '/new/path'],
            },
            enabled: false,
        };

        await storage.updateMcpConfig(updated);

        const retrieved = await storage.getMcpConfig(configId);
        expect(retrieved?.enabled).toBe(0);
        const parsedConfig = JSON.parse(retrieved!.config);
        expect(parsedConfig.args[2]).toBe('/new/path');
    });

    it('should delete MCP config', async () => {
        const configId = 'mcp-test-2';

        await storage.deleteMcpConfig(configId);

        const retrieved = await storage.getMcpConfig(configId);
        expect(retrieved).toBeUndefined();
    });

    it('should get MCP configs as object format', async () => {
        const configObject = await storage.getMcpConfigAsObject();

        expect(configObject).toBeInstanceOf(Object);
        expect('filesystem' in configObject).toBe(true);
        expect('github' in configObject).toBe(true);
    });
});
